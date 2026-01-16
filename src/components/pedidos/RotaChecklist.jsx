import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Truck, CheckCircle2, Circle, Save, X, AlertTriangle, Printer, XCircle, Edit2 } from "lucide-react";
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

export default function RotaChecklist({ 
  rota, 
  pedidos, 
  onSave, 
  onCancel,
  onCadastrarCliente,
  onCancelarPedido,
  isLoading 
}) {
  // Proteção contra lista vazia ou nula
  const [pedidosState, setPedidosState] = useState(
    (pedidos || []).map(p => ({ ...p, confirmado_entrega: p.confirmado_entrega || false }))
  );
  const [motoristaEdit, setMotoristaEdit] = useState({
    codigo: rota.motorista_codigo || '',
    nome: rota.motorista_nome || ''
  });
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [rotaNome, setRotaNome] = useState(rota.codigo_rota || '');

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const safeFormatDate = (date) => {
    if (!date) return '-';
    try {
        return format(new Date(date), 'dd/MM/yyyy');
    } catch {
        return '-';
    }
  };

  const gerarPDFExpedicao = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('RELATÓRIO DE EXPEDIÇÃO', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(11);
    doc.text(`Rota: ${rotaNome}`, 20, yPos);
    yPos += 6;
    doc.text(`Data: ${safeFormatDate(rota.data_importacao)}`, 20, yPos);
    yPos += 6;
    doc.text(`Motorista: ${motoristaEdit.nome || 'Não informado'} (${motoristaEdit.codigo || '-'})`, 20, yPos);
    yPos += 10;

    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    const confirmados = pedidosState.filter(p => p.confirmado_entrega);
    const pendentes = pedidosState.filter(p => !p.confirmado_entrega);

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`PEDIDOS CONFIRMADOS (${confirmados.length})`, 20, yPos);
    yPos += 7;

    if (confirmados.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Nº Pedido', 20, yPos);
      doc.text('Cliente', 60, yPos);
      doc.text('Valor', 160, yPos);
      yPos += 5;
      doc.setLineWidth(0.3);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 4;

      doc.setFont(undefined, 'normal');
      confirmados.forEach((p) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(p.numero_pedido || '-', 20, yPos);
        const clienteTruncado = (p.cliente_nome || '-').length > 35 
          ? (p.cliente_nome || '-').substring(0, 32) + '...' 
          : (p.cliente_nome || '-');
        doc.text(clienteTruncado, 60, yPos);
        doc.text(formatCurrency(p.valor_pedido), 160, yPos);
        yPos += 5;
      });
    } else {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text('Nenhum pedido confirmado', 20, yPos);
      yPos += 5;
    }

    yPos += 5;

    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`PEDIDOS PENDENTES (${pendentes.length})`, 20, yPos);
    yPos += 7;

    if (pendentes.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Nº Pedido', 20, yPos);
      doc.text('Cliente', 60, yPos);
      doc.text('Valor', 160, yPos);
      yPos += 5;
      doc.setLineWidth(0.3);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 4;

      doc.setFont(undefined, 'normal');
      pendentes.forEach((p) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(p.numero_pedido || '-', 20, yPos);
        const clienteTruncado = (p.cliente_nome || '-').length > 35 
          ? (p.cliente_nome || '-').substring(0, 32) + '...' 
          : (p.cliente_nome || '-');
        doc.text(clienteTruncado, 60, yPos);
        doc.text(formatCurrency(p.valor_pedido), 160, yPos);
        yPos += 5;
      });
    } else {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text('Nenhum pedido pendente', 20, yPos);
      yPos += 5;
    }

    yPos += 5;
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    const valorConfirmado = confirmados.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
    const valorPendente = pendentes.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
    doc.text(`Total Confirmado: ${formatCurrency(valorConfirmado)}`, 20, yPos);
    yPos += 6;
    doc.text(`Total Pendente: ${formatCurrency(valorPendente)}`, 20, yPos);
    yPos += 6;
    doc.text(`Total Geral: ${formatCurrency(valorConfirmado + valorPendente)}`, 20, yPos);

    yPos += 10;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 20, yPos);

    const nomeArquivo = `Expedicao_${rotaNome.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(nomeArquivo);
  };

  const handleToggle = (pedido) => {
    if (pedido.cliente_pendente) {
      if (onCadastrarCliente) onCadastrarCliente(pedido);
      else alert('Cliente não cadastrado.');
      return;
    }
    setPedidosState(prev => prev.map(p => 
      p.id === pedido.id ? { ...p, confirmado_entrega: !p.confirmado_entrega } : p
    ));
  };

  const handleToggleAll = (checked) => {
    setPedidosState(prev => prev.map(p => ({ ...p, confirmado_entrega: checked })));
  };

  const confirmados = pedidosState.filter(p => p.confirmado_entrega).length;
  const total = pedidosState.length;
  const pendentes = total - confirmados;

  const handleSave = async () => {
    let novoStatus = 'pendente';
    if (confirmados === total && total > 0) novoStatus = 'concluida';
    else if (confirmados > 0) novoStatus = 'parcial';

    if (rotaNome !== rota.codigo_rota) {
        try {
            for (const pedido of pedidos) {
                await base44.entities.Pedido.update(pedido.id, {
                    rota_entrega: rotaNome
                });
            }
        } catch (error) {
            console.error("Erro ao propagar nome da rota:", error);
        }
    }

    const rotaData = {
        id: rota.id,
        codigo_rota: rotaNome,
        motorista_codigo: motoristaEdit.codigo,
        motorista_nome: motoristaEdit.nome,
        pedidos_confirmados: confirmados,
        status: novoStatus
    };

    const pedidosAtualizados = pedidosState.map(p => ({
      id: p.id,
      confirmado_entrega: p.confirmado_entrega,
      status: p.confirmado_entrega ? 'aberto' : 'aguardando'
    }));

    onSave({
      rota: rotaData,
      pedidos: pedidosAtualizados
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-slate-50">
        <div className="flex items-center gap-3 mb-4">
          <Truck className="w-6 h-6 text-slate-600" />
          <div className="flex-1">
            {isEditingName ? (
                <div className="flex items-center gap-2">
                    <Input 
                        value={rotaNome} 
                        onChange={(e) => setRotaNome(e.target.value)} 
                        className="font-bold text-lg h-8 w-64 bg-white"
                        autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>OK</Button>
                </div>
            ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                    <h2 className="font-bold text-lg">{rotaNome}</h2>
                    <Edit2 className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            )}
            <p className="text-sm text-slate-500">
              Importada em {safeFormatDate(rota.data_importacao)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Código do Motorista</Label>
            <Input
              value={motoristaEdit.codigo}
              onChange={(e) => setMotoristaEdit({ ...motoristaEdit, codigo: e.target.value })}
              placeholder="Código"
            />
          </div>
          <div className="space-y-2">
            <Label>Nome do Motorista</Label>
            <Input
              value={motoristaEdit.nome}
              onChange={(e) => setMotoristaEdit({ ...motoristaEdit, nome: e.target.value })}
              placeholder="Nome"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-white rounded-lg">
            <p className="text-slate-500">Total</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <p className="text-emerald-600">Confirmados</p>
            <p className="text-2xl font-bold text-emerald-700">{confirmados}</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <p className="text-amber-600">Pendentes</p>
            <p className="text-2xl font-bold text-amber-700">{pendentes}</p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="selectAll"
            checked={confirmados === total && total > 0}
            onCheckedChange={handleToggleAll}
          />
          <Label htmlFor="selectAll" className="cursor-pointer">Marcar/Desmarcar todos</Label>
        </div>
        <Badge variant="outline" className={cn(confirmados === total && total > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : confirmados > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200")}>
          {confirmados}/{total} confirmados
        </Badge>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {pedidosState.map((pedido) => (
          <Card 
            key={pedido.id}
            className={cn("p-4 transition-all", pedido.confirmado_entrega ? "bg-emerald-50 border-emerald-200" : pedido.cliente_pendente ? "bg-amber-50 border-amber-200 cursor-not-allowed opacity-60" : "bg-white hover:bg-slate-50 cursor-pointer")}
            onClick={() => !pedido.cliente_pendente && handleToggle(pedido)}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {pedido.cliente_pendente ? <AlertTriangle className="w-6 h-6 text-amber-600" /> : pedido.confirmado_entrega ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <Circle className="w-6 h-6 text-slate-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{pedido.numero_pedido}</span>
                  {pedido.cliente_pendente && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs">Cliente pendente</Badge>}
                </div>
                <p className="font-medium truncate">{pedido.cliente_nome}</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <p className="font-semibold">{formatCurrency(pedido.valor_pedido)}</p>
                {!pedido.confirmado_entrega && (
                  <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); if (onCancelarPedido) onCancelarPedido(pedido); }}><XCircle className="w-5 h-5" /></Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={gerarPDFExpedicao} className="gap-2"><Printer className="w-4 h-4" /> Imprimir Expedição</Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading}><Save className="w-4 h-4 mr-2" /> Salvar Alterações</Button>
        </div>
      </div>
    </div>
  );
}