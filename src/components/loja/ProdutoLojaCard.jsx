import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
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
      className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
      onClick={() => onClick(produto)}
    >
      {/* Imagem */}
      <div className="relative aspect-square bg-slate-50 overflow-hidden p-2">
        {fotos[0] ? (
          <img
            src={fotos[0]}
            alt={nome}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-14 h-14 text-slate-200" />
          </div>
        )}

        {/* Badge categoria */}
        {produto.categoria && (
          <Badge className={cn(
            "absolute top-2 left-2 text-[10px] border-0 font-semibold shadow-sm",
            CAT_COLORS[produto.categoria] || 'bg-slate-100 text-slate-600'
          )}>
            {CAT_LABELS[produto.categoria] || produto.categoria}
          </Badge>
        )}

        {/* Badge linha */}
        {produto.linha_produto && produto.linha_produto !== '—' && (
          <Badge className="absolute top-2 right-2 text-[10px] bg-white text-slate-700 border border-slate-200 font-medium shadow-sm">
            {produto.linha_produto}
          </Badge>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-3 flex flex-col flex-1 border-t border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 mb-3 flex-1">
          {nome}
        </h3>

        <div className="mt-auto space-y-2.5">
          {/* Preço */}
          {semCliente ? (
            <p className="text-xs text-slate-400 italic">Selecione um cliente para ver preços</p>
          ) : variacoes.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Sem variações</p>
          ) : menorPreco != null && menorPreco > 0 ? (
            <div>
              <p className="text-[10px] text-slate-400 font-medium">A partir de</p>
              <p className="text-2xl font-bold text-green-700 leading-tight">{fmt(menorPreco)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">em até 12x sem juros</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Preço não definido</p>
          )}

          {/* CTA */}
          <button
            className={cn(
              "w-full py-2 rounded-lg text-sm font-bold transition-all border",
              "border-blue-600 text-blue-700 hover:bg-blue-600 hover:text-white"
            )}
            onClick={e => { e.stopPropagation(); onClick(produto); }}
          >
            Ver Opções
          </button>
        </div>
      </div>
    </div>
  );
}