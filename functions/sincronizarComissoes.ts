import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * POST /sincronizarComissoes
 *
 * Sincronização em lote de comissões:
 *  A) Busca todos os pedidos pagos sem CommissionEntry fechada
 *  B) Para cada um: cria, atualiza ou ignora a CommissionEntry
 *  C) Retorna resumo { processados, criados, atualizados, ignorados, erros[] }
 *
 * Acesso: somente admin
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // ─── A. BUSCAR CANDIDATOS ──────────────────────────────────────────────
    // Carrega em paralelo: pedidos pagos + todas as CommissionEntries
    const [todosPedidos, todasEntries] = await Promise.all([
      base44.asServiceRole.entities.Pedido.filter({ status: 'pago' }),
      base44.asServiceRole.entities.CommissionEntry.list(),
    ]);

    // Mapa pedido_id → entry para lookup O(1)
    const entryPorPedido = new Map();
    for (const e of todasEntries) {
      entryPorPedido.set(String(e.pedido_id), e);
    }

    // Candidatos: pedidos pagos cujo CommissionEntry está ausente ou NÃO fechada
    const candidatos = todosPedidos.filter(p => {
      const entry = entryPorPedido.get(String(p.id));
      return !entry || entry.status !== 'fechado';
    });

    console.log(`📋 Candidatos encontrados: ${candidatos.length} de ${todosPedidos.length} pedidos pagos`);

    // ─── B. PROCESSAMENTO EM LOTE ──────────────────────────────────────────
    const resultado = {
      processados: candidatos.length,
      criados:     0,
      atualizados: 0,
      ignorados:   0,
      erros:       [],
    };

    // Processamento sequencial com pequeno delay para respeitar rate limit da API
    const DELAY_MS = 80; // ~12 req/s — dentro do limite seguro
    for (const pedido of candidatos) {
      await processarPedido(pedido, entryPorPedido, base44, resultado);
      await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log(`✅ Sincronização concluída:`, resultado);
    return Response.json({ success: true, ...resultado });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── SERVICE: PROCESSAR UM PEDIDO ─────────────────────────────────────────────
async function processarPedido(pedido, entryPorPedido, base44, resultado) {
  try {
    // 1. Verificação de integridade: saldo deve estar zerado
    const saldoRestante = parseFloat(pedido.saldo_restante ?? 0);
    if (saldoRestante > 0.01) {
      console.warn(`⚠️  Pedido ${pedido.numero_pedido} status=pago mas saldo_restante=${saldoRestante}. Ignorado.`);
      resultado.ignorados++;
      return;
    }

    // 2. Base de cálculo = total efetivamente pago (descontos já deduzidos)
    const valorBase = parseFloat(pedido.total_pago) || 0;
    if (valorBase <= 0) {
      resultado.ignorados++;
      return;
    }

    const percentual    = parseFloat(pedido.porcentagem_comissao) || 5;
    const valorComissao = parseFloat(((valorBase * percentual) / 100).toFixed(2));

    // 3. Determina competência
    const dataPagamentoStr   = String(pedido.data_pagamento || new Date().toISOString()).split('T')[0];
    const mesAnoPagamento    = dataPagamentoStr.substring(0, 7);
    const { dataCompetencia, mesCompetencia, movimentado } =
      await resolverCompetencia(mesAnoPagamento, base44);

    // 4. Busca entry existente (pode ter sido criada antes do chunk anterior)
    const entryExistente = entryPorPedido.get(String(pedido.id));

    if (!entryExistente) {
      // ── CRIAR ──
      const nova = await base44.asServiceRole.entities.CommissionEntry.create({
        pedido_id:            String(pedido.id),
        pedido_numero:        pedido.numero_pedido,
        representante_id:     pedido.representante_codigo,
        representante_codigo: pedido.representante_codigo,
        representante_nome:   pedido.representante_nome,
        cliente_nome:         pedido.cliente_nome,
        valor_base:           valorBase,
        percentual,
        valor_comissao:       valorComissao,
        data_pagamento_real:  dataPagamentoStr,
        data_competencia:     dataCompetencia,
        mes_competencia:      mesCompetencia,
        status:               'aberto',
        observacao:           movimentado
          ? `Sincronização automática. Mês original (${mesAnoPagamento}) fechado.`
          : 'Sincronização automática',
        movimentacoes: movimentado ? [{
          data:        new Date().toISOString(),
          mes_origem:  mesAnoPagamento,
          mes_destino: mesCompetencia,
          usuario:     'sistema',
          motivo:      'Mês de pagamento fechado na sincronização'
        }] : [],
      });

      // Atualiza pedido com referência da entry
      await base44.asServiceRole.entities.Pedido.update(pedido.id, {
        comissao_entry_id: nova.id
      });

      resultado.criados++;

    } else if (entryExistente.status === 'aberto') {
      // ── ATUALIZAR (recalcula valores; preserva competência já definida manualmente) ──
      const competenciaPreservada = entryExistente.data_competencia !== dataPagamentoStr;

      await base44.asServiceRole.entities.CommissionEntry.update(entryExistente.id, {
        valor_base:     valorBase,
        percentual,
        valor_comissao: valorComissao,
        // Só atualiza competência se ainda bate com a data de pagamento original
        // (evita sobrescrever movimentações manuais)
        ...(competenciaPreservada ? {} : {
          data_competencia: dataCompetencia,
          mes_competencia:  mesCompetencia,
        }),
        observacao: (entryExistente.observacao || '') + ' | Recalculado na sincronização automática.',
      });

      resultado.atualizados++;

    } else {
      // já fechado — não toca
      resultado.ignorados++;
    }

  } catch (err) {
    console.error(`❌ Erro no pedido ${pedido.id}:`, err.message);
    resultado.erros.push({ pedido_id: pedido.id, numero: pedido.numero_pedido, erro: err.message });
  }
}

// ─── HELPER: RESOLVE MÊS DE COMPETÊNCIA ───────────────────────────────────────
async function resolverCompetencia(mesAnoPagamento, base44) {
  const comissoesMes = await base44.asServiceRole.entities.CommissionEntry.filter({
    mes_competencia: mesAnoPagamento
  });

  const mesFechado = comissoesMes.length > 0 && comissoesMes.every(c => c.status === 'fechado');

  if (mesFechado) {
    const hoje = new Date().toISOString().split('T')[0];
    return {
      dataCompetencia: hoje,
      mesCompetencia:  hoje.substring(0, 7),
      movimentado:     true,
    };
  }

  return {
    dataCompetencia: `${mesAnoPagamento}-01`,
    mesCompetencia:  mesAnoPagamento,
    movimentado:     false,
  };
}