import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CAT_COLORS = {
  Porta: 'bg-blue-100 text-blue-700',
  Janela: 'bg-cyan-100 text-cyan-700',
  Servico: 'bg-purple-100 text-purple-700',
  Reembalar: 'bg-amber-100 text-amber-700',
  Acessorio: 'bg-green-100 text-green-700'
};
const CAT_LABELS = { Porta: 'Porta', Janela: 'Janela', Servico: 'Serviço', Reembalar: 'Reembalar', Acessorio: 'Acessório' };

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function ProdutoLojaCard({ produto, tabelaPreco, clienteSelecionado, onClick }) {
  const fotos = produto.fotos_urls?.filter(Boolean) || (produto.foto_url ? [produto.foto_url] : []);
  const nome = produto.nome_base || produto.nome || 'Produto';
  const variacoes = produto.variacoes || [];

  const menorPreco = tabelaPreco && variacoes.length > 0
    ? (() => {
        const precos = variacoes.map(v => parseFloat(v[tabelaPreco]) || 0).filter(p => p > 0);
        return precos.length ? Math.min(...precos) : null;
      })()
    : null;

  const semCliente = !clienteSelecionado;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col",
        "transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer group"
      )}
      onClick={() => onClick(produto)}
    >
      {/* Imagem */}
      <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        {fotos[0] ? (
          <img
            src={fotos[0]}
            alt={nome}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-slate-200" />
          </div>
        )}

        {/* Badge categoria (overlay) */}
        {produto.categoria && (
          <Badge className={cn(
            "absolute top-2.5 left-2.5 text-[10px] border-0 shadow-sm font-semibold",
            CAT_COLORS[produto.categoria] || 'bg-slate-100 text-slate-600'
          )}>
            {CAT_LABELS[produto.categoria] || produto.categoria}
          </Badge>
        )}

        {/* Badge linha */}
        {produto.linha_produto && produto.linha_produto !== '—' && (
          <Badge className="absolute top-2.5 right-2.5 text-[10px] bg-white/90 text-slate-700 border-0 shadow-sm font-medium backdrop-blur-sm">
            {produto.linha_produto}
          </Badge>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mb-2 flex-1">
          {nome}
        </h3>

        {/* Preço */}
        <div className="mt-auto">
          {semCliente ? (
            <p className="text-xs text-slate-400 italic py-1">Selecione um cliente para ver preços</p>
          ) : variacoes.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-1">Sem variações cadastradas</p>
          ) : menorPreco != null && menorPreco > 0 ? (
            <div className="mb-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">A partir de</p>
              <p className="text-xl font-extrabold text-blue-700 leading-tight">{fmt(menorPreco)}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-1 mb-2">Preço não definido</p>
          )}

          {/* CTA */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-sm font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-400 gap-1.5 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all"
            onClick={e => { e.stopPropagation(); onClick(produto); }}
          >
            Ver opções
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}