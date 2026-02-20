import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, ShoppingCart, Play, Package,
  Plus, Minus, Check, Truck, ChevronRight as Breadcrumb, X, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const CAT_LABELS = { Porta: "Portas", Janela: "Janelas", Servico: "Serviços", Reembalar: "Reembalar", Acessorio: "Acessórios" };

// ── Galeria Principal ──────────────────────────────────────────
function Galeria({ fotos, videoUrl }) {
  const [idx, setIdx] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);

  const allThumbs = [...fotos];

  useEffect(() => { setIdx(0); }, [fotos]);

  const isVideo = videoUrl && idx === allThumbs.length;

  const embedUrl = videoUrl
    ? videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/').replace('vimeo.com/', 'player.vimeo.com/video/')
    : null;

  return (
    <div className="space-y-4">
      {/* Imagem/Vídeo principal */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl overflow-hidden border border-slate-100 shadow-sm group">
        {fotos.length === 0 && !isVideo ? (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-24 h-24 text-slate-200" />
          </div>
        ) : isVideo ? (
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Vídeo do produto" />
        ) : (
          <>
            <img
              src={fotos[idx]}
              alt=""
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
            />
            {fotos.length > 1 && (
              <>
                <button
                  onClick={() => setIdx(i => Math.max(0, i - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100">
                  <ChevronLeft className="w-4 h-4 text-slate-700" />
                </button>
                <button
                  onClick={() => setIdx(i => Math.min(fotos.length - 1 + (videoUrl ? 1 : 0), i + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100">
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                </button>
              </>
            )}
          </>
        )}
        {/* Contador */}
        {(fotos.length + (videoUrl ? 1 : 0)) > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm font-medium">
            {isVideo ? '▶' : `${idx + 1}`}/{fotos.length + (videoUrl ? 1 : 0)}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {(fotos.length + (videoUrl ? 1 : 0)) > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((f, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={cn(
                "shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200",
                idx === i && !isVideo
                  ? "border-blue-500 shadow-md scale-105"
                  : "border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400"
              )}>
              <img src={f} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
          {videoUrl && (
            <button onClick={() => setIdx(allThumbs.length)}
              className={cn(
                "shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 relative bg-slate-800 flex items-center justify-center",
                isVideo ? "border-blue-500 shadow-md scale-105" : "border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-400"
              )}>
              <Play className="w-6 h-6 text-white fill-white" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chip de Variação ───────────────────────────────────────────
function VariacaoChip({ valor, selecionado, disponivel, onClick }) {
  return (
    <button
      disabled={!disponivel}
      onClick={onClick}
      className={cn(
        "relative px-3.5 py-2 rounded-xl border-2 text-sm font-semibold transition-all duration-150 select-none",
        selecionado
          ? "ring-2 ring-blue-600 ring-offset-1 border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40",
        !disponivel && "opacity-40 cursor-not-allowed line-through border-dashed hover:border-slate-200 hover:bg-white"
      )}
    >
      {valor}
      {selecionado && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center shadow">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

// ── Grupo de Seletores ─────────────────────────────────────────
function GrupoSeletor({ numero, label, opcoes, selecionado, onChange, variacoesDisponiveis, campo }) {
  if (!opcoes.filter(Boolean).length) return null;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{numero}</span>
        <p className="text-sm font-bold text-slate-700">{label}
          {selecionado && <span className="text-blue-600 font-semibold ml-1.5">{selecionado}</span>}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 pl-7">
        {opcoes.filter(Boolean).map(op => {
          const disponivel = variacoesDisponiveis.some(v => v[campo] === op);
          return (
            <VariacaoChip
              key={op}
              valor={op}
              selecionado={selecionado === op}
              disponivel={disponivel}
              onClick={() => onChange(op === selecionado ? '' : op)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Seção de Informações Técnicas ──────────────────────────────
function InfoTecnica({ produto }) {
  const temDescricao = !!produto.descricao;
  const temCaract = produto.caracteristicas?.length > 0;
  const temItens = produto.itens_inclusos?.length > 0;

  if (!temDescricao && !temCaract && !temItens) return null;

  return (
    <div className="border-t border-slate-100 mt-8 pt-8">
      <Tabs defaultValue={temDescricao ? "descricao" : temCaract ? "ficha" : "itens"}>
        <TabsList className="mb-6 h-10 bg-slate-100 p-1 rounded-xl">
          {temDescricao && <TabsTrigger value="descricao" className="rounded-lg text-sm font-medium">Descrição</TabsTrigger>}
          {temCaract && <TabsTrigger value="ficha" className="rounded-lg text-sm font-medium">Ficha Técnica</TabsTrigger>}
          {temItens && <TabsTrigger value="itens" className="rounded-lg text-sm font-medium">Itens Inclusos</TabsTrigger>}
        </TabsList>

        {temDescricao && (
          <TabsContent value="descricao">
            <p className="text-slate-600 leading-relaxed text-sm">{produto.descricao}</p>
          </TabsContent>
        )}

        {temCaract && (
          <TabsContent value="ficha">
            <div className="rounded-xl overflow-hidden border border-slate-100">
              {produto.caracteristicas.map((c, i) => (
                <div key={i} className={cn("grid grid-cols-2 gap-4 px-4 py-3 text-sm", i % 2 === 0 ? "bg-slate-50" : "bg-white")}>
                  <span className="text-slate-500 font-medium">{c.descricao}</span>
                  <span className="text-slate-800 font-semibold">{c.informacao}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {temItens && (
          <TabsContent value="itens">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {produto.itens_inclusos.map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.descricao}</p>
                    {c.informacao && <p className="text-xs text-slate-500 mt-0.5">{c.informacao}</p>}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ── Componente Principal ───────────────────────────────────────
export default function ProdutoDetalheModal({ open, onClose, produto, tabelaPreco, onAddCarrinho }) {
  const [selTamanho, setSelTamanho] = useState('');
  const [selCor, setSelCor] = useState('');
  const [selLado, setSelLado] = useState('');
  const [quantidade, setQtd] = useState(1);

  // Reset ao trocar produto
  useEffect(() => {
    setSelTamanho(''); setSelCor(''); setSelLado(''); setQtd(1);
  }, [produto?.id]);

  const variacoes = produto?.variacoes || [];
  const fotos = produto?.fotos_urls?.filter(Boolean) || (produto?.foto_url ? [produto.foto_url] : []);
  const nome = produto?.nome_base || produto?.nome || 'Produto';

  // Opções únicas
  const tamanhos = useMemo(() => [...new Set(variacoes.map(v => v.tamanho).filter(Boolean))], [variacoes]);
  const cores = useMemo(() => [...new Set(variacoes.map(v => v.cor).filter(Boolean))], [variacoes]);
  const lados = useMemo(() => [...new Set(variacoes.map(v => v.lado).filter(Boolean))], [variacoes]);
  const temLado = lados.length > 0;

  // Variações disponíveis dado o que foi selecionado
  const disponivelParaCor = useMemo(() =>
    variacoes.filter(v => !selTamanho || v.tamanho === selTamanho),
    [variacoes, selTamanho]);

  const disponivelParaLado = useMemo(() =>
    variacoes.filter(v =>
      (!selTamanho || v.tamanho === selTamanho) &&
      (!selCor || v.cor === selCor)
    ),
    [variacoes, selTamanho, selCor]);

  // Variação exata
  const variacaoExata = useMemo(() => {
    if (tamanhos.length > 0 && !selTamanho) return null;
    if (cores.length > 0 && !selCor) return null;
    if (temLado && !selLado) return null;
    return variacoes.find(v =>
      (!tamanhos.length || v.tamanho === selTamanho) &&
      (!cores.length || v.cor === selCor) &&
      (!temLado || v.lado === selLado)
    ) || null;
  }, [variacoes, selTamanho, selCor, selLado, tamanhos, cores, temLado]);

  // Preços
  const preco = variacaoExata ? (parseFloat(variacaoExata[tabelaPreco]) || 0) : null;
  const menorPreco = useMemo(() => {
    const ps = variacoes.map(v => parseFloat(v[tabelaPreco]) || 0).filter(p => p > 0);
    return ps.length ? Math.min(...ps) : null;
  }, [variacoes, tabelaPreco]);

  // Progresso de seleção
  const passosPendentes = [
    tamanhos.length > 0 && !selTamanho,
    cores.length > 0 && !selCor,
    temLado && !selLado,
  ].filter(Boolean).length;

  if (!produto) return null;

  const handleAdd = () => {
    if (!variacaoExata) { toast.error('Complete as seleções acima'); return; }
    const especificacoes = [selTamanho, selCor, selLado].filter(Boolean).join(' · ');
    onAddCarrinho({
      produto_id: produto.id,
      id_variacao: variacaoExata.id_variacao,
      sku: variacaoExata.sku,
      nome_base: nome,
      nome_completo: `${nome}${especificacoes ? ' — ' + especificacoes : ''}`,
      tamanho: selTamanho,
      cor: selCor,
      lado: selLado,
      quantidade,
      preco_unitario: preco,
      tabela_aplicada: tabelaPreco
    });
    toast.success('✓ Adicionado ao orçamento!');
    onClose();
  };

  let seletorNum = 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[94vh] overflow-y-auto p-0 rounded-2xl">

        {/* ── Botão Fechar custom ── */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 flex items-center justify-center hover:bg-slate-100 shadow transition-colors">
          <X className="w-4 h-4 text-slate-600" />
        </button>

        <div className="p-6 md:p-8">

          {/* ── Breadcrumb ── */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
            <span className="hover:text-blue-600 cursor-pointer transition-colors">Loja</span>
            <Breadcrumb className="w-3 h-3" />
            {produto.categoria && (
              <>
                <span className="hover:text-blue-600 cursor-pointer transition-colors">{CAT_LABELS[produto.categoria] || produto.categoria}</span>
                <Breadcrumb className="w-3 h-3" />
              </>
            )}
            {produto.linha_produto && produto.linha_produto !== '—' && (
              <>
                <span className="hover:text-blue-600 cursor-pointer transition-colors">Linha {produto.linha_produto}</span>
                <Breadcrumb className="w-3 h-3" />
              </>
            )}
            <span className="text-slate-600 font-medium truncate max-w-32">{nome}</span>
          </nav>

          {/* ── Grid 2 colunas ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">

            {/* ═══ LADO ESQUERDO — GALERIA ═══ */}
            <div className="space-y-5">
              <Galeria fotos={fotos} videoUrl={produto.video_url} />
            </div>

            {/* ═══ LADO DIREITO — BUY BOX ═══ */}
            <div className="flex flex-col gap-5">

              {/* Cabeçalho */}
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {produto.categoria && (
                    <Badge className="text-[10px] bg-slate-100 text-slate-600 border-0 font-medium">
                      {CAT_LABELS[produto.categoria] || produto.categoria}
                    </Badge>
                  )}
                  {produto.linha_produto && produto.linha_produto !== '—' && (
                    <Badge className="text-[10px] bg-blue-50 text-blue-600 border-0 font-medium">
                      Linha {produto.linha_produto}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-tight">{nome}</h1>
              </div>

              {/* Preço */}
              <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl px-5 py-4 border border-blue-100">
                {variacaoExata && preco ? (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5 font-medium uppercase tracking-wide">Preço unitário</p>
                    <p className="text-4xl font-extrabold text-blue-700 leading-none">{fmt(preco)}</p>
                    {quantidade > 1 && (
                      <p className="text-sm text-slate-500 mt-1.5">
                        {quantidade}x = <span className="font-bold text-blue-600">{fmt(preco * quantidade)}</span>
                      </p>
                    )}
                  </div>
                ) : menorPreco ? (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5 font-medium uppercase tracking-wide">A partir de</p>
                    <p className="text-4xl font-extrabold text-blue-700 leading-none">{fmt(menorPreco)}</p>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Selecione as opções para ver o preço exato
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Preço não disponível</p>
                )}

                {/* SKU */}
                {variacaoExata?.sku && (
                  <div className="mt-3 pt-3 border-t border-blue-100 flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">SKU</span>
                    <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">{variacaoExata.sku}</span>
                  </div>
                )}
              </div>

              {/* Seletores de Variação */}
              {variacoes.length > 0 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Personalize</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>

                  {tamanhos.length > 0 && (
                    <GrupoSeletor
                      numero={seletorNum++}
                      label="Medida"
                      opcoes={tamanhos}
                      selecionado={selTamanho}
                      onChange={setSelTamanho}
                      variacoesDisponiveis={variacoes}
                      campo="tamanho"
                    />
                  )}
                  {cores.length > 0 && (
                    <GrupoSeletor
                      numero={seletorNum++}
                      label="Cor / Acabamento"
                      opcoes={cores}
                      selecionado={selCor}
                      onChange={setSelCor}
                      variacoesDisponiveis={disponivelParaCor}
                      campo="cor"
                    />
                  )}
                  {temLado && (
                    <GrupoSeletor
                      numero={seletorNum++}
                      label="Lado de Abertura"
                      opcoes={lados}
                      selecionado={selLado}
                      onChange={setSelLado}
                      variacoesDisponiveis={disponivelParaLado}
                      campo="lado"
                    />
                  )}
                </div>
              )}

              {/* CTA — Quantidade + Botão */}
              <div className="space-y-3 mt-auto">
                <div className="flex items-center gap-3">
                  {/* Quantidade */}
                  <div className="flex items-center gap-0 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button onClick={() => setQtd(q => Math.max(1, q - 1))}
                      className="w-10 h-12 flex items-center justify-center hover:bg-slate-50 transition-colors border-r border-slate-200 text-slate-600">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-extrabold text-slate-800 text-lg select-none">{quantidade}</span>
                    <button onClick={() => setQtd(q => q + 1)}
                      className="w-10 h-12 flex items-center justify-center hover:bg-slate-50 transition-colors border-l border-slate-200 text-slate-600">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Botão Adicionar */}
                  <Button
                    className={cn(
                      "flex-1 h-12 text-base font-bold gap-2 rounded-xl shadow-sm transition-all",
                      variacaoExata && preco
                        ? "bg-green-600 hover:bg-green-700 text-white shadow-green-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                    disabled={variacoes.length > 0 && (!variacaoExata || !preco)}
                    onClick={handleAdd}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {variacaoExata ? 'Adicionar ao Orçamento' : 'Selecione as Opções'}
                  </Button>
                </div>

                {/* Aviso de seleção pendente */}
                {passosPendentes > 0 && variacoes.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">
                      {passosPendentes === 1 ? 'Falta 1 seleção' : `Faltam ${passosPendentes} seleções`} para continuar
                    </p>
                  </div>
                )}

                {/* Frete */}
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Truck className="w-5 h-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Frete e prazo de entrega</p>
                    <p className="text-[11px] text-slate-400">Calculados na aprovação do orçamento</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ── Informações Técnicas (largura total) ── */}
          <InfoTecnica produto={produto} />

        </div>
      </DialogContent>
    </Dialog>
  );
}