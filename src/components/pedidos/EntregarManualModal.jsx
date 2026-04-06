import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function EntregarManualModal({ pedido, rotas = [], onSave, onCancel, isLoading }) {
  const rotasAtivas = rotas.filter(r => r.status === 'pendente' || r.status === 'parcial');

  const [rotaSelecionadaId, setRotaSelecionadaId] = useState('');
  const [dataEntrega, setDataEntrega] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [valorPedido, setValorPedido] = useState(String(pedido?.valor_pedido || ''));
  const [isSaving, setIsSaving] = useState(false);

  const rotaSelecionada = rotasAtivas.find(r => r.id === rotaSelecionadaId);

  const valorPedidoNum = parseFloat(valorPedido) || 0;
  const totalPago = parseFloat(pedido?.total_pago) || 0;
  const jaPago = totalPago >= valorPedidoNum && valorPedidoNum > 0;

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const user = await base44.auth.me();

      let novoStatus = 'aberto';
      let borderoNumero = undefined;

      if (jaPago) {
        novoStatus = 'pago';

        // Cria Borderô automático para registrar a liquidação
        const todosBorderos = await base44.entities.Bordero.list();
        const proximoNumero = todosBorderos.length > 0
          ? Math.max(...todosBorderos.map(b => b.numero_bordero || 0)) + 1
          : 1;

        await base44.entities.Bordero.create({
          numero_bordero: proximoNumero,
          tipo_liquidacao: 'entrega_manual',
          cliente_codigo: pedido.cliente_codigo,
          cliente_nome: pedido.cliente_nome,
          pedidos_ids: [pedido.id],
          valor_total: totalPago,
          forma_pagamento: 'SINAL/PORT (pré-pago)',
          observacao: `Liquidação automática via Entrega Manual. Pedido #${pedido.numero_pedido}. Total pago: ${formatCurrency(totalPago)} / Valor pedido: ${formatCurrency(valorPedidoNum)}`,
          liquidado_por: user?.email || 'sistema',
        });

        borderoNumero = proximoNumero;
        toast.success(`✅ Pedido marcado como PAGO! Borderô #${proximoNumero} criado automaticamente.`, { duration: 5000 });
      }

      const payload = {
        status: novoStatus,
        confirmado_entrega: true,
        data_entrega: dataEntrega,
        data_entregue: dataEntrega,
        valor_pedido: valorPedidoNum,
        saldo_restante: jaPago ? 0 : Math.max(0, valorPedidoNum - totalPago),
        ...(borderoNumero ? { bordero_numero: borderoNumero, data_pagamento: dataEntrega } : {}),
      };

      if (rotaSelecionada) {
        payload.rota_importada_id = rotaSelecionada.id;
        payload.motorista_atual = rotaSelecionada.motorista_nome || '';
        payload.motorista_codigo = rotaSelecionada.motorista_codigo || '';
        payload.rota_entrega = rotaSelecionada.codigo_rota || '';
      }

      onSave(payload);
    } catch (e) {
      toast.error('Erro ao processar entrega: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const loading = isLoading || isSaving;

  return (
    <div className="space-y-5 p-1">
      {/* Resumo do pedido */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Pedido</p>
        <p className="font-bold text-slate-800 text-lg">#{pedido?.numero_pedido}</p>
        <p className="text-sm text-slate-600">{pedido?.cliente_nome}</p>
        <p className="text-xs text-slate-400 mt-1">Sinal pré-pago: <span className="font-medium text-slate-600">{formatCurrency(totalPago)}</span></p>
      </div>

      {/* Valor do Pedido */}
      <div className="space-y-2">
        <Label>Valor do Pedido (R$)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="pl-9"
            value={valorPedido}
            onChange={(e) => setValorPedido(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>

      {/* Alerta financeiro */}
      {valorPedidoNum > 0 && (
        <div className={`flex items-start gap-3 rounded-xl p-3 border text-sm ${
          jaPago
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          {jaPago
            ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
            : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          }
          <div>
            {jaPago ? (
              <>
                <p className="font-bold">Pedido já pago via sinal!</p>
                <p className="text-xs mt-0.5">O status será definido como <strong>Pago</strong> e um Borderô será gerado automaticamente.</p>
              </>
            ) : (
              <>
                <p className="font-bold">Saldo a receber: {formatCurrency(valorPedidoNum - totalPago)}</p>
                <p className="text-xs mt-0.5">O pedido irá para status <strong>Aberto</strong> aguardando liquidação.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rota */}
      <div className="space-y-2">
        <Label>Rota de Entrega <span className="text-slate-400 font-normal">(opcional)</span></Label>
        <Select value={rotaSelecionadaId} onValueChange={setRotaSelecionadaId}>
          <SelectTrigger>
            <SelectValue placeholder="Sem rota / Retira" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Sem rota / Retira</SelectItem>
            {rotasAtivas.map(r => (
              <SelectItem key={r.id} value={r.id}>
                {r.codigo_rota} — {r.motorista_nome || 'Sem motorista'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {rotaSelecionada && (
          <p className="text-xs text-slate-500 pl-1">
            Motorista: <span className="font-medium text-slate-700">{rotaSelecionada.motorista_nome || '—'}</span>
          </p>
        )}
      </div>

      {/* Data */}
      <div className="space-y-2">
        <Label>Data de Entrega</Label>
        <Input
          type="date"
          value={dataEntrega}
          onChange={(e) => setDataEntrega(e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSave}
          disabled={loading || !dataEntrega || !valorPedidoNum}
        >
          <Truck className="w-4 h-4 mr-2" />
          {loading ? 'Salvando...' : 'Confirmar Entrega'}
        </Button>
      </div>
    </div>
  );
}