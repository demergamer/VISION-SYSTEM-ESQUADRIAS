import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SelecionarListaPopup({ open, onClose, orcamentos, onSelecionar, onCriarNova }) {
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');

  const handleCriar = () => {
    const nome = novoNome.trim() || `Lista ${orcamentos.length + 1}`;
    const novaId = onCriarNova(nome);
    onSelecionar(novaId);
    setNovoNome('');
    setCriando(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setCriando(false); onClose(); } }}>
      <DialogContent className="max-w-sm p-0 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base">Em qual lista adicionar?</h3>
          <p className="text-xs text-slate-400 mt-0.5">Selecione uma lista ou crie uma nova.</p>
        </div>

        <div className="max-h-64 overflow-y-auto px-3 py-2 space-y-1">
          {orcamentos.length === 0 && !criando && (
            <p className="text-center text-xs text-slate-400 py-4">Nenhuma lista criada ainda.</p>
          )}
          {orcamentos.map(orc => (
            <button
              key={orc.id}
              onClick={() => onSelecionar(orc.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl text-left transition-colors group"
            >
              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-700 text-sm truncate">{orc.nome}</p>
                <p className="text-xs text-slate-400">{orc.itens.length} item(s)</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
            </button>
          ))}

          {criando && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <Input
                autoFocus
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCriar(); if (e.key === 'Escape') setCriando(false); }}
                placeholder="Nome da lista (Ex: Obra Praia)"
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCriar} className="bg-blue-600 hover:bg-blue-700 h-7 text-xs gap-1">
                  <Check className="w-3 h-3" /> Criar e adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCriando(false)} className="h-7 text-xs">Cancelar</Button>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-2">
          <Button
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={() => setCriando(true)}
          >
            <Plus className="w-4 h-4" /> Criar nova lista
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}