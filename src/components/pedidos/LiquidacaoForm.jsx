import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DollarSign, CheckCircle, X } from "lucide-react";

export default function LiquidacaoForm({ pedido, onSave, onCancel, isLoading }) {
  const saldoAtual = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
  const [tipo, setTipo] = useState('total');
  const [valorPagamento, setValorPagamento] = useState(saldoAtual);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const novoTotalPago = (pedido.total_pago || 0) + valorPagamento;
    const novoSaldo = pedido.valor_pedido - novoTotalPago;
    
    const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const dataToSave = {
      total_pago: novoTotalPago,
      saldo_restante: novoSaldo,
      status: novoSaldo <= 0 ? 'pago' : 'parcial',
      data_pagamento: novoSaldo <= 0 ? new Date().toISOString().split('T')[0] : pedido.data_pagamento,
      mes_pagamento: novoSaldo <= 0 ? mesAtual : pedido.mes_pagamento
    };
    
    onSave(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resumo do Pedido */}
      <Card className="p-4 bg-slate-50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500">Pedido</p>
            <p className="font-semibold">{pedido.numero_pedido}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Cliente</p>
            <p className="font-semibold">{pedido.cliente_nome}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Valor Total</p>
            <p className="font-semibold text-lg">{formatCurrency(pedido.valor_pedido)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Já Pago</p>
            <p className="font-semibold text-lg text-emerald-600">{formatCurrency(pedido.total_pago)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-slate-500">Saldo Restante</p>
          <p className="font-bold text-2xl text-amber-600">{formatCurrency(saldoAtual)}</p>
        </div>
      </Card>

      {/* Tipo de Liquidação */}
      <div className="space-y-3">
        <Label>Tipo de Liquidação</Label>
        <RadioGroup value={tipo} onValueChange={(value) => {
          setTipo(value);
          if (value === 'total') {
            setValorPagamento(saldoAtual);
          }
        }}>
          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="total" id="total" />
            <Label htmlFor="total" className="flex-1 cursor-pointer">
              <span className="font-medium">Pagamento Total</span>
              <p className="text-sm text-slate-500">Quitar todo o saldo restante</p>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="parcial" id="parcial" />
            <Label htmlFor="parcial" className="flex-1 cursor-pointer">
              <span className="font-medium">Pagamento Parcial</span>
              <p className="text-sm text-slate-500">Informar valor específico</p>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Valor do Pagamento */}
      {tipo === 'parcial' && (
        <div className="space-y-2">
          <Label htmlFor="valorPagamento">Valor do Pagamento (R$)</Label>
          <Input
            id="valorPagamento"
            type="number"
            min="0.01"
            max={saldoAtual}
            step="0.01"
            value={valorPagamento}
            onChange={(e) => setValorPagamento(parseFloat(e.target.value) || 0)}
            required
          />
        </div>
      )}

      {/* Preview */}
      <Card className="p-4 bg-emerald-50 border-emerald-200">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span className="font-medium text-emerald-700">Após o pagamento:</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-emerald-600">Novo Total Pago</p>
            <p className="font-semibold text-emerald-700">
              {formatCurrency((pedido.total_pago || 0) + valorPagamento)}
            </p>
          </div>
          <div>
            <p className="text-emerald-600">Novo Saldo</p>
            <p className="font-semibold text-emerald-700">
              {formatCurrency(saldoAtual - valorPagamento)}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || valorPagamento <= 0} className="bg-emerald-600 hover:bg-emerald-700">
          <DollarSign className="w-4 h-4 mr-2" />
          Confirmar Pagamento
        </Button>
      </div>
    </form>
  );
}