import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tipo, mes_ano, representantes, representante } = await req.json();
    const doc = new jsPDF();

    if (tipo === 'geral') {
      // RELATÓRIO GERAL (SINTÉTICO) - Para transferências PIX
      doc.setFontSize(18);
      doc.text('J&C Esquadrias - Relatório de Pagamentos', 20, 20);
      
      doc.setFontSize(11);
      doc.text(`Referência: ${mes_ano}`, 20, 30);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 36);

      // Marca d'água se for prévia
      const algumAberto = representantes.some(r => r.status !== 'fechado');
      if (algumAberto) {
        doc.setFontSize(40);
        doc.setTextColor(200, 200, 200);
        doc.text('PRÉVIA', 105, 150, { align: 'center', angle: 45 });
        doc.setTextColor(0, 0, 0);
      }

      // Cabeçalho da tabela
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      let y = 50;
      doc.text('Representante', 20, y);
      doc.text('Chave PIX', 100, y);
      doc.text('Valor a Pagar', 160, y);

      // Linha
      doc.setLineWidth(0.5);
      doc.line(20, y + 2, 190, y + 2);

      // Dados
      doc.setFont('courier', 'normal');
      y += 8;

      representantes.forEach(rep => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.setFont('helvetica', 'normal');
        doc.text(rep.nome.substring(0, 30), 20, y);
        doc.text(rep.chave_pix || 'Não cadastrado', 100, y);
        
        // Valor alinhado à esquerda com fonte monospaced
        doc.setFont('courier', 'normal');
        doc.text(`R$ ${rep.saldoAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 160, y);
        
        y += 7;
      });

      // Total
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setLineWidth(0.5);
      doc.line(20, y, 190, y);
      y += 7;
      const totalGeral = representantes.reduce((sum, r) => sum + r.saldoAPagar, 0);
      doc.text('TOTAL A PAGAR:', 100, y);
      doc.setFont('courier', 'bold');
      doc.setFontSize(12);
      doc.text(`R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 160, y);

    } else if (tipo === 'analitico') {
      // RELATÓRIO ANALÍTICO (INDIVIDUAL) - Comprovante para representante
      doc.setFontSize(16);
      doc.text('J&C Esquadrias', 20, 20);
      doc.setFontSize(10);
      doc.text('Controle de Comissões', 20, 27);

      // Marca d'água se for prévia
      if (representante.status !== 'fechado') {
        doc.setFontSize(50);
        doc.setTextColor(220, 220, 220);
        doc.text('PRÉVIA DE FECHAMENTO', 105, 150, { align: 'center', angle: 45 });
        doc.setTextColor(0, 0, 0);
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Representante: ${representante.nome}`, 20, 40);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`Código: ${representante.codigo}`, 20, 46);
      if (representante.chave_pix) {
        doc.text(`Chave PIX: ${representante.chave_pix}`, 20, 52);
      }
      doc.text(`Período: ${mes_ano}`, 20, 58);

      // Tabela de pedidos
      let y = 70;
      doc.setFont(undefined, 'bold');
      doc.text('Data', 20, y);
      doc.text('Nº Pedido', 45, y);
      doc.text('Cliente', 75, y);
      doc.text('Valor Venda', 130, y, { align: 'right' });
      doc.text('%', 155, y, { align: 'right' });
      doc.text('Comissão', 180, y, { align: 'right' });

      doc.setLineWidth(0.5);
      doc.line(20, y + 2, 190, y + 2);

      doc.setFont(undefined, 'normal');
      y += 8;

      representante.pedidos.forEach(pedido => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }

        doc.text(pedido.data_pagamento ? new Date(pedido.data_pagamento).toLocaleDateString('pt-BR') : '-', 20, y);
        doc.text(`#${pedido.numero_pedido}`, 45, y);
        doc.text(pedido.cliente_nome.substring(0, 20), 75, y);
        doc.text(`R$ ${pedido.valor_pedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 130, y, { align: 'right' });
        doc.text(`${pedido.percentualComissao}%`, 155, y, { align: 'right' });
        doc.text(`R$ ${pedido.valorComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 180, y, { align: 'right' });
        
        y += 6;
      });

      // Resumo financeiro
      y += 10;
      doc.setLineWidth(0.5);
      doc.line(20, y, 190, y);
      y += 8;

      doc.setFont(undefined, 'bold');
      doc.text('RESUMO FINANCEIRO:', 20, y);
      y += 8;

      doc.setFont(undefined, 'normal');
      doc.text('Total Vendas:', 20, y);
      doc.text(`R$ ${representante.totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 180, y, { align: 'right' });
      y += 6;

      doc.text('Comissão Bruta:', 20, y);
      doc.text(`R$ ${representante.totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 180, y, { align: 'right' });
      y += 6;

      if (representante.vales > 0) {
        doc.text('(-) Vales/Adiantamentos:', 20, y);
        doc.text(`R$ ${representante.vales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 180, y, { align: 'right' });
        y += 6;
      }

      if (representante.outrosDescontos > 0) {
        doc.text(`(-) Outros Descontos${representante.descricaoDescontos ? ` (${representante.descricaoDescontos})` : ''}:`, 20, y);
        doc.text(`R$ ${representante.outrosDescontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 180, y, { align: 'right' });
        y += 6;
      }

      y += 2;
      doc.setLineWidth(0.8);
      doc.line(20, y, 190, y);
      y += 7;

      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('VALOR LÍQUIDO A RECEBER:', 20, y);
      doc.text(`R$ ${representante.saldoAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 180, y, { align: 'right' });

      // Observações
      if (representante.observacoes) {
        y += 12;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Observações:', 20, y);
        doc.setFont(undefined, 'normal');
        y += 6;
        const linhas = doc.splitTextToSize(representante.observacoes, 170);
        doc.text(linhas, 20, y);
      }

      // Rodapé
      doc.setFontSize(8);
      doc.text(`Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`, 105, 285, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=comissoes-${tipo}-${mes_ano}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});