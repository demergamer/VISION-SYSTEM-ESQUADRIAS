import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, Plus, Trash2, Package, ChevronRight, 
  ArrowLeft, X, FileText, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function ListaOrcamentosView({ orcamentos, onSelectOrcamento, onCreateOrcamento, onDeleteOrcamento }) {
  const [novoNome, setNovoNome] = useState('');
  const [criando, setCriando] = useState(false);

  const handleCreate = () => {
    const nome = novoNome.trim() || `Lista ${orcamentos.length + 1}`;
    onCreateOrcamento(nome);
    setNovoNome('');
    setCriando(false);
  };

  const totalItens = (orc) => orc.itens.reduce((a, i) => a + i.quantidade, 0);
  const totalValor = (orc) => orc.itens.reduce((a, i) => a + i.preco_unitario * i.quantidade, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {orcamentos.length === 0 && !criando ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-center">
            <FileText className="w-12 h-12 text-slate-200 mb-2" />
            <p className="text-sm font-medium">Nenhuma lista criada</p>
            <p className="text-xs text-slate-300 mt-1">Crie sua primeira lista de orçamento</p>
          </div>
        ) : orcamentos.map(orc => (
          <div key={orc.id}
            className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all cursor-pointer group"
            onClick={() => onSelectOrcamento(orc.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{orc.nome}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {totalItens(orc)} item(s) · {fmt(totalValor(orc))}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
            <button
              onClick={e => { e.stopPropagation(); if (confirm(`Remover "${orc.nome}"?`)) onDeleteOrcamento(orc.id); }}
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {criando && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-blue-700">Nome da nova lista</p>
            <Input
              autoFocus
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCriando(false); }}
              placeholder="Ex: Obra Praia, Reforma Casa..."
              className="h-8 text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs gap-1">
                <Check className="w-3 h-3" /> Criar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCriando(false)} className="h-8 text-xs">Cancelar</Button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        <Button
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          onClick={() => setCriando(true)}
        >
          <Plus className="w-4 h-4" /> Criar Nova Lista
        </Button>
      </div>
    </div>
  );
}

function DetalheOrcamentoView({ orcamento, onVoltar, onRemoveItem, onLimpar }) {
  const total = orcamento.itens.reduce((a, i) => a + i.preco_unitario * i.quantidade, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <button onClick={onVoltar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-slate-800 text-sm truncate">{orcamento.nome}</span>
        <Badge className="ml-auto bg-blue-100 text-blue-700 border-0 shrink-0">{orcamento.itens.length} item(s)</Badge>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
        {orcamento.itens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Package className="w-12 h-12 text-slate-200 mb-2" />
            <p className="text-sm">Lista vazia</p>
          </div>
        ) : orcamento.itens.map((item, idx) => (
          <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-800 truncate">{item.nome_completo}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">SKU: {item.sku}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {item.tamanho && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.tamanho}</Badge>}
                {item.cor && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.cor}</Badge>}
                {item.lado && item.lado !== 'N/A' && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.lado}</Badge>}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">Qtd: <span className="font-bold text-slate-700">{item.quantidade}</span></p>
                <p className="font-bold text-blue-700 text-sm">{fmt(item.preco_unitario * item.quantidade)}</p>
              </div>
            </div>
            <button onClick={() => onRemoveItem(idx)} className="text-red-400 hover:text-red-600 self-start mt-0.5 p-1 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {orcamento.itens.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Total</span>
            <span className="text-xl font-bold text-blue-700">{fmt(total)}</span>
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
            <ShoppingCart className="w-4 h-4" /> Solicitar Orçamento
          </Button>
          <Button variant="outline" size="sm" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onLimpar}>
            Limpar lista
          </Button>
        </div>
      )}
    </div>
  );
}

export default function OrcamentosManager({ open, onClose, orcamentos, onCreateOrcamento, onDeleteOrcamento, onRemoveItem, onLimparOrcamento }) {
  const [orcamentoAtivoId, setOrcamentoAtivoId] = useState(null);
  const orcamentoAtivo = orcamentos.find(o => o.id === orcamentoAtivoId);

  const totalItensGeral = orcamentos.reduce((a, o) => a + o.itens.reduce((b, i) => b + i.quantidade, 0), 0);

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { setOrcamentoAtivoId(null); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b border-slate-100">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            {orcamentoAtivo ? orcamentoAtivo.nome : 'Meus Orçamentos'}
            {!orcamentoAtivo && totalItensGeral > 0 && (
              <Badge className="ml-1 bg-blue-100 text-blue-700 border-0">{totalItensGeral} item(s)</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {orcamentoAtivo ? (
          <DetalheOrcamentoView
            orcamento={orcamentoAtivo}
            onVoltar={() => setOrcamentoAtivoId(null)}
            onRemoveItem={(idx) => onRemoveItem(orcamentoAtivo.id, idx)}
            onLimpar={() => { onLimparOrcamento(orcamentoAtivo.id); setOrcamentoAtivoId(null); }}
          />
        ) : (
          <ListaOrcamentosView
            orcamentos={orcamentos}
            onSelectOrcamento={setOrcamentoAtivoId}
            onCreateOrcamento={onCreateOrcamento}
            onDeleteOrcamento={onDeleteOrcamento}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}