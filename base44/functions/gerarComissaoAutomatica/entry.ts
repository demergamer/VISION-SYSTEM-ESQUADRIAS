import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * FUNÇÃO AUTOMÁTICA: Gera CommissionEntry quando um pedido é totalmente quitado.
 *
 * REGRAS:
 * 1. Só gera comissão se status === 'pago' E saldo_restante === 0 (quitação total).
 * 2. Base de cálculo = total_pago (valor efetivamente recebido, descontos já deduzidos).
 * 3. Proteção anti-duplicidade: verifica existência antes de criar; atualiza se encontrar.
 * 4. Se o mês do pagamento já estiver fechado, joga para o mês corrente.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pedido_id } = await req.json();

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id é obrigatório' }, { status: 400 });
    }

    // ─── 1. BUSCA O PEDIDO ───────────────────────────────────────────────────
    const pedido = await base44.asServiceRole.entities.Pedido.get(pedido_id);

    if (!pedido) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // ─── 2. GATILHO: SÓ EXECUTA SE TOTALMENTE QUITADO ───────────────────────
    if (pedido.status !== 'pago') {
      return Response.json({
        message: `Status "${pedido.status}" — comissão não gerada (aguardando quitação total).`,
        status: 'skipped'
      });
    }

    // Garante saldo zerado: se saldo_restante ainda tem valor, não é quitação total.
    const saldoRestante = parseFloat(pedido.saldo_restante ?? 0);
    if (saldoRestante > 0.01) { // tolerância de 1 centavo para arredondamentos
      return Response.json({
        message: `Saldo devedor de R$ ${saldoRestante.toFixed(2)} ainda em aberto. Comissão não gerada.`,
        status: 'skipped_partial'
      });
    }

    // ─── 3. PROTEÇÃO ANTI-DUPLICIDADE ────────────────────────────────────────
    const todasComissoes = await base44.asServiceRole.entities.CommissionEntry.list();
    const entryExistente = todasComissoes.find(c => String(c.pedido_id) === String(pedido_id));

    // ─── 4. BASE DE CÁLCULO = VALOR EFETIVAMENTE PAGO ────────────────────────
    // total_pago já reflete o valor real recebido (descontos deduzidos no momento
    // da liquidação). NÃO usar valor_pedido para evitar superestimar a comissão.
    const valorBase = parseFloat(pedido.total_pago) || 0;

    if (valorBase <= 0) {
      return Response.json({
        message: 'total_pago é zero. Comissão não gerada.',
        status: 'skipped_zero'
      });
    }

    const percentual   = parseFloat(pedido.porcentagem_comissao) || 5;
    const valorComissao = parseFloat(((valorBase * percentual) / 100).toFixed(2));

    // ─── 5. DETERMINA COMPETÊNCIA (MÊS DO PAGAMENTO OU MÊS ATUAL SE FECHADO) ─
    const dataPagamentoRaw  = pedido.data_pagamento || new Date().toISOString();
    const dataPagamentoStr  = String(dataPagamentoRaw).split('T')[0]; // "YYYY-MM-DD"
    const mesAnoPagamento   = dataPagamentoStr.substring(0, 7);       // "YYYY-MM"

    const comissoesMesPgto  = todasComissoes.filter(c => c.mes_competencia === mesAnoPagamento);
    const mesFechado        = comissoesMesPgto.length > 0 &&
                              comissoesMesPgto.every(c => c.status === 'fechado');

    let dataCompetenciaFinal;
    let mesCompetenciaFinal;

    if (mesFechado) {
      const hoje = new Date();
      dataCompetenciaFinal = hoje.toISOString().split('T')[0];
      mesCompetenciaFinal  = dataCompetenciaFinal.substring(0, 7);
      console.log(`⚠️ Mês ${mesAnoPagamento} já fechado → competência ajustada para ${mesCompetenciaFinal}`);
    } else {
      dataCompetenciaFinal = dataPagamentoStr;
      mesCompetenciaFinal  = mesAnoPagamento;
    }

    const payload = {
      pedido_id:            String(pedido.id),
      pedido_numero:        pedido.numero_pedido,
      representante_id:     pedido.representante_codigo,
      representante_codigo: pedido.representante_codigo,
      representante_nome:   pedido.representante_nome,
      cliente_nome:         pedido.cliente_nome,
      valor_base:           valorBase,
      percentual:           percentual,
      valor_comissao:       valorComissao,
      data_pagamento_real:  dataPagamentoStr,
      data_competencia:     dataCompetenciaFinal,
      mes_competencia:      mesCompetenciaFinal,
      status:               'aberto',
      observacao: mesFechado
        ? `Gerado automaticamente. Mês original (${mesAnoPagamento}) já fechado.`
        : 'Gerado automaticamente',
      movimentacoes: mesFechado ? [{
        data:        new Date().toISOString(),
        mes_origem:  mesAnoPagamento,
        mes_destino: mesCompetenciaFinal,
        usuario:     'sistema',
        motivo:      'Mês de pagamento já estava fechado'
      }] : []
    };

    // ─── 6. CRIA OU ATUALIZA (NUNCA DUPLICA) ─────────────────────────────────
    let comissao;
    if (entryExistente) {
      // Já existe: atualiza apenas os valores calculáveis (não toca em movimentações manuais)
      comissao = await base44.asServiceRole.entities.CommissionEntry.update(entryExistente.id, {
        valor_base:       valorBase,
        percentual:       percentual,
        valor_comissao:   valorComissao,
        data_competencia: entryExistente.data_competencia, // preserva competência já definida
        mes_competencia:  entryExistente.mes_competencia,
        observacao:       (entryExistente.observacao || '') + ' | Recalculado após quitação.'
      });

      console.log(`♻️  CommissionEntry já existia (${entryExistente.id}). Valores atualizados.`);

      return Response.json({
        success: true,
        message: `Comissão atualizada (já existia). Base: R$ ${valorBase}, Comissão: R$ ${valorComissao}`,
        status:  'updated',
        comissao
      });
    }

    comissao = await base44.asServiceRole.entities.CommissionEntry.create(payload);

    // ─── 7. MARCA O PEDIDO COM O ID DA ENTRY ─────────────────────────────────
    await base44.asServiceRole.entities.Pedido.update(pedido_id, {
      comissao_entry_id: comissao.id
    });

    return Response.json({
      success: true,
      message: mesFechado
        ? `Comissão criada para ${mesCompetenciaFinal} (mês original ${mesAnoPagamento} estava fechado). Base: R$ ${valorBase}`
        : `Comissão criada para ${mesCompetenciaFinal}. Base: R$ ${valorBase}`,
      status: 'created',
      comissao
    });

  } catch (error) {
    console.error('Erro ao gerar comissão:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});