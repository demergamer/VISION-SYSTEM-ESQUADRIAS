import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X } from "lucide-react";

export default function PedidoForm({ pedido, clientes = [], onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    cliente_codigo: '',
    cliente_nome: '',
    cliente_regiao: '',
    representante_codigo: '',
    representante_nome: '',
    data_entrega: '',
    numero_pedido: '',
    valor_pedido: 0,
    total_pago: 0,
    saldo_restante: 0,
    observacao: '',
    outras_informacoes: '',
    status: 'aberto',
    porcentagem_comissao: 5
  });

  useEffect(() => {
    if (pedido) {
      setForm({
        cliente_codigo: pedido.cliente_codigo || '',
        cliente_nome: pedido.cliente_nome || '',
        cliente_regiao: pedido.cliente_regiao || '',
        representante_codigo: pedido.representante_codigo || '',
        representante_nome: pedido.representante_nome || '',
        data_entrega: pedido.data_entrega || '',
        numero_pedido: pedido.numero_pedido || '',
        valor_pedido: pedido.valor_pedido || 0,
        total_pago: pedido.total_pago || 0,
        saldo_restante: pedido.saldo_restante || 0,
        observacao: pedido.observacao || '',
        outras_informacoes: pedido.outras_informacoes || '',
        status: pedido.status || 'aberto',
        porcentagem_comissao: pedido.porcentagem_comissao || 5
      });
    }
  }, [pedido]);

  const handleClienteChange = (codigo) => {
    const cli = clientes.find(c => c.codigo === codigo);
    if (cli) {
      setForm({
        ...form,
        cliente_codigo: codigo,
        cliente_nome: cli.nome,
        cliente_regiao: cli.regiao || '',
        representante_codigo: cli.representante_codigo || '',
        representante_nome: cli.representante_nome || '',
        porcentagem_comissao: cli.porcentagem_comissao || 5
      });
    }
  };

  const handleValorChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    if (field === 'valor_pedido' || field === 'total_pago') {
      newForm.saldo_restante = (newForm.valor_pedido || 0) - (newForm.total_pago || 0);
    }
    setForm(newForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...form,
      saldo_restante: form.valor_pedido - form.total_pago
    };
    onSave(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente *</Label>
          <Select
            value={form.cliente_codigo}
            onValueChange={handleClienteChange}
            disabled={!!pedido}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cli) => (
                <SelectItem key={cli.codigo} value={cli.codigo}>
                  {cli.codigo} - {cli.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="numero_pedido">Número do Pedido *</Label>
          <Input
            id="numero_pedido"
            value={form.numero_pedido}
            onChange={(e) => setForm({ ...form, numero_pedido: e.target.value })}
            placeholder="Ex: PED001"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="data_entrega">Data de Entrega *</Label>
          <Input
            id="data_entrega"
            type="date"
            value={form.data_entrega}
            onChange={(e) => setForm({ ...form, data_entrega: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="porcentagem_comissao">Comissão (%)</Label>
          <Input
            id="porcentagem_comissao"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.porcentagem_comissao}
            onChange={(e) => setForm({ ...form, porcentagem_comissao: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor_pedido">Valor do Pedido (R$) *</Label>
          <Input
            id="valor_pedido"
            type="number"
            min="0"
            step="0.01"
            value={form.valor_pedido}
            onChange={(e) => handleValorChange('valor_pedido', parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="total_pago">Total Pago (R$)</Label>
          <Input
            id="total_pago"
            type="number"
            min="0"
            step="0.01"
            value={form.total_pago}
            onChange={(e) => handleValorChange('total_pago', parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Saldo Restante</Label>
          <div className="p-3 bg-slate-100 rounded-lg font-semibold text-lg">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(form.saldo_restante)}
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="observacao">Observação</Label>
          <Textarea
            id="observacao"
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            placeholder="Observações sobre o pedido..."
            rows={3}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="outras_informacoes">Outras Informações</Label>
          <Textarea
            id="outras_informacoes"
            value={form.outras_informacoes}
            onChange={(e) => setForm({ ...form, outras_informacoes: e.target.value })}
            placeholder="Informações adicionais..."
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {pedido ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}