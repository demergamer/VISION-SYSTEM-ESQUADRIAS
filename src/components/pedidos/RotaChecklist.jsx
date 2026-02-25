import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Truck, CheckCircle2, Circle, Save, X, AlertTriangle, Printer, XCircle, Edit2, Ban } from "lucide-react";
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
  // Proteção: Garante que pedidos seja um array
  const [pedidosState, setPedidosState] = useState(
    (pedidos || []).map(p => ({ ...p, confirmado_entrega: p.confirmado_entrega || false }))
  );
  
  // Proteção: Garante que rota não seja null/undefined
  const [motoristaEdit, setMotoristaEdit] = useState({
    codigo: rota?.motorista_codigo || '',
    nome: rota?.motorista_nome || ''
  });
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [rotaNome, setRotaNome] = useState(rota?.codigo_rota || '');

  // Busca os motoristas cadastrados no banco
  const { data: motoristas = [] } = useQuery({
    queryKey: ['motoristas_rota'],
    queryFn: () => base44.entities.Motorista.list()
  });

  // Efeito para auto-preencher o nome do motorista caso a rota já tenha o código
  useEffect(() => {
    if (motoristas.length > 0 && rota?.motorista_codigo && !motoristaEdit.nome) {
      const mot = motoristas.find(m => 
        String(m.codigo) === String(rota.motorista_codigo) || 
        String(m.id) === String(rota.motorista_codigo)
      );
      if (mot) {
        setMotoristaEdit(prev => ({ ...prev, nome: mot.nome || mot.razao_social || mot.nome_completo || '' }));
      }
    }
  }, [motoristas, rota]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const safeFormatDate = (date) => {
    if (!date) return '-';
    try {
        return format(new Date(date), 'dd/MM/yyyy');
    } catch {
        return '-';
    }
  };

  // Função utilitária para verificar se está cancelado
  const isCancelado = (status) => status?.toLowerCase() === 'cancelado';

  // Lógica de Estatísticas (Ignorando Cancelados)
  const activePedidos = pedidosState.filter(p => !isCancelado(p.status));
  const confirmados = activePedidos.filter(p => p.confirmado_entrega).length;
  const total = activePedidos.length;
  const pendentes = total - confirmados;

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

    const pedidosConfirmados = activePedidos.filter(p => p.confirmado_entrega);
    const pedidosPendentes = activePedidos.filter(p => !p.confirmado_entrega);

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`PEDIDOS CONFIRMADOS (${pedidosConfirmados.length})`, 20, yPos);
    yPos += 7;

    if (pedidosConfirmados.length > 0) {
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
      pedidosConfirmados.forEach((p) => {
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
    doc.text(`PEDIDOS PENDENTES (${pedidosPendentes.length})`, 20, yPos);
    yPos += 7;

    if (pedidosPendentes.length > 0) {
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
      pedidosPendentes.forEach((p) => {
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
    const valorConfirmado = pedidosConfirmados.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
    const valorPendente = pedidosPendentes.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
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
    if (isCancelado(pedido.status)) return; // Bloqueia toggle se cancelado
    
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
    setPedidosState(prev => prev.map(p => {
      if (isCancelado(p.status) || p.cliente_pendente) return p; // Pula bloqueados
      return { ...p, confirmado_entrega: checked };
    }));
  };

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

    // MÁGICA 4: Só devolve os pedidos que NÃO estão cancelados para alteração de status
    const pedidosAtualizados = pedidosState.map(p => {
      if (isCancelado(p.status)) return null; 
      
      return {
        id: p.id,
        confirmado_entrega: p.confirmado_entrega,
        status: p.confirmado_entrega ? 'aberto' : 'aguardando'
      };
    }).filter(Boolean); // O filter remove os nulos da lista

    onSave({
      rota: rotaData,
      pedidos: pedidosAtualizados
    });
  };

  return (
    <div className="space-y-6">
      {/* Header da Rota */}
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

        {/* Seleção de Motorista Atualizada */}
        <div className="space-y-2 mb-4">
          <Label>Motorista Responsável</Label>
          <Select 
            value={motoristaEdit.codigo} 
            onValueChange={(val) => {
              const mot = motoristas.find(m => String(m.codigo) === val || String(m.id) === val);
              if (mot) {
                setMotoristaEdit({
                  codigo: val,
                  nome: mot.nome || mot.razao_social || mot.nome_completo || ''
                });
              }
            }}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Selecione um motorista cadastrado" />
            </SelectTrigger>
            <SelectContent>
              {motoristas.map((m) => (
                <SelectItem key={m.id} value={String(m.codigo || m.id)}>
                  {m.codigo ? `${m.codigo} - ` : ''} {m.nome || m.razao_social || m.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estatísticas (Ignorando Cancelados) */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-500">Total Válido</p>
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

      {/* Ações em lote */}
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

      {/* Lista de Pedidos */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {pedidosState.map((pedido) => {
          const cancelado = isCancelado(pedido.status);

          return (
          <Card 
            key={pedido.id}
            className={cn(
              "p-4 transition-all duration-200", 
              cancelado ? "bg-slate-100 border-slate-200 opacity-60 grayscale cursor-not-allowed" :
              pedido.confirmado_entrega ? "bg-emerald-50 border-emerald-200" : 
              pedido.cliente_pendente ? "bg-amber-50 border-amber-200 cursor-not-allowed opacity-80" : 
              "bg-white hover:bg-slate-50 cursor-pointer hover:shadow-sm"
            )}
            onClick={() => !cancelado && handleToggle(pedido)}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {cancelado ? <Ban className="w-6 h-6 text-slate-400" /> :
                 pedido.cliente_pendente ? <AlertTriangle className="w-6 h-6 text-amber-500" /> : 
                 pedido.confirmado_entrega ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : 
                 <Circle className="w-6 h-6 text-slate-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-mono text-sm", cancelado ? "line-through text-slate-500" : "font-semibold")}>
                    {pedido.numero_pedido}
                  </span>
                  {cancelado && <Badge variant="secondary" className="text-[10px] uppercase">Cancelado</Badge>}
                  {pedido.cliente_pendente && !cancelado && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs">Cliente pendente</Badge>}
                </div>
                <p className={cn("font-medium truncate", cancelado ? "text-slate-500" : "text-slate-700")}>
                  {pedido.cliente_nome}
                </p>
              </div>
              <div className="text-right flex items-center gap-2">
                <p className={cn("font-semibold", cancelado && "text-slate-400 line-through")}>
                  {formatCurrency(pedido.valor_pedido)}
                </p>
                {!pedido.confirmado_entrega && !cancelado && (
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); if (onCancelarPedido) onCancelarPedido(pedido); }}>
                    <XCircle className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )})}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={gerarPDFExpedicao} className="gap-2"><Printer className="w-4 h-4" /> Imprimir Expedição</Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" /> Salvar Rota</Button>
        </div>
      </div>
    </div>
  );
}