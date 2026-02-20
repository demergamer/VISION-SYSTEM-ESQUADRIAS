import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, Loader2, Image as ImageIcon, Plus, Trash2, Upload, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIAS = ["Portas", "Janelas", "Esquadrias", "Vidros", "Acessórios", "Ferragens", "Serviços", "Outros"];

const gerarIdVariacao = () => Math.random().toString(36).substring(2, 10);

const variacaoVazia = () => ({
  id_variacao: gerarIdVariacao(),
  sku: '',
  tamanho: '',
  lado: '',
  cor: '',
  preco_consumidor: '',
  preco_revenda: '',
  preco_construtora: ''
});

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

function FotosUpload({ fotos, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f })));
      onChange([...fotos, ...uploads.map(u => u.file_url)]);
      toast.success(`${files.length} foto(s) enviada(s)!`);
    } catch {
      toast.error('Erro ao enviar foto(s)');
    } finally {
      setUploading(false);
    }
  }, [fotos, onChange]);

  const removePhoto = (url) => onChange(fotos.filter(f => f !== url));

  return (
    <div className="space-y-3">
      {fotos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {fotos.map((url, i) => (
            <div key={i} className="relative group aspect-square">
              <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={() => removePhoto(url)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
              >
                <X className="w-3 h-3" />
              </button>
              {i === 0 && <Badge className="absolute bottom-1 left-1 text-[9px] px-1 py-0 bg-blue-600">Capa</Badge>}
            </div>
          ))}
        </div>
      )}
      <label
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all",
          uploading ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30"
        )}
      >
        {uploading ? (
          <><Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-1" /><p className="text-xs text-blue-600">Enviando...</p></>
        ) : (
          <><Upload className="w-6 h-6 text-slate-400 mb-1" /><p className="text-xs font-medium text-slate-500">Arraste ou clique para adicionar fotos</p><p className="text-[10px] text-slate-400">PNG, JPG — múltiplas</p></>
        )}
        <input type="file" accept="image/*" multiple onChange={handleDrop} className="hidden" disabled={uploading} />
      </label>
    </div>
  );
}

function VariacaoRow({ variacao, onChange, onRemove }) {
  const update = (field, value) => onChange({ ...variacao, [field]: value });

  return (
    <div className="grid grid-cols-12 gap-1.5 items-center p-2.5 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
      <div className="col-span-1">
        <Input value={variacao.sku} onChange={e => update('sku', e.target.value)} placeholder="SKU" className="h-8 text-xs text-center font-mono" />
      </div>
      <div className="col-span-2">
        <Input value={variacao.tamanho} onChange={e => update('tamanho', e.target.value)} placeholder="2,10 x 0,70" className="h-8 text-xs" />
      </div>
      <div className="col-span-1">
        <Select value={variacao.lado || ''} onValueChange={v => update('lado', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Lado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="N/A">N/A</SelectItem>
            <SelectItem value="Direito">Direito</SelectItem>
            <SelectItem value="Esquerdo">Esquerdo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Input value={variacao.cor} onChange={e => update('cor', e.target.value)} placeholder="Cor/Acabamento" className="h-8 text-xs" />
      </div>
      <div className="col-span-2">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
          <Input type="number" step="0.01" min="0" value={variacao.preco_consumidor} onChange={e => update('preco_consumidor', e.target.value)} placeholder="0,00" className="h-8 text-xs pl-7" />
        </div>
      </div>
      <div className="col-span-2">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
          <Input type="number" step="0.01" min="0" value={variacao.preco_revenda} onChange={e => update('preco_revenda', e.target.value)} placeholder="0,00" className="h-8 text-xs pl-7" />
        </div>
      </div>
      <div className="col-span-1">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
          <Input type="number" step="0.01" min="0" value={variacao.preco_construtora} onChange={e => update('preco_construtora', e.target.value)} placeholder="0,00" className="h-8 text-xs pl-7" />
        </div>
      </div>
      <div className="col-span-1 flex justify-end">
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function ProdutoForm({ produto, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    nome_base: produto?.nome_base || produto?.nome || '',
    categoria: produto?.categoria || 'Portas',
    descricao: produto?.descricao || '',
    fotos_urls: produto?.fotos_urls || (produto?.foto_url ? [produto.foto_url] : []),
    imposto_porcentagem: produto?.imposto_porcentagem ?? 0,
    ativo: produto?.ativo !== undefined ? produto.ativo : true,
    variacoes: produto?.variacoes || []
  });

  const addVariacao = () => setForm(prev => ({ ...prev, variacoes: [...prev.variacoes, variacaoVazia()] }));

  const updateVariacao = (id, updated) =>
    setForm(prev => ({ ...prev, variacoes: prev.variacoes.map(v => v.id_variacao === id ? updated : v) }));

  const removeVariacao = (id) =>
    setForm(prev => ({ ...prev, variacoes: prev.variacoes.filter(v => v.id_variacao !== id) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nome_base.trim()) { toast.error('Informe o nome do produto'); return; }
    // normalize numeric fields
    const variacoes = form.variacoes.map(v => ({
      ...v,
      preco_consumidor: parseFloat(v.preco_consumidor) || 0,
      preco_revenda: parseFloat(v.preco_revenda) || 0,
      preco_construtora: parseFloat(v.preco_construtora) || 0
    }));
    onSave({ ...form, variacoes, nome: form.nome_base });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── DADOS GERAIS ── */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" /> Dados Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Nome Base *</Label>
            <Input value={form.nome_base} onChange={e => setForm({ ...form, nome_base: e.target.value })} placeholder="Ex: Porta Social Pop" required />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Imposto / NF (%)</Label>
            <div className="relative">
              <Input type="number" min="0" max="100" step="0.01" value={form.imposto_porcentagem} onChange={e => setForm({ ...form, imposto_porcentagem: parseFloat(e.target.value) || 0 })} placeholder="0" className="pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={3} placeholder="Detalhes do produto..." />
          </div>
          <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-700">Produto Ativo</p>
              <p className="text-xs text-slate-400">Visível no catálogo</p>
            </div>
            <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />
          </div>
        </CardContent>
      </Card>

      {/* ── FOTOS ── */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-500" /> Fotos do Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <FotosUpload fotos={form.fotos_urls} onChange={v => setForm({ ...form, fotos_urls: v })} />
        </CardContent>
      </Card>

      {/* ── VARIAÇÕES ── */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Variações e Preços
            <Badge variant="outline" className="ml-2 text-xs">{form.variacoes.length}</Badge>
          </CardTitle>
          <Button type="button" size="sm" onClick={addVariacao} className="gap-1.5 h-8 text-xs">
            <Plus className="w-3.5 h-3.5" /> Adicionar Variação
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {form.variacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
              <Package className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-sm">Nenhuma variação adicionada</p>
              <p className="text-xs text-slate-300">Clique em "Adicionar Variação" para começar</p>
            </div>
          ) : (
            <>
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-1.5 px-2.5 pb-1">
                {['SKU', 'Tamanho', 'Lado', 'Cor', 'Consumidor', 'Revenda', 'Construtora', ''].map((h, i) => (
                  <div key={i} className={cn("text-[10px] font-bold text-slate-400 uppercase tracking-wide",
                    i === 0 ? 'col-span-1' : i === 1 ? 'col-span-2' : i === 2 ? 'col-span-1' : i === 3 ? 'col-span-2' : i === 4 ? 'col-span-2' : i === 5 ? 'col-span-2' : i === 6 ? 'col-span-1' : 'col-span-1'
                  )}>{h}</div>
                ))}
              </div>
              {form.variacoes.map(v => (
                <VariacaoRow
                  key={v.id_variacao}
                  variacao={v}
                  onChange={updated => updateVariacao(v.id_variacao, updated)}
                  onRemove={() => removeVariacao(v.id_variacao)}
                />
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" /> Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Produto
        </Button>
      </div>
    </form>
  );
}