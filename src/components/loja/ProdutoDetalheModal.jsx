import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ShoppingCart, Play, Package, Plus, Minus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function FotoCarrossel({ fotos }) {
  const [idx, setIdx] = useState(0);
  if (!fotos.length) return (
    <div className="aspect-square bg-slate-100 rounded-2xl flex items-center justify-center">
      <Package className="w-20 h-20 text-slate-200" />
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden">
        <img src={fotos[idx]} alt="" className="w-full h-full object-cover" />
        {fotos.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + fotos.length) % fotos.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow hover:bg-white transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <button onClick={() => setIdx(i => (i + 1) % fotos.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow hover:bg-white transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
            <Badge className="absolute bottom-2 right-2 bg-black/50 text-white border-0 text-xs">{idx + 1}/{fotos.length}</Badge>
          </>
        )}
      </div>
      {fotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((f, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={cn("shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all", idx === i ? "border-blue-500 shadow-md" : "border-transparent opacity-60 hover:opacity-100")}>
              <img src={f} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SeletorOpcoes({ label, opcoes, selecionado, onChange, variacoesDisponiveis, campo }) {
  if (opcoes.filter(Boolean).length === 0) return null;
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{label}
        {selecionado && <span className="text-slate-700 font-normal normal-case ml-1">— {selecionado}</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {opcoes.filter(Boolean).map(op => {
          const disponivel = variacoesDisponiveis.some(v => v[campo] === op || (!v[campo] && op === 'N/A'));
          return (
            <button key={op}
              disabled={!disponivel}
              onClick={() => onChange(op === selecionado ? '' : op)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                selecionado === op ? "bg-blue-600 text-white border-blue-600 shadow" : "bg-white text-slate-700 border-slate-200 hover:border-blue-400",
                !disponivel && "opacity-30 cursor-not-allowed line-through"
              )}>
              {op}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ProdutoDetalheModal({ open, onClose, produto, tabelaPreco, onAddCarrinho }) {
  const [selTamanho, setSelTamanho] = useState('');
  const [selCor, setSelCor] = useState('');
  const [selLado, setSelLado] = useState('');
  const [quantidade, setQtd] = useState(1);

  const variacoes = produto?.variacoes || [];
  const fotos = produto?.fotos_urls?.filter(Boolean) || (produto?.foto_url ? [produto.foto_url] : []);

  // Opções únicas
  const tamanhos = useMemo(() => [...new Set(variacoes.map(v => v.tamanho).filter(Boolean))], [variacoes]);
  const cores = useMemo(() => [...new Set(variacoes.map(v => v.cor).filter(Boolean))], [variacoes]);
  const lados = useMemo(() => [...new Set(variacoes.map(v => v.lado).filter(Boolean))], [variacoes]);
  const temLado = lados.length > 0;

  // Variações disponíveis conforme seleção atual
  const variacoesDisponiveis = useMemo(() => variacoes.filter(v => {
    if (selTamanho && v.tamanho !== selTamanho) return false;
    if (selCor && v.cor !== selCor) return false;
    return true;
  }), [variacoes, selTamanho, selCor]);

  // Variação exata selecionada
  const variacaoExata = useMemo(() => {
    if (!selTamanho && tamanhos.length > 0) return null;
    if (!selCor && cores.length > 0) return null;
    if (!selLado && temLado) return null;
    return variacoes.find(v =>
      (!tamanhos.length || v.tamanho === selTamanho) &&
      (!cores.length || v.cor === selCor) &&
      (!temLado || v.lado === selLado || (!v.lado && selLado === 'N/A'))
    ) || null;
  }, [variacoes, selTamanho, selCor, selLado, tamanhos, cores, temLado]);

  const preco = variacaoExata ? (parseFloat(variacaoExata[tabelaPreco]) || 0) : null;

  const handleAdd = () => {
    if (!variacaoExata) { toast.error('Selecione uma combinação válida'); return; }
    const especificacoes = [selTamanho, selCor, selLado && selLado !== 'N/A' ? selLado : null].filter(Boolean).join(' · ');
    onAddCarrinho({
      produto_id: produto.id,
      id_variacao: variacaoExata.id_variacao,
      sku: variacaoExata.sku,
      nome_base: produto.nome_base || produto.nome,
      nome_completo: `${produto.nome_base || produto.nome}${especificacoes ? ' — ' + especificacoes : ''}`,
      tamanho: selTamanho,
      cor: selCor,
      lado: selLado,
      quantidade,
      preco_unitario: preco,
      tabela_aplicada: tabelaPreco
    });
    toast.success('Adicionado ao orçamento!');
    onClose();
  };

  if (!produto) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-y-auto p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

          {/* ── Lado Esquerdo: Fotos + Info ── */}
          <div className="p-6 border-r border-slate-100 space-y-5">
            <FotoCarrossel fotos={fotos} />

            {/* Vídeo */}
            {produto.video_url && (
              <div className="rounded-xl overflow-hidden border border-slate-100">
                <div className="bg-slate-50 px-3 py-2 flex items-center gap-2 border-b border-slate-100">
                  <Play className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Vídeo do produto</span>
                </div>
                <div className="aspect-video bg-black">
                  <iframe
                    src={produto.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                    className="w-full h-full"
                    allowFullScreen
                    title="Vídeo do produto"
                  />
                </div>
              </div>
            )}

            {/* Características */}
            {produto.caracteristicas?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Características</p>
                <div className="space-y-1">
                  {produto.caracteristicas.map((c, i) => (
                    <div key={i} className="flex gap-2 py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-500 w-32 shrink-0">{c.descricao}</span>
                      <span className="text-xs font-medium text-slate-700">{c.informacao}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Itens Inclusos */}
            {produto.itens_inclusos?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Itens Inclusos</p>
                <div className="space-y-1">
                  {produto.itens_inclusos.map((c, i) => (
                    <div key={i} className="flex gap-2 py-1.5 border-b border-slate-50 last:border-0">
                      <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-medium text-slate-700">{c.descricao}</span>
                        {c.informacao && <span className="text-xs text-slate-400 ml-1">— {c.informacao}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Lado Direito: Seleção + Compra ── */}
          <div className="p-6 flex flex-col gap-5">
            <div>
              {produto.linha_produto && produto.linha_produto !== '—' && (
                <p className="text-xs text-slate-400 mb-1">Linha <span className="font-medium text-slate-600">{produto.linha_produto}</span></p>
              )}
              <h2 className="text-2xl font-bold text-slate-800 leading-tight">{produto.nome_base || produto.nome}</h2>
              {produto.descricao && <p className="text-sm text-slate-500 mt-2 leading-relaxed">{produto.descricao}</p>}
            </div>

            {/* Seletores de variação */}
            {variacoes.length > 0 ? (
              <div className="space-y-4">
                <SeletorOpcoes label="Tamanho" opcoes={tamanhos} selecionado={selTamanho} onChange={setSelTamanho} variacoesDisponiveis={variacoes} campo="tamanho" />
                <SeletorOpcoes label="Cor / Acabamento" opcoes={cores} selecionado={selCor} onChange={setSelCor} variacoesDisponiveis={variacoesDisponiveis} campo="cor" />
                {temLado && <SeletorOpcoes label="Lado" opcoes={lados} selecionado={selLado} onChange={setSelLado} variacoesDisponiveis={variacoesDisponiveis} campo="lado" />}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Este produto não possui variações cadastradas.</p>
            )}

            {/* SKU + Preço */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
              {variacaoExata ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">SKU</span>
                    <span className="font-mono text-sm font-bold text-blue-700">{variacaoExata.sku || '—'}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <p className="text-xs text-slate-400 mb-1">Preço unitário</p>
                    <p className="text-3xl font-bold text-blue-700">{fmt(preco)}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-2">
                  {variacoes.length === 0 ? 'Sem variações' : 'Selecione as opções acima para ver o preço'}
                </p>
              )}
            </div>

            {/* Quantidade */}
            {variacaoExata && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Quantidade</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQtd(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                    <Minus className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="w-10 text-center font-bold text-slate-800 text-lg">{quantidade}</span>
                  <button onClick={() => setQtd(q => q + 1)}
                    className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                    <Plus className="w-4 h-4 text-slate-600" />
                  </button>
                  {preco > 0 && (
                    <span className="text-sm text-slate-500 ml-2">= <span className="font-bold text-slate-700">{fmt(preco * quantidade)}</span></span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-auto pt-4 border-t border-slate-100">
              <Button
                className="w-full h-12 text-base gap-2 bg-blue-600 hover:bg-blue-700"
                disabled={!variacaoExata || !preco}
                onClick={handleAdd}
              >
                <ShoppingCart className="w-5 h-5" />
                Adicionar ao Orçamento
              </Button>
              {!variacaoExata && variacoes.length > 0 && (
                <p className="text-xs text-center text-slate-400 mt-2">Selecione todas as opções para continuar</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}