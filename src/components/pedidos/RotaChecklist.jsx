import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  CheckCircle2, 
  Circle,
  Save,
  X,
  AlertTriangle,
  Printer,
  XCircle
} from "lucide-react";
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
  const [pedidosState, setPedidosState] = useState(
    pedidos.map(p => ({ ...p, confirmado_entrega: p.confirmado_entrega || false }))
  );
  const [motoristaEdit, setMotoristaEdit] = useState({
    codigo: rota.motorista_codigo || '',
    nome: rota.motorista_nome || ''
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const gerarPDFExpedicao = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Título
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('RELATÓRIO DE EXPEDIÇÃO', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Informações da Rota
    doc.setFontSize(11);
    doc.text(`Rota: ${rota.codigo_rota}`, 20, yPos);
    yPos += 6;
    doc.text(`Data: ${format(new Date(rota.data_importacao), 'dd/MM/yyyy')}`, 20, yPos);
    yPos += 6;
    doc.text(`Motorista: ${motoristaEdit.nome || 'Não informado'} (${motoristaEdit.codigo || '-'})`, 20, yPos);
    yPos += 10;

    // Separador
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Pedidos Confirmados
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

    // Pedidos Pendentes
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`PEDIDOS PENDENTES - COBRAR EXPEDIÇÃO (${pendentes.length})`, 20, yPos);
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

    // Totais
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

    // Rodapé
    yPos += 10;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 20, yPos);

    const nomeArquivo = `Expedicao_${rota.codigo_rota.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(nomeArquivo);
  };

  const handleToggle = (pedido) => {
    // Bloquear se cliente não cadastrado
    if (pedido.cliente_pendente) {
      if (onCadastrarCliente) {
        onCadastrarCliente(pedido);
      } else {
        alert('Cliente não cadastrado. Cadastre o cliente primeiro.');
      }
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

  const handleSave = () => {
    const pedidosAtualizados = pedidosState.map(p => ({
      id: p.id,
      confirmado_entrega: p.confirmado_entrega,
      status: p.confirmado_entrega ? 'aberto' : 'aguardando'
    }));

    let novoStatus = 'pendente';
    if (confirmados === total) {
      novoStatus = 'concluida';
    } else if (confirmados > 0) {
      novoStatus = 'parcial';
    }

    onSave({
      rota: {
        motorista_codigo: motoristaEdit.codigo,
        motorista_nome: motoristaEdit.nome,
        pedidos_confirmados: confirmados,
        status: novoStatus
      },
      pedidos: pedidosAtualizados
    });
  };

  return (
    <div className="space-y-6">
      {/* Header da Rota */}
      <Card className="p-4 bg-slate-50">
        <div className="flex items-center gap-3 mb-4">
          <Truck className="w-6 h-6 text-slate-600" />
          <div>
            <h2 className="font-bold text-lg">{rota.codigo_rota}</h2>
            <p className="text-sm text-slate-500">
              Importada em {new Date(rota.data_importacao).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Motorista */}
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

        {/* Estatísticas */}
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

      {/* Ações em lote */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="selectAll"
            checked={confirmados === total && total > 0}
            onCheckedChange={handleToggleAll}
          />
          <Label htmlFor="selectAll" className="cursor-pointer">
            Marcar/Desmarcar todos
          </Label>
        </div>
        <Badge variant="outline" className={cn(
          confirmados === total && total > 0
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : confirmados > 0
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-red-50 text-red-700 border-red-200"
        )}>
          {confirmados}/{total} confirmados
        </Badge>
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {pedidosState.map((pedido) => (
          <Card 
            key={pedido.id}
            className={cn(
              "p-4 transition-all",
              pedido.confirmado_entrega 
                ? "bg-emerald-50 border-emerald-200" 
                : pedido.cliente_pendente
                  ? "bg-amber-50 border-amber-200 cursor-not-allowed opacity-60"
                  : "bg-white hover:bg-slate-50 cursor-pointer"
            )}
            onClick={() => !pedido.cliente_pendente && handleToggle(pedido)}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {pedido.cliente_pendente ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                ) : pedido.confirmado_entrega ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{pedido.numero_pedido}</span>
                  {pedido.cliente_pendente && (
                    <Badge 
                      variant="outline" 
                      className="bg-amber-50 text-amber-600 border-amber-200 text-xs cursor-pointer hover:bg-amber-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCadastrarCliente) onCadastrarCliente(pedido);
                      }}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Cliente pendente - Clique para cadastrar
                    </Badge>
                  )}
                </div>
                <p className="font-medium truncate">{pedido.cliente_nome}</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <p className="font-semibold">{formatCurrency(pedido.valor_pedido)}</p>
                {!pedido.confirmado_entrega && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pedido.cliente_pendente) {
                        alert('Não é possível cancelar pedidos sem cliente cadastrado. Cadastre o cliente primeiro.');
                        return;
                      }
                      if (onCancelarPedido) onCancelarPedido(pedido);
                    }}
                  >
                    <XCircle className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={gerarPDFExpedicao} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir Expedição
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
}