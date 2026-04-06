import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck } from "lucide-react";
import { format } from "date-fns";

export default function EntregarManualModal({ pedido, rotas = [], onSave, onCancel, isLoading }) {
  const rotasAtivas = rotas.filter(r => r.status === 'pendente' || r.status === 'parcial');
  
  const [rotaSelecionadaId, setRotaSelecionadaId] = useState('');
  const [dataEntrega, setDataEntrega] = useState(format(new Date(), 'yyyy-MM-dd'));

  const rotaSelecionada = rotasAtivas.find(r => r.id === rotaSelecionadaId);

  const handleSave = () => {
    const novoStatus = (pedido.saldo_restante <= 0 || pedido.status === 'pago') ? 'pago' : 'aberto';
    const payload = {
      status: novoStatus,
      confirmado_entrega: true,
      data_entrega: dataEntrega,
      data_entregue: dataEntrega,
    };
    if (rotaSelecionada) {
      payload.rota_importada_id = rotaSelecionada.id;
      payload.motorista_atual = rotaSelecionada.motorista_nome || '';
      payload.motorista_codigo = rotaSelecionada.motorista_codigo || '';
      payload.rota_entrega = rotaSelecionada.codigo_rota || '';
    }
    onSave(payload);
  };

  return (
    <div className="space-y-5 p-1">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Pedido</p>
        <p className="font-bold text-slate-800 text-lg">#{pedido?.numero_pedido}</p>
        <p className="text-sm text-slate-600">{pedido?.cliente_nome}</p>
      </div>

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

      <div className="space-y-2">
        <Label>Data de Entrega</Label>
        <Input
          type="date"
          value={dataEntrega}
          onChange={(e) => setDataEntrega(e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSave}
          disabled={isLoading || !dataEntrega}
        >
          <Truck className="w-4 h-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Confirmar Entrega'}
        </Button>
      </div>
    </div>
  );
}