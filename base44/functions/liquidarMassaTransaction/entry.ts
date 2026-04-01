import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const {
      selectedPedidosIds,
      formasPagamento,
      sinaisInjetados,
      creditosSelecionadosIds,
      descontoValor,
      descontoTipo,
      devolucao,
      devolucaoMotivo,
      devolucaoComprovante,
      usarPortsAutomatico,
      sobraParaCredito,
      // cheques devolvidos para baixar junto
      chequesDevolvidos = [],
    } = payload;

    // 1. Buscar todos os pedidos selecionados
    const todosPedidos = await base44.asServiceRole.entities.Pedido.filter({
      id: { $in: selectedPedidosIds }
    });

    // 2. Calcular totais
    const totalOriginal = todosPedidos.reduce((sum, p) => {
      const saldo = p.saldo_restante ?? Math.max(0, (p.valor_pedido || 0) - (p.total_pago || 0));
      return sum + saldo;
    }, 0);

    let descontoCalculado = 0;
    if (descontoValor) {
      if (descontoTipo === 'reais') descontoCalculado = parseFloat(descontoValor) || 0;
      else descontoCalculado = (totalOriginal * (parseFloat(descontoValor) || 0)) / 100;
    }
    const devolucaoValorNum = parseFloat(devolucao) || 0;

    // 3. Créditos
    let creditoAUsar = 0;
    let creditosParaUsar = [];
    if (creditosSelecionadosIds && creditosSelecionadosIds.length > 0) {
      creditosParaUsar = await base44.asServiceRole.entities.Credito.filter({
        id: { $in: creditosSelecionadosIds }
      });
      creditoAUsar = creditosParaUsar.reduce((sum, c) => sum + (c.valor || 0), 0);
    }

    // 4. Formas manuais total
    const formasManuaisAtivas = (formasPagamento || []).filter(fp => !fp.isReadOnly && !fp.isSinal);
    const dinheirNovoTotal = formasManuaisAtivas.reduce((sum, fp) => sum + (parseFloat(fp.valor) || 0), 0);
    const totalSinaisInjetados = (sinaisInjetados || []).reduce((sum, s) => sum + (s.valor || 0), 0);

    // 5. Buscar PORTs se necessário
    let portsDisponiveis = [];
    if (usarPortsAutomatico) {
      const allPorts = await base44.asServiceRole.entities.Port.filter({ 
        id: { $exists: true }
      });
      portsDisponiveis = allPorts.filter(port =>
        port && (port.saldo_disponivel || 0) > 0 && !['devolvido', 'finalizado'].includes(port.status)
        && port.pedidos_ids?.some(pid => selectedPedidosIds.includes(pid))
      );
    }

    // 6. Gerar número do borderô — busca o maior existente
    const todosBorderos = await base44.asServiceRole.entities.Bordero.list('-created_date', 5);
    const maxBordero = todosBorderos.length > 0 ? Math.max(...todosBorderos.map(b => b.numero_bordero || 0)) : 0;
    const proximoNumeroBordero = maxBordero + 1;

    // 7. Processar pedidos (distribuir pagamentos)
    let devolucaoRestante = devolucaoValorNum;
    let descontoRestante = descontoCalculado;
    let creditoRestante = creditoAUsar;
    let pagamentoRestante = dinheirNovoTotal;
    const portsEmUso = new Map();
    const pedidosProcessados = [];

    for (const pedido of todosPedidos) {
      let saldoAtual = pedido.saldo_restante ?? Math.max(0, (pedido.valor_pedido || 0) - (pedido.total_pago || 0));
      let devolucaoAplicada = 0, descontoAplicado = 0, portAplicado = 0, creditoAplicado = 0, pagamentoAplicado = 0;

      if (devolucaoRestante > 0 && saldoAtual > 0) {
        const v = Math.min(saldoAtual, devolucaoRestante);
        devolucaoAplicada = v; saldoAtual -= v; devolucaoRestante -= v;
      }
      if (descontoRestante > 0 && saldoAtual > 0) {
        const v = Math.min(saldoAtual, descontoRestante);
        descontoAplicado = v; saldoAtual -= v; descontoRestante -= v;
      }

      if (usarPortsAutomatico && saldoAtual > 0) {
        const portParaEstePedido = portsDisponiveis.find(port =>
          port.pedidos_ids?.includes(pedido.id) &&
          (portsEmUso.has(port.id) ? portsEmUso.get(port.id).saldoRestante : (port.saldo_disponivel || 0)) > 0
        );
        if (portParaEstePedido) {
          const saldoPort = portsEmUso.has(portParaEstePedido.id)
            ? portsEmUso.get(portParaEstePedido.id).saldoRestante
            : portParaEstePedido.saldo_disponivel;
          const valorUsar = Math.min(saldoAtual, saldoPort);
          portAplicado = valorUsar;
          saldoAtual -= valorUsar;
          if (portsEmUso.has(portParaEstePedido.id)) {
            const p = portsEmUso.get(portParaEstePedido.id);
            p.valorTotal += valorUsar;
            p.saldoRestante -= valorUsar;
          } else {
            portsEmUso.set(portParaEstePedido.id, {
              id: portParaEstePedido.id,
              numero: portParaEstePedido.numero_port,
              valorTotal: valorUsar,
              saldoRestante: (portParaEstePedido.saldo_disponivel || 0) - valorUsar,
              comprovantes_urls: portParaEstePedido.comprovantes_urls || []
            });
          }
        }
      }

      if (creditoRestante > 0 && saldoAtual > 0) {
        const v = Math.min(saldoAtual, creditoRestante);
        creditoAplicado = v; saldoAtual -= v; creditoRestante -= v;
      }
      if (pagamentoRestante > 0 && saldoAtual > 0) {
        const v = Math.min(saldoAtual, pagamentoRestante);
        pagamentoAplicado = v; saldoAtual -= v; pagamentoRestante -= v;
      }

      pedidosProcessados.push({
        pedido,
        novoTotalPago: (pedido.total_pago || 0) + pagamentoAplicado + creditoAplicado + devolucaoAplicada + portAplicado,
        novoDescontoTotal: (pedido.desconto_dado || 0) + descontoAplicado,
        novoSaldo: Math.max(0, saldoAtual),
        devolucaoAplicada, descontoAplicado, portAplicado, creditoAplicado, pagamentoAplicado
      });
    }

    const portsUsados = Array.from(portsEmUso.values());
    const creditoEfetivamenteUsado = creditoAUsar - creditoRestante;
    const totalPortUsado = portsUsados.reduce((sum, p) => sum + p.valorTotal, 0);

    // 8. Montar formas de pagamento string
    let todosChequesIds = [];
    const formasManuaisStr = formasManuaisAtivas.filter(fp => parseFloat(fp.valor) > 0).map(fp => {
      let str = `${fp.tipo.toUpperCase()}: R$ ${parseFloat(fp.valor).toFixed(2)}`;
      if (fp.chequesSalvos && fp.chequesSalvos.length > 0) {
        todosChequesIds = [...todosChequesIds, ...fp.chequesSalvos.map(ch => ch.id)];
      }
      return str;
    }).join(' | ');

    const sinaisStr = (sinaisInjetados || []).map(s => `SINAL: ${s.referencia} R$${s.valor}`).join(' | ');
    let formasFinal = [sinaisStr, formasManuaisStr].filter(Boolean).join(' | ');
    if (totalPortUsado > 0) formasFinal += ` | PORT: R$${totalPortUsado.toFixed(2)}`;
    if (creditoEfetivamenteUsado > 0) formasFinal += ` | CRÉDITO: R$${creditoEfetivamenteUsado.toFixed(2)}`;
    if (descontoCalculado > 0) formasFinal += ` | DESCONTO: R$${descontoCalculado.toFixed(2)}`;
    if (devolucaoValorNum > 0) formasFinal += ` | DEVOLUÇÃO: R$${devolucaoValorNum.toFixed(2)}`;

    // Cheques devolvidos na liquidação
    if (chequesDevolvidos.length > 0) {
      formasFinal += ` | CHEQUES DEV. BAIXADOS: ${chequesDevolvidos.map(c => `#${c.numero_cheque}`).join(', ')}`;
    }

    let comprovantesFinais = formasManuaisAtivas.map(fp => fp.comprovante).filter(Boolean);
    if (devolucaoComprovante) comprovantesFinais.push(devolucaoComprovante);
    portsUsados.forEach(port => { if (port.comprovantes_urls) comprovantesFinais = [...comprovantesFinais, ...port.comprovantes_urls]; });

    const valorTotalBordero = dinheirNovoTotal + creditoEfetivamenteUsado + totalPortUsado + totalSinaisInjetados;
    let observacaoBordero = `Desconto: R$${descontoCalculado.toFixed(2)} | Dev: R$${devolucaoValorNum.toFixed(2)} | ${selectedPedidosIds.length} pedidos`;
    if (devolucaoMotivo) observacaoBordero += ` | Motivo: ${devolucaoMotivo}`;
    if (chequesDevolvidos.length > 0) observacaoBordero += ` | ${chequesDevolvidos.length} cheque(s) devolvido(s) baixado(s)`;

    // 9. Criar ÚNICO borderô
    await base44.asServiceRole.entities.Bordero.create({
      numero_bordero: proximoNumeroBordero,
      tipo_liquidacao: 'massa',
      cliente_codigo: todosPedidos[0]?.cliente_codigo || '',
      cliente_nome: todosPedidos[0]?.cliente_nome || '',
      pedidos_ids: selectedPedidosIds,
      valor_total: valorTotalBordero,
      forma_pagamento: formasFinal,
      comprovantes_urls: comprovantesFinais,
      observacao: observacaoBordero,
      liquidado_por: user.email
    });

    // 10. Atualizar pedidos em lotes de 50 (sem timeout)
    const hoje = new Date().toISOString().split('T')[0];
    const LOTE = 50;
    for (let i = 0; i < pedidosProcessados.length; i += LOTE) {
      const lote = pedidosProcessados.slice(i, i + LOTE);
      await Promise.all(lote.map(proc =>
        base44.asServiceRole.entities.Pedido.update(proc.pedido.id, {
          total_pago: proc.novoTotalPago,
          desconto_dado: proc.novoDescontoTotal,
          saldo_restante: proc.novoSaldo,
          status: proc.novoSaldo <= 0 ? 'pago' : 'parcial',
          data_pagamento: proc.novoSaldo <= 0 ? hoje : proc.pedido.data_pagamento,
          mes_pagamento: proc.novoSaldo <= 0 ? hoje.slice(0, 7) : proc.pedido.mes_pagamento,
          bordero_numero: proximoNumeroBordero,
          outras_informacoes: (proc.pedido.outras_informacoes || '') +
            `\n[${new Date().toLocaleDateString('pt-BR')}] Borderô #${proximoNumeroBordero}`
        })
      ));
    }

    // 11. Marcar sinais como usados
    for (const sinal of (sinaisInjetados || [])) {
      if (!sinal._sinalId || !sinal._pedidoId) continue;
      const pedidoOriginal = todosPedidos.find(p => p.id === sinal._pedidoId);
      if (!pedidoOriginal?.sinais_historico) continue;
      await base44.asServiceRole.entities.Pedido.update(sinal._pedidoId, {
        sinais_historico: pedidoOriginal.sinais_historico.map(s =>
          s.id === sinal._sinalId ? { ...s, usado: true } : s
        )
      });
    }

    // 12. Atualizar PORTs
    for (const portUsado of portsUsados) {
      const portOriginal = await base44.asServiceRole.entities.Port.get(portUsado.id);
      await base44.asServiceRole.entities.Port.update(portUsado.id, {
        saldo_disponivel: portUsado.saldoRestante,
        status: portUsado.saldoRestante <= 0 ? 'finalizado' : 'parcialmente_usado',
        observacao: `${portOriginal?.observacao || ''}\n[${new Date().toLocaleDateString('pt-BR')}] Borderô #${proximoNumeroBordero}`.trim()
      });
    }

    // 13. Baixar créditos usados
    if (creditoEfetivamenteUsado > 0) {
      for (const credito of creditosParaUsar) {
        await base44.asServiceRole.entities.Credito.update(credito.id, {
          status: 'usado',
          data_uso: hoje
        });
      }
    }

    // 14. Baixar cheques devolvidos incluídos na liquidação
    if (chequesDevolvidos.length > 0) {
      await Promise.all(chequesDevolvidos.map(ch =>
        base44.asServiceRole.entities.Cheque.update(ch.id, {
          status: 'pago',
          status_pagamento_devolucao: 'pago',
          data_pagamento: hoje,
          forma_pagamento: 'Liquidação em Massa - Borderô #' + proximoNumeroBordero,
          observacao: (ch.observacao || '') + `\n[${new Date().toLocaleDateString('pt-BR')}] Baixado no Borderô #${proximoNumeroBordero}`
        })
      ));
    }

    // 15. Gerar crédito pelo excedente
    if (sobraParaCredito > 0.01) {
      const todosCreditos = await base44.asServiceRole.entities.Credito.list('-created_date', 5);
      const maxCred = todosCreditos.length > 0 ? Math.max(...todosCreditos.map(c => c.numero_credito || 0)) : 0;
      await base44.asServiceRole.entities.Credito.create({
        numero_credito: maxCred + 1,
        cliente_codigo: todosPedidos[0]?.cliente_codigo || '',
        cliente_nome: todosPedidos[0]?.cliente_nome || '',
        valor: sobraParaCredito,
        origem: `Excedente Liquidação Massa - Borderô #${proximoNumeroBordero}`,
        status: 'disponivel'
      });
    }

    return Response.json({
      success: true,
      numero_bordero: proximoNumeroBordero,
      pedidos_quitados: pedidosProcessados.filter(p => p.novoSaldo <= 0).length,
      credito_gerado: sobraParaCredito > 0.01 ? sobraParaCredito : 0,
      cheques_baixados: chequesDevolvidos.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});