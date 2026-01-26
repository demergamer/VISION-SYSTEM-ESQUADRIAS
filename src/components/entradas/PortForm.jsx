import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Upload, X, FileCheck, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PortForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    cliente_id: '',
    data_entrada: new Date().toISOString().split('T')[0],
    observacao: ''
  });
  
  const [itensPedidos, setItensPedidos] = useState([
    { numero_pedido_manual: '', valor_alocado: '' }
  ]);

  const [formaPagamento, setFormaPagamento] = useState({
    tipo: 'Dinheiro',
    detalhes_cheque: { banco: '', numero_cheque: '', data_bom_para: '' },
    detalhes_cartao: { bandeira: '', parcelas: 1 },
    detalhes_pix: { id_transacao: '' }
  });

  const [comprovantes, setComprovantes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const adicionarLinha = () => {
    setItensPedidos([...itensPedidos, { numero_pedido_manual: '', valor_alocado: '' }]);
  };

  const removerLinha = (index) => {
    if (itensPedidos.length > 1) {
      setItensPedidos(itensPedidos.filter((_, i) => i !== index));
    }
  };

  const atualizarItem = (index, campo, valor) => {
    const novosItens = [...itensPedidos];
    novosItens[index][campo] = valor;
    setItensPedidos(novosItens);
  };

  const calcularTotal = () => {
    return itensPedidos.reduce((sum, item) => sum + (parseFloat(item.valor_alocado) || 0), 0);
  };

  const handleUploadComprovante = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploads = await Promise.all(
        files.map(file => base44.integrations.Core.UploadFile({ file }))
      );
      setComprovantes(prev => [...prev, ...uploads.map(u => u.file_url)]);
      toast.success(`${files.length} arquivo(s) enviado(s)`);
    } catch (error) {
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Validar tipos de arquivo
    const arquivosValidos = files.filter(file => {
      const tipo = file.type;
      return tipo.startsWith('image/') || tipo === 'application/pdf';
    });

    if (arquivosValidos.length === 0) {
      toast.error('Apenas imagens e PDFs são permitidos');
      return;
    }

    if (arquivosValidos.length !== files.length) {
      toast.warning(`${files.length - arquivosValidos.length} arquivo(s) ignorado(s) - formato inválido`);
    }

    setUploading(true);
    try {
      const uploads = await Promise.all(
        arquivosValidos.map(file => base44.integrations.Core.UploadFile({ file }))
      );
      setComprovantes(prev => [...prev, ...uploads.map(u => u.file_url)]);
      toast.success(`${arquivosValidos.length} arquivo(s) enviado(s)!`);
    } catch (error) {
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Validações
    if (!form.cliente_id) {
      toast.error('Selecione um cliente');
      return;
    }

    const itensValidos = itensPedidos.filter(i => i.numero_pedido_manual && i.valor_alocado);
    if (itensValidos.length === 0) {
      toast.error('Adicione ao menos um pedido com valor');
      return;
    }

    if (comprovantes.length === 0) {
      toast.error('Anexe ao menos um comprovante');
      return;
    }

    const cliente = clientes.find(c => c.id === form.cliente_id);
    const valorTotal = calcularTotal();

    // Buscar próximo número PORT
    const todosOsPorts = await base44.entities.Port.list();
    const proximoNumero = todosOsPorts.length > 0 ? Math.max(...todosOsPorts.map(p => p.numero_port || 0)) + 1 : 1001;

    const portData = {
      numero_port: proximoNumero,
      cliente_id: form.cliente_id,
      cliente_codigo: cliente.codigo,
      cliente_nome: cliente.nome,
      data_entrada: form.data_entrada,
      itens_port: itensValidos.map(item => ({
        numero_pedido_manual: item.numero_pedido_manual,
        valor_alocado: parseFloat(item.valor_alocado),
        pedido_real_id: null,
        vinculado: false
      })),
      valor_total_sinal: valorTotal,
      saldo_disponivel: valorTotal,
      forma_pagamento: formaPagamento,
      comprovantes_urls: comprovantes,
      observacao: form.observacao,
      status: 'aguardando_vinculo'
    };

    await onSave(portData);
  };

  return (
    <div 
      className="space-y-6 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Overlay de Drag & Drop Full Screen */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto bg-white/10 rounded-full flex items-center justify-center animate-pulse">
              <Upload className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white drop-shadow-lg">
              SOLTE O COMPROVANTE AQUI
            </h2>
            <p className="text-lg text-white/80">Imagens e PDFs são aceitos</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <Select value={form.cliente_id} onValueChange={(value) => setForm({ ...form, cliente_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.codigo} - {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Data da Entrada *</Label>
          <Input
            type="date"
            value={form.data_entrada}
            onChange={(e) => setForm({ ...form, data_entrada: e.target.value })}
          />
        </div>
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <Label className="font-semibold">Pedidos e Valores Alocados *</Label>
          <Button type="button" size="sm" onClick={adicionarLinha}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Pedido
          </Button>
        </div>
        
        <div className="space-y-3">
          {itensPedidos.map((item, index) => (
            <div key={index} className="flex items-end gap-3 p-3 bg-white rounded-lg border">
              <div className="flex-1 space-y-2">
                <Label className="text-xs">Nº Pedido</Label>
                <Input
                  placeholder="Ex: 5045"
                  value={item.numero_pedido_manual}
                  onChange={(e) => atualizarItem(index, 'numero_pedido_manual', e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs">Valor Alocado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={item.valor_alocado}
                  onChange={(e) => atualizarItem(index, 'valor_alocado', e.target.value)}
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removerLinha(index)}
                disabled={itensPedidos.length === 1}
                className="text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          
          <div className="flex justify-end pt-2 border-t">
            <div className="text-right">
              <p className="text-xs text-slate-500">Total do Sinal</p>
              <p className="text-xl font-bold text-emerald-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calcularTotal())}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <Label className="font-semibold">Forma de Pagamento *</Label>
        
        <div className="space-y-2">
          <Label className="text-sm">Tipo</Label>
          <Select 
            value={formaPagamento.tipo} 
            onValueChange={(value) => setFormaPagamento({ ...formaPagamento, tipo: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
              <SelectItem value="PIX">PIX</SelectItem>
              <SelectItem value="Cartão">Cartão</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
              <SelectItem value="Transferência">Transferência</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formaPagamento.tipo === 'Cheque' && (
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
            <p className="text-xs font-semibold text-slate-600">Detalhes do Cheque</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Banco</Label>
                <Input
                  placeholder="Ex: 001"
                  value={formaPagamento.detalhes_cheque.banco}
                  onChange={(e) => setFormaPagamento({
                    ...formaPagamento,
                    detalhes_cheque: { ...formaPagamento.detalhes_cheque, banco: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Nº Cheque</Label>
                <Input
                  placeholder="123456"
                  value={formaPagamento.detalhes_cheque.numero_cheque}
                  onChange={(e) => setFormaPagamento({
                    ...formaPagamento,
                    detalhes_cheque: { ...formaPagamento.detalhes_cheque, numero_cheque: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Bom Para</Label>
                <Input
                  type="date"
                  value={formaPagamento.detalhes_cheque.data_bom_para}
                  onChange={(e) => setFormaPagamento({
                    ...formaPagamento,
                    detalhes_cheque: { ...formaPagamento.detalhes_cheque, data_bom_para: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
        )}

        {formaPagamento.tipo === 'Cartão' && (
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
            <p className="text-xs font-semibold text-slate-600">Detalhes do Cartão</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Bandeira</Label>
                <Select
                  value={formaPagamento.detalhes_cartao.bandeira}
                  onValueChange={(value) => setFormaPagamento({
                    ...formaPagamento,
                    detalhes_cartao: { ...formaPagamento.detalhes_cartao, bandeira: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Visa">Visa</SelectItem>
                    <SelectItem value="Mastercard">Mastercard</SelectItem>
                    <SelectItem value="Elo">Elo</SelectItem>
                    <SelectItem value="Amex">American Express</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  max="18"
                  value={formaPagamento.detalhes_cartao.parcelas}
                  onChange={(e) => setFormaPagamento({
                    ...formaPagamento,
                    detalhes_cartao: { ...formaPagamento.detalhes_cartao, parcelas: parseInt(e.target.value) || 1 }
                  })}
                />
              </div>
            </div>
          </div>
        )}

        {formaPagamento.tipo === 'PIX' && (
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
            <div className="space-y-2">
              <Label className="text-xs">ID da Transação (Opcional)</Label>
              <Input
                placeholder="Ex: E12345678202401261230abcd"
                value={formaPagamento.detalhes_pix.id_transacao}
                onChange={(e) => setFormaPagamento({
                  ...formaPagamento,
                  detalhes_pix: { ...formaPagamento.detalhes_pix, id_transacao: e.target.value }
                })}
              />
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-2">
        <Label>Comprovantes de Pagamento *</Label>
        <div className="space-y-3">
          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleUploadComprovante}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <Upload className="w-5 h-5 text-slate-500" />
            )}
            <span className="text-sm text-slate-600">
              {uploading ? 'Enviando...' : 'Clique para anexar comprovantes'}
            </span>
          </label>

          {comprovantes.length > 0 && (
            <div className="space-y-2">
              {comprovantes.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-slate-700">Comprovante {idx + 1}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setComprovantes(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value })}
          placeholder="Informações adicionais..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>
          <FileCheck className="w-4 h-4 mr-2" />
          Criar PORT
        </Button>
      </div>
    </div>
  );
}