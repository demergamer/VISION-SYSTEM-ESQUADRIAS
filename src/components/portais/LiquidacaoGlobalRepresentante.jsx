import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign, Upload, X, FileText, Loader2, 
  CheckCircle, ArrowRight, ArrowLeft, Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function LiquidacaoGlobalRepresentante({ pedidos, onSuccess, onCancel }) {
  const [etapa, setEtapa] = useState(1); // 1: Seleção | 2: Pagamento
  const [pedidosSelecionados, setPedidosSelecionados] = useState([]);
  const [comprovantes, setComprovantes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Drag & Drop
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [valorPago, setValorPago] = useState('');
  const [observacao, setObservacao] = useState('');

  const totalSelecionado = useMemo(() => {
    return pedidosSelecionados.reduce((sum, id) => {
      const pedido = pedidos.find(p => p.id === id);
      return sum + (pedido?.saldo_restante || 0);
    }, 0);
  }, [pedidosSelecionados, pedidos]);

  const handleTogglePedido = (pedidoId) => {
    setPedidosSelecionados(prev => 
      prev.includes(pedidoId) 
        ? prev.filter(id => id !== pedidoId)
        : [...prev, pedidoId]
    );
  };

  const handleSelectAll = () => {
    if (pedidosSelecionados.length === pedidos.length) {
      setPedidosSelecionados([]);
    } else {
      setPedidosSelecionados(pedidos.map(p => p.id));
    }
  };

  const handleAvancar = () => {
    if (pedidosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }
    setEtapa(2);
  };

  const handleVoltar = () => {
    setEtapa(1);
  };

  // Upload de Arquivos
  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const filesArray = Array.from(files);

    try {
      const uploadPromises = filesArray.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await base44.integrations.Core.UploadFile({ file });
        return res.file_url;
      });

      const urls = await Promise.all(uploadPromises);
      setComprovantes(prev => [...prev, ...urls]);
      toast.success(`${urls.length} arquivo(s) enviado(s)`);
    } catch (error) {
      toast.error('Erro ao enviar arquivos');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (index) => {
    setComprovantes(prev => prev.filter((_, i) => i !== index));
  };

  // Drag & Drop Handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleSubmit = async () => {
    if (!valorPago || parseFloat(valorPago) <= 0) {
      toast.error('Informe o valor pago');
      return;
    }

    if (comprovantes.length === 0) {
      toast.error('Anexe pelo menos um comprovante');
      return;
    }

    setProcessing(true);

    try {
      const user = await base44.auth.me();
      const representante = (await base44.entities.Representante.list()).find(r => r.email === user.email);

      const pedidosSelecionadosData = pedidos.filter(p => pedidosSelecionados.includes(p.id));
      const totalOriginal = totalSelecionado;
      const valorInformado = parseFloat(valorPago);

      // Obter próximo número de solicitação
      const todasSolicitacoes = await base44.entities.LiquidacaoPendente.list();
      const proximoNumero = todasSolicitacoes.length > 0 
        ? Math.max(...todasSolicitacoes.map(s => s.numero_solicitacao || 0)) + 1 
        : 1;

      // Criar solicitação
      await base44.entities.LiquidacaoPendente.create({
        numero_solicitacao: proximoNumero,
        cliente_codigo: pedidosSelecionadosData[0].cliente_codigo,
        cliente_nome: pedidosSelecionadosData[0].cliente_nome,
        pedidos_ids: pedidosSelecionados,
        valor_total_original: totalOriginal,
        descontos_cascata: [],
        devolucao_valor: 0,
        comprovante_url: comprovantes[0],
        valor_final_proposto: valorInformado,
        status: 'pendente',
        solicitante_tipo: 'representante',
        observacao: `Forma: ${formaPagamento.toUpperCase()}. ${observacao}`
      });

      toast.success('Solicitação de liquidação enviada!');
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar solicitação');
    } finally {
      setProcessing(false);
    }
  };

  // ETAPA 1: SELEÇÃO DE PEDIDOS
  if (etapa === 1) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-bold text-blue-800 mb-1">Etapa 1: Selecione os Pedidos</h3>
          <p className="text-sm text-blue-600">Marque os pedidos que você está prestando contas agora.</p>
        </div>

        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSelectAll}
            className="h-9"
          >
            {pedidosSelecionados.length === pedidos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </Button>
          <div className="text-sm font-medium text-slate-600">
            {pedidosSelecionados.length} de {pedidos.length} selecionados
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0">
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead className="text-right">Saldo Aberto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map(pedido => (
                <TableRow 
                  key={pedido.id}
                  className={cn(
                    "cursor-pointer hover:bg-slate-50",
                    pedidosSelecionados.includes(pedido.id) && "bg-blue-50"
                  )}
                  onClick={() => handleTogglePedido(pedido.id)}
                >
                  <TableCell>
                    <Checkbox 
                      checked={pedidosSelecionados.includes(pedido.id)}
                      onCheckedChange={() => handleTogglePedido(pedido.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{pedido.cliente_nome}</TableCell>
                  <TableCell className="font-mono">#{pedido.numero_pedido}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">
                    {formatCurrency(pedido.saldo_restante)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
          <span className="font-bold text-slate-700">Total Selecionado:</span>
          <span className="text-2xl font-bold text-emerald-600">{formatCurrency(totalSelecionado)}</span>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAvancar}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={pedidosSelecionados.length === 0}
          >
            Avançar <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ETAPA 2: DADOS DO PAGAMENTO
  return (
    <div 
      className="space-y-6 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Overlay de Drag & Drop */}
      {isDragging && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-blue-600/20 backdrop-blur-md pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl p-10 border-4 border-dashed border-blue-500 flex flex-col items-center gap-4">
            <Upload className="w-16 h-16 text-blue-600 animate-bounce" />
            <p className="text-2xl font-bold text-slate-800">SOLTE OS COMPROVANTES AQUI</p>
            <p className="text-slate-500">Pode soltar múltiplos arquivos de uma vez</p>
          </div>
        </div>
      )}

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <h3 className="font-bold text-emerald-800 mb-1">Etapa 2: Dados do Pagamento</h3>
        <p className="text-sm text-emerald-600">Informe os detalhes da prestação de contas.</p>
      </div>

      {/* Resumo dos Pedidos */}
      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-500">Pedidos Selecionados</p>
            <p className="font-bold text-lg text-slate-800">{pedidosSelecionados.length} pedidos</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Total a Prestar Contas</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalSelecionado)}</p>
          </div>
        </div>
      </Card>

      {/* Forma de Pagamento */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Forma de Pagamento</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['pix', 'dinheiro', 'transferencia', 'cheque'].map(forma => (
            <Button
              key={forma}
              type="button"
              variant={formaPagamento === forma ? 'default' : 'outline'}
              onClick={() => setFormaPagamento(forma)}
              className={cn(
                "h-12 capitalize",
                formaPagamento === forma && "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {forma}
            </Button>
          ))}
        </div>
      </div>

      {/* Valor Pago */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Valor Total Pago *</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
          <Input
            type="number"
            step="0.01"
            value={valorPago}
            onChange={(e) => setValorPago(e.target.value)}
            placeholder="0,00"
            className="pl-12 h-12 text-lg font-semibold"
          />
        </div>
      </div>

      {/* Upload de Comprovantes */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-700">Comprovantes de Pagamento *</Label>
        
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 hover:bg-slate-100 transition-colors">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <Upload className="w-10 h-10 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-700">
                Arraste e solte os comprovantes aqui
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Ou clique para selecionar (múltiplos arquivos aceitos)
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button type="button" variant="outline" size="sm" className="cursor-pointer" asChild>
                <span>Selecionar Arquivos</span>
              </Button>
            </label>
          </div>
        </div>

        {/* Preview dos Arquivos */}
        {comprovantes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {comprovantes.map((url, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border-2 border-slate-200 bg-white">
                  <img src={url} alt={`Comprovante ${index + 1}`} className="w-full h-full object-cover" />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveFile(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Enviando arquivos...</span>
          </div>
        )}
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Observações</Label>
        <Textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Informações adicionais sobre o pagamento..."
          className="h-20 resize-none"
        />
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-between gap-3">
        <Button variant="outline" onClick={handleVoltar} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={processing || uploading || comprovantes.length === 0 || !valorPago}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Enviar Prestação
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}