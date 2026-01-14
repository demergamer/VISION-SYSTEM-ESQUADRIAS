import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, X } from "lucide-react";
import jsPDF from 'jspdf';

export default function RotaCobrancaModal({ pedidos, cheques, onClose }) {
  const [pedidosSelecionados, setPedidosSelecionados] = useState([]);
  const [chequesSelecionados, setChequesSelecionados] = useState([]);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const pedidosAbertos = useMemo(() => {
    return pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial');
  }, [pedidos]);

  const chequesDevolvidos = useMemo(() => {
    return cheques.filter(c => c.status === 'devolvido');
  }, [cheques]);

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
    const doc = new jsPDF();
    
    // Data de amanha
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataFormatada = amanha.toLocaleDateString('pt-BR');
    
    const hoje = new Date();
    
    const calcularDiasAtraso = (dataEntrega) => {
      const entrega = new Date(dataEntrega);
      const diff = Math.floor((hoje - entrega) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    };

    // Pedidos e cheques selecionados
    const pedidosSel = pedidosAbertos.filter(p => pedidosSelecionados.includes(p.id));
    const chequesSel = chequesDevolvidos.filter(c => chequesSelecionados.includes(c.id));

    // Agrupar por cliente
    const clientesMap = new Map();

    pedidosSel.forEach(pedido => {
      const clienteKey = pedido.cliente_codigo || pedido.cliente_nome;
      if (!clientesMap.has(clienteKey)) {
        clientesMap.set(clienteKey, {
          codigo: pedido.cliente_codigo,
          nome: pedido.cliente_nome,
          pedidos: [],
          cheques: []
        });
      }
      clientesMap.get(clienteKey).pedidos.push(pedido);
    });

    chequesSel.forEach(cheque => {
      const clienteKey = cheque.cliente_codigo || cheque.cliente_nome;
      if (!clientesMap.has(clienteKey)) {
        clientesMap.set(clienteKey, {
          codigo: cheque.cliente_codigo,
          nome: cheque.cliente_nome || cheque.emitente,
          pedidos: [],
          cheques: []
        });
      }
      clientesMap.get(clienteKey).cheques.push(cheque);
    });

    // Ordenar por nome do cliente
    const clientes = Array.from(clientesMap.values()).sort((a, b) => 
      a.nome.localeCompare(b.nome)
    );

    // Logo/Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('ROTA DE COBRANCA - GILSON', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Data: ${dataFormatada}`, 105, 22, { align: 'center' });
    
    // Linha separadora
    doc.line(15, 26, 195, 26);

    let y = 35;
    let numeroCliente = 1;

    clientes.forEach((cliente, idx) => {
      // Verificar espaco na pagina
      if (y > 240) {
        doc.addPage();
        y = 20;
        numeroCliente = 1;
      }

      // Header do cliente com numero
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      
      // Checkbox Visitado
      doc.rect(15, y - 3, 4, 4);
      
      doc.text(`${numeroCliente}.`, 21, y);
      doc.text(`Cliente: ${cliente.nome}`, 28, y);
      if (cliente.codigo) {
        doc.text(`Cod: ${cliente.codigo}`, 145, y);
      }
      y += 5;
      
      // Buscar telefone do cliente (buscar na lista de clientes da query)
      const clienteDados = clientes.find(c => c.codigo === cliente.codigo);
      if (clienteDados?.telefone) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(`Tel: ${clienteDados.telefone}`, 28, y);
        y += 5;
      } else {
        y += 2;
      }
      
      numeroCliente++;

      // Linha separadora
      doc.line(15, y, 195, y);
      y += 5;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');

      let subtotal = 0;

      // Pedidos do cliente
      cliente.pedidos.forEach(pedido => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }

        const saldo = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
        subtotal += saldo;
        const diasAtraso = calcularDiasAtraso(pedido.data_entrega);

        doc.text(`Pedido: ${pedido.numero_pedido}`, 28, y);
        if (diasAtraso > 0) {
          doc.setTextColor(255, 0, 0);
          doc.text(`(${diasAtraso}d atraso)`, 65, y);
          doc.setTextColor(0, 0, 0);
        }
        doc.text(`Total: ${formatCurrency(pedido.valor_pedido)}`, 100, y);
        doc.text(`Pago: ${formatCurrency(pedido.total_pago || 0)}`, 135, y);
        doc.text(`Saldo: ${formatCurrency(saldo)}`, 170, y);
        y += 5;
      });

      // Cheques do cliente
      cliente.cheques.forEach(cheque => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }

        subtotal += cheque.valor;
        const diasAtraso = calcularDiasAtraso(cheque.data_vencimento);

        doc.setTextColor(255, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(`CHEQUE DEVOLVIDO: ${cheque.numero_cheque}`, 28, y);
        doc.setFont(undefined, 'normal');
        if (diasAtraso > 0) {
          doc.text(`(${diasAtraso}d)`, 95, y);
        }
        doc.text(`Valor: ${formatCurrency(cheque.valor)}`, 135, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      });

      // Subtotal do cliente
      y += 2;
      doc.setFont(undefined, 'bold');
      doc.text(`SUBTOTAL: ${formatCurrency(subtotal)}`, 155, y);
      y += 5;

      // Campos de controle
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.text('Valor Recebido: R$ ___________', 28, y);
      doc.text('Forma: ___________', 100, y);
      y += 4;
      doc.text('OBS: _________________________________________________________________', 28, y);
      y += 4;
      doc.text('Assinatura Cliente: ________________________________', 28, y);
      
      y += 8;
      doc.setFontSize(9);
    });

    // Total geral
    const totalGeral = clientes.reduce((sum, cliente) => {
      const totalPedidos = cliente.pedidos.reduce((s, p) => 
        s + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0
      );
      const totalCheques = cliente.cheques.reduce((s, c) => s + c.valor, 0);
      return sum + totalPedidos + totalCheques;
    }, 0);

    if (y > 235) {
      doc.addPage();
      y = 20;
    }

    y += 5;
    doc.line(15, y, 195, y);
    y += 7;
    
    // Resumo do dia
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL A RECEBER: ${formatCurrency(totalGeral)}`, 15, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('META DO DIA: R$ _______________', 15, y);
    doc.text('TOTAL RECEBIDO: R$ _______________', 110, y);
    y += 8;
    
    doc.text('OBSERVACOES GERAIS:', 15, y);
    y += 5;
    doc.text('_________________________________________________________________________', 15, y);
    y += 5;
    doc.text('_________________________________________________________________________', 15, y);
    y += 10;
    
    doc.text('Assinatura Gilson: ____________________________', 15, y);
    doc.text('Data/Hora: ___________', 130, y);

    doc.save(`Rota_Cobranca_${dataFormatada.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Gerar Rota de Cobranca - Gilson</h2>
            <p className="text-sm text-slate-500">Selecione pedidos e cheques para incluir na rota</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
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
              Gerar PDF
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}