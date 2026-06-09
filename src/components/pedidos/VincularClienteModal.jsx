import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Link2, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VincularClienteModal({ pedido, clientes = [], onVincular, onCadastrar, onCancel, isLoading }) {
  const [busca, setBusca] = useState(pedido?.cliente_nome || '');
  const [selecionado, setSelecionado] = useState(null);

  const clientesFiltrados = useMemo(() => {
    const lower = busca.trim().toLowerCase();
    if (!lower) return clientes.slice(0, 30);
    return clientes.filter(c =>
      c.nome?.toLowerCase().includes(lower) ||
      c.razao_social?.toLowerCase().includes(lower) ||
      c.codigo?.toLowerCase().includes(lower)
    ).slice(0, 30);
  }, [clientes, busca]);

  const handleVincular = () => {
    if (!selecionado) return;
    onVincular(selecionado);
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        <strong>Pedido #{pedido?.numero_pedido}</strong> — {pedido?.cliente_nome}
        <p className="text-xs mt-1 text-amber-600">Busque o cliente cadastrado e vincule ao pedido, ou cadastre um novo.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar cliente por nome ou código..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setSelecionado(null); }}
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
        {clientesFiltrados.length === 0 ? (
          <p className="py-6 text-center text-slate-500 text-sm">Nenhum cliente encontrado.</p>
        ) : (
          clientesFiltrados.map(c => (
            <button
              key={c.id}
              onClick={() => setSelecionado(c)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b last:border-b-0",
                selecionado?.id === c.id && "bg-blue-50 border-blue-200"
              )}
            >
              <div>
                <p className="font-medium text-sm text-slate-800">{c.nome}</p>
                <p className="text-xs text-slate-500">{c.razao_social || '-'} · Cód: {c.codigo}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.regiao && <Badge variant="outline" className="text-xs">{c.regiao}</Badge>}
                {selecionado?.id === c.id && <Badge className="bg-blue-600 text-white text-xs">Selecionado</Badge>}
              </div>
            </button>
          ))
        )}
      </div>

      {selecionado && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          ✔ Vincular a: <strong>{selecionado.nome}</strong> (Cód: {selecionado.codigo})
        </div>
      )}

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="outline" onClick={onCadastrar} className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-50">
          <UserPlus className="w-4 h-4" /> Cadastrar Novo
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleVincular} disabled={!selecionado || isLoading} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Link2 className="w-4 h-4" /> Vincular Cliente
          </Button>
        </div>
      </div>
    </div>
  );
}