import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, FileCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PortForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    cliente_id: '',
    pedidos_selecionados: [],
    valor_total_sinal: '',
    forma_pagamento: '',
    observacao: ''
  });
  const [comprovantes, setComprovantes] = useState([]);
  const [uploading, setUploading] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos-port', form.cliente_id],
    queryFn: () => base44.entities.Pedido.filter({ 
      cliente_codigo: clientes.find(c => c.id === form.cliente_id)?.codigo 
    }),
    enabled: !!form.cliente_id
  });

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

  const handleTogglePedido = (pedidoId) => {
    setForm(prev => ({
      ...prev,
      pedidos_selecionados: prev.pedidos_selecionados.includes(pedidoId)
        ? prev.pedidos_selecionados.filter(id => id !== pedidoId)
        : [...prev.pedidos_selecionados, pedidoId]
    }));
  };

  const handleSubmit = async () => {
    if (!form.cliente_id || form.pedidos_selecionados.length === 0 || !form.valor_total_sinal || !form.forma_pagamento || comprovantes.length === 0) {
      toast.error('Preencha todos os campos obrigatórios e anexe ao menos um comprovante');
      return;
    }

    const cliente = clientes.find(c => c.id === form.cliente_id);
    const pedidosSelecionados = pedidos.filter(p => form.pedidos_selecionados.includes(p.id));

    const portData = {
      cliente_id: form.cliente_id,
      cliente_codigo: cliente.codigo,
      cliente_nome: cliente.nome,
      pedidos_ids: form.pedidos_selecionados,
      pedidos_numeros: pedidosSelecionados.map(p => p.numero_pedido),
      valor_total_sinal: parseFloat(form.valor_total_sinal),
      saldo_disponivel: parseFloat(form.valor_total_sinal),
      forma_pagamento: form.forma_pagamento,
      comprovantes_urls: comprovantes,
      observacao: form.observacao,
      status: 'aguardando_separacao'
    };

    await onSave(portData);
  };

  const clienteSelecionado = clientes.find(c => c.id === form.cliente_id);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <Select value={form.cliente_id} onValueChange={(value) => setForm({ ...form, cliente_id: value, pedidos_selecionados: [] })}>
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
          <Label>Forma de Pagamento *</Label>
          <Select value={form.forma_pagamento} onValueChange={(value) => setForm({ ...form, forma_pagamento: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PIX">PIX</SelectItem>
              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
              <SelectItem value="Cartão">Cartão</SelectItem>
              <SelectItem value="Transferência">Transferência</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {form.cliente_id && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <Label className="mb-3 block font-semibold">Pedidos Vinculados * (Selecione ao menos um)</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pedidos.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum pedido encontrado para este cliente</p>
            ) : (
              pedidos.map(pedido => (
                <div key={pedido.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                  <Checkbox
                    checked={form.pedidos_selecionados.includes(pedido.id)}
                    onCheckedChange={() => handleTogglePedido(pedido.id)}
                  />
                  <div className="flex-1">
                    <span className="font-medium">#{pedido.numero_pedido}</span>
                    <span className="text-sm text-slate-500 ml-2">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valor_pedido)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      <div className="space-y-2">
        <Label>Valor do Sinal *</Label>
        <Input
          type="number"
          step="0.01"
          value={form.valor_total_sinal}
          onChange={(e) => setForm({ ...form, valor_total_sinal: e.target.value })}
          placeholder="0.00"
        />
      </div>

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