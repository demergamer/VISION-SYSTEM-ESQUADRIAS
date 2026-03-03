import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, X, Search } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

export default function RotaCobrancaModal({ pedidos, cheques, onClose }) {
  const [pedidosSelecionados, setPedidosSelecionados] = useState([]);
  const [chequesSelecionados, setChequesSelecionados] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: clientesDb = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

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

  const togglePedido = (pedidoId) => {
    setPedidosSelecionados(prev => 
      prev.includes(pedidoId) 
        ? prev.filter(id => id !== pedidoId)
        : [...prev, pedidoId]
    );
  };

  const toggleCheque = (chequeId) => {
    setChequesSelecionados(prev => 
      prev.includes(chequeId) 
        ? prev.filter(id => id !== chequeId)
        : [...prev, chequeId]
    );
  };

  const selecionarTodosPedidos = () => {
    if (pedidosSelecionados.length === pedidosAbertos.length) {
      setPedidosSelecionados([]);
    } else {
      setPedidosSelecionados(pedidosAbertos.map(p => p.id));
    }
  };

  const selecionarTodosCheques = () => {
    if (chequesSelecionados.length === chequesDevolvidos.length) {
      setChequesSelecionados([]);
    } else {
      setChequesSelecionados(chequesDevolvidos.map(c => c.id));
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const gerarPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Configurações de Data
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataIso = amanha.toISOString().split('T')[0]; // Formato 2026-02-09
    const dataBr = amanha.toLocaleDateString('pt-BR');
    
    const diasSemana = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
    const diaDaSemanaStr = diasSemana[amanha.getDay()];

    const pedidosSel = pedidosAbertos.filter(p => pedidosSelecionados.includes(p.id));
    const chequesSel = chequesDevolvidos.filter(c => chequesSelecionados.includes(c.id));

    // 1. Agrupar por cliente
    const clientesMap = new Map();

    pedidosSel.forEach(pedido => {
      const clienteKey = pedido.cliente_codigo || pedido.cliente_nome;
      if (!clientesMap.has(clienteKey)) {
        clientesMap.set(clienteKey, { codigo: pedido.cliente_codigo, nome: pedido.cliente_nome, pedidos: [], cheques: [] });
      }
      clientesMap.get(clienteKey).pedidos.push(pedido);
    });

    chequesSel.forEach(cheque => {
      const clienteKey = cheque.cliente_codigo || cheque.cliente_nome;
      if (!clientesMap.has(clienteKey)) {
        clientesMap.set(clienteKey, { codigo: cheque.cliente_codigo, nome: cheque.cliente_nome || cheque.emitente, pedidos: [], cheques: [] });
      }
      clientesMap.get(clienteKey).cheques.push(cheque);
    });

    const clientesAgrupados = Array.from(clientesMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));

    // 2. Montar as linhas da Tabela (Igual ao Excel)
    let totalGeral = 0;
    const tableBody = [];

    clientesAgrupados.forEach(cliente => {
      // Buscar região e telefone na lista de clientes cadastrados
      const clienteDb = clientesDb.find(c => c.codigo === cliente.codigo) || {};
      const regiao = clienteDb.regiao || '';
      const dadosCliente = clienteDb.telefone ? `Tel: ${clienteDb.telefone}` : '';
      
      let clientSubtotal = 0;

      // Inserir Pedidos
      cliente.pedidos.forEach(p => {
        const saldo = p.saldo_restante || (p.valor_pedido - (p.total_pago || 0));
        clientSubtotal += saldo;
        totalGeral += saldo;
        tableBody.push([
          cliente.nome,
          regiao,
          p.numero_pedido,
          formatCurrency(p.valor_pedido),
          p.total_pago ? formatCurrency(p.total_pago) : '', // Se não tem pagamento, fica vazio para escrever a caneta
          formatCurrency(saldo),
          '', // Observações (Vazio para escrever)
          dadosCliente
        ]);
      });

      // Inserir Cheques
      cliente.cheques.forEach(c => {
        clientSubtotal += c.valor;
        totalGeral += c.valor;
        tableBody.push([
          cliente.nome,
          regiao,
          `CHQ: ${c.numero_cheque}`,
          formatCurrency(c.valor),
          '',
          formatCurrency(c.valor),
          'DEVOLVIDO',
          dadosCliente
        ]);
      });

      // Linha de Separação/Subtotal do Cliente (Emula a linha com zeros do Excel)
      tableBody.push([
        { content: '', colSpan: 4, styles: { fillColor: [248, 250, 252] } },
        { content: 'SUBTOTAL:', styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
        { content: formatCurrency(clientSubtotal), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
        { content: '', colSpan: 2, styles: { fillColor: [248, 250, 252] } }
      ]);
    });

    // 3. Desenhar o Cabeçalho (Estilo da Planilha)
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`COBRANÇA GIL - ${diaDaSemanaStr}`, 14, 15);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`TABELA PRINCIPAL`, 14, 22);
    doc.text(`${dataIso}`, 55, 22); // Formato de data da planilha
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL A RECEBER: ${formatCurrency(totalGeral)}`, 100, 22);

    // 4. Gerar a Tabela Automática
    autoTable(doc, {
      startY: 28,
      head: [['CLIENTE', 'REGIÃO', 'PEDIDO', 'VALOR', 'PAGO', 'COBRAR', 'OBSERVAÇÕES', 'DADOS CLIENTE - SE NECESSARIO']],
      body: tableBody,
      theme: 'grid', // Borda em todas as células como no Excel
      styles: { 
        fontSize: 8, 
        cellPadding: 2, 
        textColor: [50, 50, 50] 
      },
      headStyles: { 
        fillColor: [230, 230, 230], // Fundo cinza claro igual cabeçalho de excel
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        3: { halign: 'right', cellWidth: 25 }, // Valor
        4: { halign: 'right', cellWidth: 25 }, // Pago
        5: { halign: 'right', cellWidth: 25 }, // Cobrar
        6: { cellWidth: 40 }, // Obs
      },
      didDrawPage: function (data) {
        // Numeração de Página no Rodapé
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(`Página ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });

    doc.save(`Rota_Cobranca_${dataBr.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Gerar Rota de Cobrança - Gilson</h2>
            <p className="text-sm text-slate-500">Selecione pedidos e cheques para incluir na rota (Formato Excel)</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente, código ou número de pedido/cheque..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Pedidos em Aberto */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Pedidos em Aberto ({pedidosAbertos.length})</h3>
                <Button variant="outline" size="sm" onClick={selecionarTodosPedidos}>
                  {pedidosSelecionados.length === pedidosAbertos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              </div>
              <div className="space-y-2">
                {pedidosAbertos.map(pedido => {
                  const saldo = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
                  return (
                    <div key={pedido.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50">
                      <Checkbox
                        checked={pedidosSelecionados.includes(pedido.id)}
                        onCheckedChange={() => togglePedido(pedido.id)}
                      />
                      <div className="flex-1 grid grid-cols-5 gap-2 text-sm">
                        <div>
                          <p className="font-medium">{pedido.cliente_nome}</p>
                          <p className="text-xs text-slate-500">{pedido.cliente_codigo}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Pedido: {pedido.numero_pedido}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Total: {formatCurrency(pedido.valor_pedido)}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Pago: {formatCurrency(pedido.total_pago || 0)}</p>
                        </div>
                        <div>
                          <p className="font-bold text-red-600">Saldo: {formatCurrency(saldo)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cheques Devolvidos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Cheques Devolvidos ({chequesDevolvidos.length})</h3>
                <Button variant="outline" size="sm" onClick={selecionarTodosCheques}>
                  {chequesSelecionados.length === chequesDevolvidos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              </div>
              <div className="space-y-2">
                {chequesDevolvidos.map(cheque => (
                  <div key={cheque.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50">
                    <Checkbox
                      checked={chequesSelecionados.includes(cheque.id)}
                      onCheckedChange={() => toggleCheque(cheque.id)}
                    />
                    <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="font-medium">{cheque.cliente_nome || cheque.emitente}</p>
                        <p className="text-xs text-slate-500">{cheque.cliente_codigo}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Cheque: {cheque.numero_cheque}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Banco: {cheque.banco}</p>
                      </div>
                      <div>
                        <p className="font-bold text-red-600">{formatCurrency(cheque.valor)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 border-t flex items-center justify-between bg-slate-50">
          <p className="text-sm text-slate-600">
            {pedidosSelecionados.length} pedido(s) + {chequesSelecionados.length} cheque(s) selecionados
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={gerarPDF}
              disabled={pedidosSelecionados.length === 0 && chequesSelecionados.length === 0}
            >
              <FileText className="w-4 h-4 mr-2" />
              Gerar PDF (Planilha)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
