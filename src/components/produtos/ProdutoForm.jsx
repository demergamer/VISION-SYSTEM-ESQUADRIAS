import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, Loader2, Image as ImageIcon, Plus, Trash2, Upload, Package, Settings2, Link, ListChecks, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import GerenciarLinhasModal from "./GerenciarLinhasModal";

const CATEGORIAS = ["Porta", "Janela", "Servico", "Reembalar", "Acessorio"];
const CATEGORIA_LABELS = { Porta: "Porta", Janela: "Janela", Servico: "Serviço", Reembalar: "Reembalar", Acessorio: "Acessório" };

const genId = () => Math.random().toString(36).substring(2, 10);
const variacaoVazia = () => ({ id_variacao: genId(), sku: '', tamanho: '', lado: '', cor: '', preco_consumidor: '', preco_revenda: '', preco_construtora: '' });
const especVazia = () => ({ id: genId(), descricao: '', informacao: '' });

// ── Upload de Fotos ──────────────────────────────────
function FotosUpload({ fotos, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f })));
      onChange([...fotos, ...uploads.map(u => u.file_url)]);
      toast.success(`${files.length} foto(s) enviada(s)!`);
    } catch { toast.error('Erro ao enviar foto(s)'); }
    finally { setUploading(false); }
  }, [fotos, onChange]);

  return (
    <div className="space-y-3">
      {fotos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {fotos.map((url, i) => (
            <div key={i} className="relative group aspect-square">
              <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-slate-200" />
              <button type="button" onClick={() => onChange(fotos.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
              {i === 0 && <Badge className="absolute bottom-1 left-1 text-[9px] px-1 py-0 bg-blue-600">Capa</Badge>}
            </div>
          ))}
        </div>
      )}
      <label onDrop={handleFiles} onDragOver={e => e.preventDefault()}
        className={cn("flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed cursor-pointer transition-all",
          uploading ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30")}>
        {uploading
          ? <><Loader2 className="w-5 h-5 text-blue-500 animate-spin mb-1" /><p className="text-xs text-blue-600">Enviando...</p></>
          : <><Upload className="w-5 h-5 text-slate-400 mb-1" /><p className="text-xs font-medium text-slate-500">Arraste ou clique — múltiplas fotos</p></>}
        <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" disabled={uploading} />
      </label>
    </div>
  );
}

// ── Repeater genérico (Características / Itens Inclusos) ──
function EspecRepeater({ items, onChange, placeholder1 = "Descrição", placeholder2 = "Informação" }) {
  const add = () => onChange([...items, especVazia()]);
  const remove = (id) => onChange(items.filter(i => i.id !== id));
  const update = (id, field, val) => onChange(items.map(i => i.id === id ? { ...i, [field]: val } : i));

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex gap-2 items-center">
          <Input value={item.descricao} onChange={e => update(item.id, 'descricao', e.target.value)} placeholder={placeholder1} className="h-8 text-sm flex-1" />
          <Input value={item.informacao} onChange={e => update(item.id, 'informacao', e.target.value)} placeholder={placeholder2} className="h-8 text-sm flex-1" />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(item.id)} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5 text-xs h-8 mt-1">
        <Plus className="w-3 h-3" /> Adicionar Linha
      </Button>
    </div>
  );
}

// ── Linha de Variação ──
function VariacaoRow({ variacao, onChange, onRemove }) {
  const u = (f, v) => onChange({ ...variacao, [f]: v });
  return (
    <div className="grid grid-cols-12 gap-1.5 items-center p-2 bg-white rounded-lg border border-slate-100 hover:border-slate-200">
      <div className="col-span-1"><Input value={variacao.sku} onChange={e => u('sku', e.target.value)} placeholder="SKU" className="h-8 text-xs font-mono text-center" /></div>
      <div className="col-span-2"><Input value={variacao.tamanho} onChange={e => u('tamanho', e.target.value)} placeholder="2,10 x 0,70" className="h-8 text-xs" /></div>
      <div className="col-span-2">
        <Select value={variacao.lado || ''} onValueChange={v => u('lado', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Lado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="N/A">N/A</SelectItem>
            <SelectItem value="Direito">Direito</SelectItem>
            <SelectItem value="Esquerdo">Esquerdo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2"><Input value={variacao.cor} onChange={e => u('cor', e.target.value)} placeholder="Cor" className="h-8 text-xs" /></div>
      <div className="col-span-2">
        <div className="relative"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">R$</span>
          <Input type="number" step="0.01" min="0" value={variacao.preco_consumidor} onChange={e => u('preco_consumidor', e.target.value)} placeholder="0" className="h-8 text-xs pl-6" /></div>
      </div>
      <div className="col-span-1">
        <div className="relative"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">R$</span>
          <Input type="number" step="0.01" min="0" value={variacao.preco_revenda} onChange={e => u('preco_revenda', e.target.value)} placeholder="0" className="h-8 text-xs pl-6" /></div>
      </div>
      <div className="col-span-1">
        <div className="relative"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">R$</span>
          <Input type="number" step="0.01" min="0" value={variacao.preco_construtora} onChange={e => u('preco_construtora', e.target.value)} placeholder="0" className="h-8 text-xs pl-6" /></div>
      </div>
      <div className="col-span-1 flex justify-end">
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}

// ── FORM PRINCIPAL ──────────────────────────────────────
export default function ProdutoForm({ produto, onSave, onCancel, isLoading }) {
  const [showLinhasModal, setShowLinhasModal] = useState(false);

  const { data: linhas = [], refetch: refetchLinhas } = useQuery({
    queryKey: ['linhas_produto'],
    queryFn: () => base44.entities.LinhaProduto.list()
  });

  const [form, setForm] = useState({
    nome_base: produto?.nome_base || produto?.nome || '',
    categoria: produto?.categoria || '',
    linha_produto: produto?.linha_produto || '',
    descricao: produto?.descricao || '',
    video_url: produto?.video_url || '',
    fotos_urls: produto?.fotos_urls || (produto?.foto_url ? [produto.foto_url] : []),
    caracteristicas: (produto?.caracteristicas || []).map(c => ({ ...c, id: genId() })),
    itens_inclusos: (produto?.itens_inclusos || []).map(c => ({ ...c, id: genId() })),
    ativo: produto?.ativo !== undefined ? produto.ativo : true,
    variacoes: produto?.variacoes || []
  });

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nome_base.trim()) { toast.error('Informe o nome do produto'); return; }
    const clean = {
      ...form,
      nome: form.nome_base,
      caracteristicas: form.caracteristicas.map(({ id, ...rest }) => rest),
      itens_inclusos: form.itens_inclusos.map(({ id, ...rest }) => rest),
      variacoes: form.variacoes.map(v => ({
        ...v,
        preco_consumidor: parseFloat(v.preco_consumidor) || 0,
        preco_revenda: parseFloat(v.preco_revenda) || 0,
        preco_construtora: parseFloat(v.preco_construtora) || 0
      }))
    };
    onSave(clean);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Dados Gerais ── */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" /> Dados Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Nome Base *</Label>
              <Input value={form.nome_base} onChange={e => set('nome_base', e.target.value)} placeholder="Ex: Porta Social Pop" required />
            </div>

            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={form.categoria} onValueChange={v => set('categoria', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Linha do Produto</Label>
              <div className="flex gap-2">
                <Select value={form.linha_produto} onValueChange={v => set('linha_produto', v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione a linha..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="—">Sem linha</SelectItem>
                    {linhas.map(l => <SelectItem key={l.id} value={l.nome}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setShowLinhasModal(true)} title="Gerenciar Linhas" className="shrink-0">
                  <Settings2 className="w-4 h-4 text-slate-500" />
                </Button>
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <Label className="flex items-center gap-1.5"><Link className="w-3.5 h-3.5 text-slate-400" /> Vídeo (URL)</Label>
              <Input value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://youtube.com/..." />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={3} placeholder="Detalhes do produto..." />
            </div>

            <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div><p className="text-sm font-semibold text-slate-700">Produto Ativo</p><p className="text-xs text-slate-400">Visível no catálogo</p></div>
              <Switch checked={form.ativo} onCheckedChange={v => set('ativo', v)} />
            </div>
          </CardContent>
        </Card>

        {/* ── Fotos ── */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-500" /> Fotos do Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <FotosUpload fotos={form.fotos_urls} onChange={v => set('fotos_urls', v)} />
          </CardContent>
        </Card>

        {/* ── Especificações ── */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-green-500" /> Especificações
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Características</p>
              <EspecRepeater items={form.caracteristicas} onChange={v => set('caracteristicas', v)} placeholder1="Ex: Material" placeholder2="Ex: Alumínio" />
            </div>
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Itens Inclusos</p>
              <EspecRepeater items={form.itens_inclusos} onChange={v => set('itens_inclusos', v)} placeholder1="Ex: Fechadura" placeholder2="Ex: Acompanha 2 chaves" />
            </div>
          </CardContent>
        </Card>

        {/* ── Variações ── */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Box className="w-4 h-4 text-orange-500" /> Variações e Preços
              <Badge variant="outline" className="text-xs ml-1">{form.variacoes.length}</Badge>
            </CardTitle>
            <Button type="button" size="sm" onClick={() => set('variacoes', [...form.variacoes, variacaoVazia()])} className="gap-1.5 h-8 text-xs">
              <Plus className="w-3.5 h-3.5" /> Adicionar Variação
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {form.variacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-100 rounded-xl text-slate-400">
                <Box className="w-8 h-8 mb-2 text-slate-200" />
                <p className="text-sm">Nenhuma variação adicionada</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-1.5 px-2 pb-1">
                  {[['SKU',1],['Tamanho',2],['Lado',2],['Cor',2],['Consumidor',2],['Revenda',1],['Construtora',1],['',1]].map(([h,s],i) => (
                    <div key={i} className={`col-span-${s} text-[10px] font-bold text-slate-400 uppercase tracking-wide`}>{h}</div>
                  ))}
                </div>
                {form.variacoes.map(v => (
                  <VariacaoRow
                    key={v.id_variacao}
                    variacao={v}
                    onChange={updated => set('variacoes', form.variacoes.map(x => x.id_variacao === v.id_variacao ? updated : x))}
                    onRemove={() => set('variacoes', form.variacoes.filter(x => x.id_variacao !== v.id_variacao))}
                  />
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
          <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Produto
          </Button>
        </div>
      </form>

      <GerenciarLinhasModal open={showLinhasModal} onClose={() => { setShowLinhasModal(false); refetchLinhas(); }} />
    </>
  );
}