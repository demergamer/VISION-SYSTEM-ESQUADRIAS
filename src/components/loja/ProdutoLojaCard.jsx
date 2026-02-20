import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Tag } from "lucide-react";
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
    ? Math.min(...variacoes.map(v => parseFloat(v[tabelaPreco]) || 0).filter(p => p > 0))
    : null;

  const semCliente = !clienteSelecionado;

  return (
    <Card
      className={cn("overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border border-slate-100", semCliente && "opacity-80")}
      onClick={() => !semCliente && onClick(produto)}
    >
      {/* Imagem */}
      <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
        {fotos[0] ? (
          <img src={fotos[0]} alt={nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-slate-200" />
          </div>
        )}
        {variacoes.length > 0 && (
          <Badge className="absolute top-2 right-2 text-[10px] bg-black/50 text-white border-0 backdrop-blur-sm">
            {variacoes.length} var.
          </Badge>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          {produto.categoria && (
            <Badge className={cn("text-[10px] border-0 shrink-0", CAT_COLORS[produto.categoria] || 'bg-slate-100 text-slate-600')}>
              {CAT_LABELS[produto.categoria] || produto.categoria}
            </Badge>
          )}
        </div>

        <h3 className="font-bold text-slate-800 leading-tight mb-1 line-clamp-2">{nome}</h3>

        {produto.linha_produto && produto.linha_produto !== '—' && (
          <p className="text-xs text-slate-400 mb-3">Linha <span className="text-slate-600 font-medium">{produto.linha_produto}</span></p>
        )}

        <div className="border-t border-slate-100 pt-3">
          {semCliente ? (
            <p className="text-xs text-slate-400 italic">Selecione um cliente para ver os preços</p>
          ) : variacoes.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Sem variações cadastradas</p>
          ) : menorPreco != null && menorPreco > 0 ? (
            <div>
              <p className="text-[10px] text-slate-400 mb-0.5">A partir de</p>
              <p className="text-xl font-bold text-blue-700">{fmt(menorPreco)}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Preço não definido</p>
          )}
        </div>

        {!semCliente && (
          <button className="mt-3 w-full text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
            <Tag className="w-3.5 h-3.5" /> Ver opções
          </button>
        )}
      </div>
    </Card>
  );
}