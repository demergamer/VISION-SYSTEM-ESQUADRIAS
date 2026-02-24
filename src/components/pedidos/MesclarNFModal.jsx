import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, GitMerge, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function MesclarNFModal({ pedidos = [], onConfirmar, onCancel, isLoading }) {
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState([]);

  const clienteBloqueado = selecionados.length > 0
    ? pedidos.find(p => p.id === selecionados[0])?.cliente_codigo
    : null;

  const pedidosDisponiveis = useMemo(() => {
    return pedidos.filter(p =>
      p.status !== 'cancelado' && p.status !== 'pago'
    );
  }, [pedidos]);

  const pedidosFiltrados = useMemo(() => {
    if (!busca) return pedidosDisponiveis;
    const lower = busca.toLowerCase();
    return pedidosDisponiveis.filter(p =>
      p.numero_pedido?.toLowerCase().includes(lower) ||
      p.cliente_nome?.toLowerCase().includes(lower)
    );
  }, [pedidosDisponiveis, busca]);

  const toggleSelecionado = (pedido) => {
    if (selecionados.includes(pedido.id)) {
      setSelecionados(prev => prev.filter(id => id !== pedido.id));
      return;
    }
    // Regra de Ouro: só mesmo cliente
    if (clienteBloqueado && pedido.cliente_codigo !== clienteBloqueado) {
      toast.error('Só é possível mesclar pedidos do mesmo cliente!', {
        description: `Selecionado: ${pedidos.find(p => p.id === selecionados[0])?.cliente_nome}`
      });
      return;
    }
    setSelecionados(prev => [...prev, pedido.id]);
  };

  const pedidosSelecionados = pedidos.filter(p => selecionados.includes(p.id));
  const valorTotal = pedidosSelecionados.reduce((sum, p) => sum + (p.saldo_restante ?? p.valor_pedido ?? 0), 0);

  const handleConfirmar = () => {
    if (selecionados.length < 2) {
      toast.error('Selecione ao menos 2 pedidos para mesclar.');
      return;
    }
    onConfirmar(pedidosSelecionados, valorTotal);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Alerta de regra */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span><strong>Regra:</strong> Apenas pedidos do <strong>mesmo cliente</strong> podem ser mesclados. A NF resultante terá a soma dos saldos.</span>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nº pedido ou cliente..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de pedidos */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] pr-1">
        {pedidosFiltrados.map(pedido => {
          const isSelecionado = selecionados.includes(pedido.id);
          const isBloqueado = clienteBloqueado && pedido.cliente_codigo !== clienteBloqueado;

          return (
            <div
              key={pedido.id}
              onClick={() => !isBloqueado && toggleSelecionado(pedido)}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                isSelecionado
                  ? "bg-blue-50 border-blue-300 shadow-sm"
                  : isBloqueado
                  ? "bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed"
                  : "bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/30"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                  isSelecionado ? "bg-blue-600 border-blue-600" : "border-slate-300"
                )}>
                  {isSelecionado && <X className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">#{pedido.numero_pedido}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{pedido.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{pedido.cliente_nome}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600 text-sm">{formatCurrency(pedido.saldo_restante ?? pedido.valor_pedido)}</p>
                <p className="text-[10px] text-slate-400">saldo</p>
              </div>
            </div>
          );
        })}
        {pedidosFiltrados.length === 0 && (
          <p className="text-center text-slate-400 py-8">Nenhum pedido aberto encontrado.</p>
        )}
      </div>

      {/* Resumo */}
      {selecionados.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
          <p className="text-sm font-bold text-blue-800">{selecionados.length} pedido(s) selecionado(s)</p>
          <p className="text-xs text-blue-600">Cliente: {pedidosSelecionados[0]?.cliente_nome}</p>
          <p className="text-lg font-bold text-blue-700">NF Total: {formatCurrency(valorTotal)}</p>
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
        <Button
          onClick={handleConfirmar}
          disabled={isLoading || selecionados.length < 2}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <GitMerge className="w-4 h-4 mr-2" />}
          Gerar NF Mesclada
        </Button>
      </div>
    </div>
  );
}