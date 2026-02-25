/**
 * Versão somente leitura do RotaChecklist para o Portal do Motorista.
 * Sem edição, sem salvar, sem alterar motorista — apenas consulta.
 */
import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Ban, AlertTriangle, Truck, Printer, ArrowLeft } from "lucide-react";
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const safeDate = (d) => { try { return d ? format(new Date(d), 'dd/MM/yyyy') : '-'; } catch { return '-'; } };

export default function RotasChecklistReadOnly({ rota, pedidos = [], onBack }) {
  const isCancelado = (status) => status?.toLowerCase() === 'cancelado';
  const activePedidos = pedidos.filter(p => !isCancelado(p.status));
  const confirmados = activePedidos.filter(p => p.confirmado_entrega).length;
  const total = activePedidos.length;
  const pendentes = total - confirmados;

  const gerarPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.width;
    let y = 20;
    doc.setFontSize(16); doc.setFont(undefined, 'bold');
    doc.text('RELATÓRIO DE EXPEDIÇÃO', pw / 2, y, { align: 'center' }); y += 10;
    doc.setFontSize(11); doc.setFont(undefined, 'normal');
    doc.text(`Rota: ${rota?.codigo_rota || '-'}`, 20, y); y += 6;
    doc.text(`Data: ${safeDate(rota?.data_importacao)}`, 20, y); y += 6;
    doc.text(`Motorista: ${rota?.motorista_nome || 'Não informado'}`, 20, y); y += 10;
    doc.line(20, y, pw - 20, y); y += 8;

    const pedidosConf = activePedidos.filter(p => p.confirmado_entrega);
    const pedidosPend = activePedidos.filter(p => !p.confirmado_entrega);

    for (const [label, list] of [['CONFIRMADOS', pedidosConf], ['PENDENTES', pedidosPend]]) {
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text(`${label} (${list.length})`, 20, y); y += 7;
      doc.setFontSize(9); doc.setFont(undefined, 'bold');
      doc.text('Nº Pedido', 20, y); doc.text('Cliente', 60, y); doc.text('Valor', 160, y); y += 5;
      doc.line(20, y, pw - 20, y); y += 4;
      doc.setFont(undefined, 'normal');
      list.forEach(p => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(p.numero_pedido || '-', 20, y);
        doc.text(((p.cliente_nome || '-').substring(0, 35)), 60, y);
        doc.text(formatCurrency(p.valor_pedido), 160, y); y += 5;
      });
      y += 6;
    }

    doc.save(`Expedicao_${(rota?.codigo_rota || 'rota').replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header da Rota */}
      <Card className="p-4 bg-slate-50">
        <div className="flex items-center gap-3 mb-4">
          <Truck className="w-6 h-6 text-slate-600" />
          <div className="flex-1">
            <h2 className="font-bold text-lg text-slate-800">{rota?.codigo_rota || 'Rota'}</h2>
            <p className="text-sm text-slate-500">Importada em {safeDate(rota?.data_importacao)}</p>
            {rota?.motorista_nome && (
              <p className="text-sm text-slate-600 mt-0.5">Motorista: <span className="font-medium">{rota.motorista_nome}</span></p>
            )}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-700">{total}</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-emerald-600">Confirmados</p>
            <p className="text-2xl font-bold text-emerald-700">{confirmados}</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-amber-600">Pendentes</p>
            <p className="text-2xl font-bold text-amber-700">{pendentes}</p>
          </div>
        </div>
      </Card>

      {/* Badge geral */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500 font-medium">Pedidos desta rota</span>
        <Badge variant="outline" className={cn(
          confirmados === total && total > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
          confirmados > 0 ? "bg-amber-50 text-amber-700 border-amber-200" :
          "bg-red-50 text-red-700 border-red-200"
        )}>
          {confirmados}/{total} confirmados
        </Badge>
      </div>

      {/* Lista de Pedidos (somente leitura) */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {pedidos.map((pedido) => {
          const cancelado = isCancelado(pedido.status);
          return (
            <Card key={pedido.id} className={cn(
              "p-4",
              cancelado ? "bg-slate-100 border-slate-200 opacity-60 grayscale" :
              pedido.confirmado_entrega ? "bg-emerald-50 border-emerald-200" :
              pedido.cliente_pendente ? "bg-amber-50 border-amber-200 opacity-80" :
              "bg-white"
            )}>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {cancelado ? <Ban className="w-6 h-6 text-slate-400" /> :
                   pedido.cliente_pendente ? <AlertTriangle className="w-6 h-6 text-amber-500" /> :
                   pedido.confirmado_entrega ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> :
                   <Circle className="w-6 h-6 text-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-mono text-sm font-semibold", cancelado && "line-through text-slate-500")}>
                      {pedido.numero_pedido}
                    </span>
                    {cancelado && <Badge variant="secondary" className="text-[10px] uppercase">Cancelado</Badge>}
                    {pedido.cliente_pendente && !cancelado && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs">Cliente pendente</Badge>}
                  </div>
                  <p className={cn("font-medium truncate", cancelado ? "text-slate-500" : "text-slate-700")}>
                    {pedido.cliente_nome}
                  </p>
                </div>
                <p className={cn("font-semibold text-sm", cancelado && "text-slate-400 line-through")}>
                  {formatCurrency(pedido.valor_pedido)}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Ações */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar às Rotas
        </Button>
        <Button variant="outline" onClick={gerarPDF} className="gap-2">
          <Printer className="w-4 h-4" /> Imprimir
        </Button>
      </div>
    </div>
  );
}