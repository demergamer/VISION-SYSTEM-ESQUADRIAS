import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * FUNÇÃO AUTOMÁTICA: Gera CommissionEntry quando um pedido é pago
 * 
 * IMPORTANTE: Esta função deve ser chamada via Automation (Entity Trigger)
 * ou manualmente após liquidação de pedidos.
 * 
 * Regra de Competência:
 * - Verifica se o mês do pagamento já está fechado
 * - Se sim, joga a comissão para o mês atual aberto
 * - Se não, usa a data de pagamento como competência
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

    // 1. Busca o pedido
    const pedido = await base44.asServiceRole.entities.Pedido.get(pedido_id);

    if (!pedido) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (pedido.status !== 'pago') {
      return Response.json({ 
        message: 'Pedido ainda não está pago. Comissão não gerada.',
        status: 'skipped'
      });
    }

    // 2. Verifica se já existe comissão para este pedido
    const comissoesExistentes = await base44.asServiceRole.entities.CommissionEntry.list();
    const jaExiste = comissoesExistentes.some(c => c.pedido_id === pedido_id);

    if (jaExiste) {
      return Response.json({ 
        message: 'Comissão já existe para este pedido',
        status: 'already_exists'
      });
    }

    // 3. Determina a data de competência
    const dataPagamento = pedido.data_pagamento || new Date().toISOString();
    const mesAnoPagamento = dataPagamento.substring(0, 7); // "2026-02"

    // 4. Verifica se o mês do pagamento já está fechado
    const comissoesMesPagamento = comissoesExistentes.filter(c => 
      c.mes_competencia === mesAnoPagamento
    );
    
    const mesFechado = comissoesMesPagamento.length > 0 && 
                       comissoesMesPagamento.every(c => c.status === 'fechado');

    let dataCompetenciaFinal;
    let mesCompetenciaFinal;

    if (mesFechado) {
      // Se o mês está fechado, joga para o mês atual
      const hoje = new Date();
      dataCompetenciaFinal = hoje.toISOString().split('T')[0];
      mesCompetenciaFinal = dataCompetenciaFinal.substring(0, 7);
      
      console.log(`⚠️ Mês ${mesAnoPagamento} já fechado. Jogando para ${mesCompetenciaFinal}`);
    } else {
      // Usa o mês do pagamento
      dataCompetenciaFinal = dataPagamento.split('T')[0];
      mesCompetenciaFinal = mesAnoPagamento;
    }

    // 5. Calcula valores
    const valorBase = parseFloat(pedido.total_pago) || 0;
    const percentual = pedido.porcentagem_comissao || 5;
    const valorComissao = (valorBase * percentual) / 100;

    // 6. Cria o lançamento de comissão
    const novaComissao = await base44.asServiceRole.entities.CommissionEntry.create({
      pedido_id: pedido.id,
      pedido_numero: pedido.numero_pedido,
      representante_id: pedido.representante_codigo, // Pode ser melhorado com ID real
      representante_codigo: pedido.representante_codigo,
      representante_nome: pedido.representante_nome,
      cliente_nome: pedido.cliente_nome,
      valor_base: valorBase,
      percentual: percentual,
      valor_comissao: valorComissao,
      data_pagamento_real: dataPagamento.split('T')[0],
      data_competencia: dataCompetenciaFinal,
      mes_competencia: mesCompetenciaFinal,
      status: 'aberto',
      observacao: mesFechado ? `Gerado automaticamente. Mês original (${mesAnoPagamento}) já estava fechado.` : 'Gerado automaticamente',
      movimentacoes: mesFechado ? [{
        data: new Date().toISOString(),
        mes_origem: mesAnoPagamento,
        mes_destino: mesCompetenciaFinal,
        usuario: 'sistema',
        motivo: 'Mês de pagamento já estava fechado'
      }] : []
    });

    // 7. Vincula a comissão ao pedido (opcional - campo auxiliar)
    await base44.asServiceRole.entities.Pedido.update(pedido_id, {
      comissao_entry_id: novaComissao.id
    });

    return Response.json({
      success: true,
      message: mesFechado 
        ? `Comissão gerada para o mês ${mesCompetenciaFinal} (original ${mesAnoPagamento} estava fechado)`
        : `Comissão gerada para o mês ${mesCompetenciaFinal}`,
      comissao: novaComissao
    });

  } catch (error) {
    console.error('Erro ao gerar comissão:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});