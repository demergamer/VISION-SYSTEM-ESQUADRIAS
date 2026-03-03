import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Search, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ModalContainer from "@/components/modals/ModalContainer";

export default function RotaCobrancaModal({ pedidos, cheques, onClose }) {
  const [pedidosSelecionados, setPedidosSelecionados] = useState([]);
  const [chequesSelecionados, setChequesSelecionados] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de Paginação
  const [pedidosPage, setPedidosPage] = useState(1);
  const [pedidosLimit, setPedidosLimit] = useState(10);
  const [chequesPage, setChequesPage] = useState(1);
  const [chequesLimit, setChequesLimit] = useState(10);

  // Define a data de amanhã como padrão
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const [dataRota, setDataRota] = useState(amanha.toISOString().split('T')[0]);

  const { data: clientesDb = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  // Filtros de Busca
  const pedidosAbertos = useMemo(() => {
    const filtered = pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial');
    if (!searchTerm) return filtered;
    
    const term = searchTerm.toLowerCase();
    return filtered.filter(p => 
      p.cliente_nome?.toLowerCase().includes(term) ||
      p.cliente_codigo?.toLowerCase().includes(term) ||
      p.numero_pedido?.toLowerCase().includes(term)
    );
  }, [pedidos, searchTerm]);

  const chequesDevolvidos = useMemo(() => {
    const filtered = cheques.filter(c => c.status === 'devolvido');
    if (!searchTerm) return filtered;
    
    const term = searchTerm.toLowerCase();
    return filtered.filter(c => 
      c.cliente_nome?.toLowerCase().includes(term) ||
      c.cliente_codigo?.toLowerCase().includes(term) ||
      c.numero_cheque?.toLowerCase().includes(term)
    );
  }, [cheques, searchTerm]);

  // Resetar páginas ao buscar
  useEffect(() => {
    setPedidosPage(1);
    setChequesPage(1);
  }, [searchTerm]);

  // Fatiamento (Paginação)
  const paginatedPedidos = useMemo(() => {
    const start = (pedidosPage - 1) * pedidosLimit;
    return pedidosAbertos.slice(start, start + pedidosLimit);
  }, [pedidosAbertos, pedidosPage, pedidosLimit]);
  const totalPedidosPages = Math.ceil(pedidosAbertos.length / pedidosLimit);

  const paginatedCheques = useMemo(() => {
    const start = (chequesPage - 1) * chequesLimit;
    return chequesDevolvidos.slice(start, start + chequesLimit);
  }, [chequesDevolvidos, chequesPage, chequesLimit]);
  const totalChequesPages = Math.ceil(chequesDevolvidos.length / chequesLimit);

  // Handlers de Seleção
  const togglePedido = (pedidoId) => {
    setPedidosSelecionados(prev => prev.includes(pedidoId) ? prev.filter(id => id !== pedidoId) : [...prev, pedidoId]);
  };

  const toggleCheque = (chequeId) => {
    setChequesSelecionados(prev => prev.includes(chequeId) ? prev.filter(id => id !== chequeId) : [...prev, chequeId]);
  };

  const selecionarTodosPedidos = () => {
    if (pedidosSelecionados.length === pedidosAbertos.length) setPedidosSelecionados([]);
    else setPedidosSelecionados(pedidosAbertos.map(p => p.id));
  };

  const selecionarTodosCheques = () => {
    if (chequesSelecionados.length === chequesDevolvidos.length) setChequesSelecionados([]);
    else setChequesSelecionados(chequesDevolvidos.map(c => c.id));
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  // Geração do PDF
  const gerarPDF = () => {
    const doc = new jsPDF('landscape');
    
    const [ano, mes, dia] = dataRota.split('-');
    const dataBr = `${dia}/${mes}/${ano}`;
    const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    const diasSemana = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
    const diaDaSemanaStr = diasSemana[dataObj.getDay()];

    const pedidosSel = pedidosAbertos.filter(p => pedidosSelecionados.includes(p.id));
    const chequesSel = chequesDevolvidos.filter(c => chequesSelecionados.includes(c.id));

    const clientesMap = new Map();

    pedidosSel.forEach(pedido => {
      const clienteKey = pedido.cliente_codigo || pedido.cliente_nome;
      if (!clientesMap.has(clienteKey)) clientesMap.set(clienteKey, { codigo: pedido.cliente_codigo, nome: pedido.cliente_nome, pedidos: [], cheques: [] });
      clientesMap.get(clienteKey).pedidos.push(pedido);
    });

    chequesSel.forEach(cheque => {
      const clienteKey = cheque.cliente_codigo || cheque.cliente_nome;
      if (!clientesMap.has(clienteKey)) clientesMap.set(clienteKey, { codigo: cheque.cliente_codigo, nome: cheque.cliente_nome || cheque.emitente, pedidos: [], cheques: [] });
      clientesMap.get(clienteKey).cheques.push(cheque);
    });

    const clientesAgrupados = Array.from(clientesMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));

    let totalGeral = 0;
    const tableBody = [];

    clientesAgrupados.forEach((cliente, index) => {
      const clienteDb = clientesDb.find(c => c.codigo === cliente.codigo) || {};
      const regiao = clienteDb.regiao || '';
      const dadosCliente = clienteDb.telefone ? `Tel: ${clienteDb.telefone}` : '';
      let clientSubtotal = 0;

      // 🚀 Pula a linha com metade da altura (minCellHeight: 2)
      if (index > 0) {
        tableBody.push([{ content: '', colSpan: 8, styles: { fillColor: [255, 255, 255], minCellHeight: 2 } }]);
      }

      cliente.pedidos.forEach(p => {
        const saldo = p.saldo_restante || (p.valor_pedido - (p.total_pago || 0));
        clientSubtotal += saldo;
        totalGeral += saldo;
        tableBody.push([cliente.nome, regiao, p.numero_pedido, formatCurrency(p.valor_pedido), p.total_pago ? formatCurrency(p.total_pago) : '', formatCurrency(saldo), '', dadosCliente]);
      });

      cliente.cheques.forEach(c => {
        clientSubtotal += c.valor;
        totalGeral += c.valor;
        tableBody.push([cliente.nome, regiao, `CHQ: ${c.numero_cheque}`, formatCurrency(c.valor), '', formatCurrency(c.valor), 'DEVOLVIDO', dadosCliente]);
      });

      tableBody.push([
        { content: `SUBTOTAL ${cliente.nome}:`, colSpan: 5, styles: { fontStyle: 'bold', halign: 'right', fillColor: [210, 210, 210] } },
        { content: formatCurrency(clientSubtotal), styles: { fontStyle: 'bold', halign: 'right', fillColor: [210, 210, 210] } },
        { content: '', colSpan: 2, styles: { fillColor: [210, 210, 210] } }
      ]);
    });

    // 🚀 Cabeçalho posicionado mais acima e Totalizador no centro
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`COBRANÇA GIL - ${diaDaSemanaStr}`, 5, 10);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`TABELA PRINCIPAL`, 5, 16);
    doc.text(`${dataBr}`, 45, 16); 
    
    // Total a Receber centralizado perfeitamente no X: 148.5 (metade da folha A4 paisagem)
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL A RECEBER: ${formatCurrency(totalGeral)}`, 148.5, 16, { align: 'center' });

    // 🚀 autoTable com margens 0 nas laterais e 10mm (1cm) em cima/baixo
    autoTable(doc, {
      startY: 22,
      margin: { top: 10, right: 0, bottom: 10, left: 0 }, 
      head: [['CLIENTE', 'REGIÃO', 'PEDIDO', 'VALOR', 'PAGO', 'COBRAR', 'OBSERVAÇÕES', 'DADOS CLIENTE - SE NECESSARIO']],
      body: tableBody,
      theme: 'grid',
      styles: { 
        fontSize: 8, 
        // cellPadding ajustado (espaço de 3mm nas laterais internas para o texto não colar na borda do papel)
        cellPadding: { top: 1, bottom: 1, left: 3, right: 3 }, 
        textColor: [50, 50, 50], 
        lineColor: [200, 200, 200], 
        lineWidth: 0.1 
      },
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 25 },
        5: { halign: 'right', cellWidth: 25 },
        6: { cellWidth: 40 },
      },
      didDrawPage: function (data) {
        // Numeração de página no rodapé, também centralizada
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(`Página ${doc.internal.getNumberOfPages()}`, 148.5, doc.internal.pageSize.height - 5, { align: 'center' });
      }
    });

    doc.save(`Rota_Cobranca_${dataBr.replace(/\//g, '-')}.pdf`);
  };

  return (
    <ModalContainer open={true} onClose={onClose} title="Gerar Rota de Cobrança" description="Selecione pedidos e cheques para gerar a planilha em PDF" size="3xl">
      <div className="space-y-6 flex flex-col h-full">
        
        {/* PAINEL SUPERIOR: AÇÕES E TOTAIS */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700 uppercase">Data da Rota:</span>
              <Input type="date" value={dataRota} onChange={(e) => setDataRota(e.target.value)} className="h-9 text-sm w-36 bg-white border-blue-200 shadow-sm" />
            </div>
            <div className="h-8 w-px bg-blue-200 hidden sm:block"></div>
            <p className="text-sm font-medium text-slate-700 text-center sm:text-left">
              Selecionados:<br/>
              <span className="text-blue-700 font-black text-lg">{pedidosSelecionados.length}</span> <span className="text-xs">Pedidos</span> + <span className="text-blue-700 font-black text-lg">{chequesSelecionados.length}</span> <span className="text-xs">Cheques</span>
            </p>
          </div>
          
          <Button onClick={gerarPDF} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 h-12 px-6 rounded-xl" disabled={pedidosSelecionados.length === 0 && chequesSelecionados.length === 0}>
            <FileText className="w-5 h-5 mr-2" /> Gerar Relatório PDF
          </Button>
        </div>

        {/* Campo de Pesquisa */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por cliente, código ou número..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10" />
        </div>

        {/* Listas */}
        <div className="space-y-8 flex-1 pb-6">
          
          {/* PEDIDOS EM ABERTO */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-700">Pedidos em Aberto ({pedidosAbertos.length})</h3>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selecionarTodosPedidos}>
                {pedidosSelecionados.length === pedidosAbertos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>
            
            <div className="p-2 space-y-1">
              {paginatedPedidos.map(pedido => {
                const saldo = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
                return (
                  <div key={pedido.id} className="flex items-center gap-3 p-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors rounded-lg">
                    <Checkbox checked={pedidosSelecionados.includes(pedido.id)} onCheckedChange={() => togglePedido(pedido.id)} />
                    <div className="flex-1 grid grid-cols-5 gap-2 text-sm items-center">
                      <div className="col-span-2 sm:col-span-1">
                        <p className="font-bold text-slate-800 truncate" title={pedido.cliente_nome}>{pedido.cliente_nome}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{pedido.cliente_codigo}</p>
                      </div>
                      <div><p className="text-slate-500 text-xs">Pedido</p><p className="font-mono text-slate-700">{pedido.numero_pedido}</p></div>
                      <div><p className="text-slate-500 text-xs">Total</p><p className="font-medium text-slate-700">{formatCurrency(pedido.valor_pedido)}</p></div>
                      <div className="hidden sm:block"><p className="text-slate-500 text-xs">Pago</p><p className="text-emerald-600">{formatCurrency(pedido.total_pago || 0)}</p></div>
                      <div className="text-right sm:text-left"><p className="text-slate-500 text-xs">Saldo</p><p className="font-bold text-red-600">{formatCurrency(saldo)}</p></div>
                    </div>
                  </div>
                );
              })}
              {paginatedPedidos.length === 0 && <div className="p-4 text-center text-slate-400 text-sm">Nenhum pedido encontrado.</div>}
            </div>

            {/* Paginação de Pedidos */}
            <div className="bg-slate-50 border-t border-slate-200 p-2 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Exibir:</span>
                <select value={pedidosLimit} onChange={(e) => { setPedidosLimit(Number(e.target.value)); setPedidosPage(1); }} className="h-7 rounded border-slate-300 px-1 bg-white text-slate-700">
                  <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
                </select>
                <span>por pág.</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPedidosPage(p => Math.max(1, p - 1))} disabled={pedidosPage === 1}><ChevronLeft className="w-3 h-3" /></Button>
                <span className="text-xs font-bold px-2 text-slate-600">{pedidosPage} / {totalPedidosPages || 1}</span>
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPedidosPage(p => Math.min(totalPedidosPages, p + 1))} disabled={pedidosPage === totalPedidosPages || totalPedidosPages === 0}><ChevronRight className="w-3 h-3" /></Button>
              </div>
            </div>
          </div>

          {/* CHEQUES DEVOLVIDOS */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-700">Cheques Devolvidos ({chequesDevolvidos.length})</h3>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selecionarTodosCheques}>
                {chequesSelecionados.length === chequesDevolvidos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>
            
            <div className="p-2 space-y-1">
              {paginatedCheques.map(cheque => (
                <div key={cheque.id} className="flex items-center gap-3 p-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors rounded-lg">
                  <Checkbox checked={chequesSelecionados.includes(cheque.id)} onCheckedChange={() => toggleCheque(cheque.id)} />
                  <div className="flex-1 grid grid-cols-4 gap-2 text-sm items-center">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="font-bold text-slate-800 truncate" title={cheque.cliente_nome || cheque.emitente}>{cheque.cliente_nome || cheque.emitente}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{cheque.cliente_codigo}</p>
                    </div>
                    <div><p className="text-slate-500 text-xs">Cheque</p><p className="font-mono text-slate-700">{cheque.numero_cheque}</p></div>
                    <div className="hidden sm:block"><p className="text-slate-500 text-xs">Banco</p><p className="text-slate-700">{cheque.banco}</p></div>
                    <div className="text-right sm:text-left"><p className="text-slate-500 text-xs">Valor</p><p className="font-bold text-red-600">{formatCurrency(cheque.valor)}</p></div>
                  </div>
                </div>
              ))}
              {paginatedCheques.length === 0 && <div className="p-4 text-center text-slate-400 text-sm">Nenhum cheque encontrado.</div>}
            </div>

            {/* Paginação de Cheques */}
            <div className="bg-slate-50 border-t border-slate-200 p-2 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Exibir:</span>
                <select value={chequesLimit} onChange={(e) => { setChequesLimit(Number(e.target.value)); setChequesPage(1); }} className="h-7 rounded border-slate-300 px-1 bg-white text-slate-700">
                  <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
                </select>
                <span>por pág.</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setChequesPage(p => Math.max(1, p - 1))} disabled={chequesPage === 1}><ChevronLeft className="w-3 h-3" /></Button>
                <span className="text-xs font-bold px-2 text-slate-600">{chequesPage} / {totalChequesPages || 1}</span>
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setChequesPage(p => Math.min(totalChequesPages, p + 1))} disabled={chequesPage === totalChequesPages || totalChequesPages === 0}><ChevronRight className="w-3 h-3" /></Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </ModalContainer>
  );
}
