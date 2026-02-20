import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ChevronDown, ChevronUp, Package, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const CAT_COLORS = {
  Porta: 'bg-blue-100 text-blue-700',
  Janela: 'bg-cyan-100 text-cyan-700',
  Servico: 'bg-purple-100 text-purple-700',
  Reembalar: 'bg-amber-100 text-amber-700',
  Acessorio: 'bg-green-100 text-green-700'
};

const CAT_LABELS = { Porta: 'Porta', Janela: 'Janela', Servico: 'Serviço', Reembalar: 'Reembalar', Acessorio: 'Acessório' };

function VariacoesTable({ variacoes }) {
  if (!variacoes?.length) return <p className="text-xs text-slate-400 italic py-3 px-4">Nenhuma variação cadastrada.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-y border-slate-100">
            {['SKU', 'Tamanho', 'Lado', 'Cor', 'Consumidor', 'Revenda', 'Construtora'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-slate-400 uppercase tracking-wide text-[10px] whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variacoes.map((v, i) => (
            <tr key={v.id_variacao || i} className={cn("border-b border-slate-50 hover:bg-blue-50/20", i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
              <td className="px-3 py-2 font-mono font-bold text-blue-700">{v.sku || '—'}</td>
              <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{v.tamanho || '—'}</td>
              <td className="px-3 py-2">{v.lado && v.lado !== 'N/A' ? <Badge variant="outline" className="text-[10px] px-1.5 py-0">{v.lado}</Badge> : <span className="text-slate-300">—</span>}</td>
              <td className="px-3 py-2 text-slate-600">{v.cor || '—'}</td>
              <td className="px-3 py-2 text-right font-semibold text-slate-700 whitespace-nowrap">{fmt(v.preco_consumidor)}</td>
              <td className="px-3 py-2 text-right font-semibold text-emerald-700 whitespace-nowrap">{fmt(v.preco_revenda)}</td>
              <td className="px-3 py-2 text-right font-semibold text-purple-700 whitespace-nowrap">{fmt(v.preco_construtora)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProdutoCard({ produto, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const fotos = produto.fotos_urls?.length > 0 ? produto.fotos_urls : produto.foto_url ? [produto.foto_url] : [];
  const nome = produto.nome_base || produto.nome || 'Produto';
  const numVar = produto.variacoes?.length || 0;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {fotos.length > 0 ? (
        <div className="relative h-44 bg-slate-100">
          <img src={fotos[0]} alt={nome} className="w-full h-full object-cover" />
          {fotos.length > 1 && <Badge className="absolute bottom-2 right-2 text-xs gap-1 bg-black/60 border-0 text-white"><ImageIcon className="w-3 h-3" /> {fotos.length}</Badge>}
        </div>
      ) : (
        <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
          <Package className="w-14 h-14 text-slate-200" />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 truncate">{nome}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {produto.categoria && (
                <Badge className={cn("text-[10px] px-1.5 py-0 border-0", CAT_COLORS[produto.categoria] || 'bg-slate-100 text-slate-600')}>
                  {CAT_LABELS[produto.categoria] || produto.categoria}
                </Badge>
              )}
              {produto.linha_produto && produto.linha_produto !== '—' && (
                <span className="text-xs text-slate-400 font-medium">Linha: <span className="text-slate-600">{produto.linha_produto}</span></span>
              )}
            </div>
          </div>
          <Badge className={produto.ativo !== false ? 'bg-green-100 text-green-700 border-green-200 shrink-0' : 'bg-slate-100 text-slate-500 shrink-0'}>
            {produto.ativo !== false ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        <p className="text-xs text-slate-500">{numVar} variação(ões) / SKU(s)</p>

        <div className="flex gap-2 pt-1 border-t">
          <Button variant="ghost" size="sm" className="flex-1 text-slate-600 hover:bg-slate-50 text-xs gap-1" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Ocultar' : 'Ver Variações'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(produto)} className="gap-1 text-xs"><Edit className="w-3.5 h-3.5" /> Editar</Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(produto)} className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {expanded && <div className="border-t border-slate-100"><VariacoesTable variacoes={produto.variacoes} /></div>}
    </Card>
  );
}