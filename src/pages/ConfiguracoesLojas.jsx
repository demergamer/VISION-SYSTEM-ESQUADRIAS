import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Store, Plus, Save, Loader2, Trash2, Image, Upload, X, 
  Building2, Phone, FileText, Percent, Eye, EyeOff 
} from 'lucide-react';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SLUG_JC = 'loja-jc';
const LOGO_JC = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69679dca54bbc0458984498a/936ba5dbe_logo_JCEsquadrias.png';

// ---- Banner Manager ----
function BannerManager({ banners = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    onChange([...banners, ...urls]);
    setUploading(false);
    e.target.value = '';
  };

  const handleRemove = (idx) => onChange(banners.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {banners.map((url, i) => (
          <div key={i} className="relative group aspect-[5/2] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <img src={url} alt={`Banner ${i + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={() => handleRemove(i)}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {i + 1}
            </span>
          </div>
        ))}

        {/* Upload slot */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="aspect-[5/2] rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 transition-all text-slate-400 hover:text-blue-600"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Upload className="w-6 h-6" />
              <span className="text-xs font-medium">Adicionar Banner</span>
            </>
          )}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      {banners.length === 0 && (
        <p className="text-xs text-slate-400 italic">Sem banners cadastrados. Os banners padrão serão exibidos.</p>
      )}
    </div>
  );
}

// ---- Formulário de Loja ----
function LojaForm({ loja, onSave, onCancel }) {
  const [form, setForm] = useState({
    nome_loja: loja?.nome_loja || '',
    slug: loja?.slug || '',
    cnpj: loja?.cnpj || '',
    telefone_whatsapp: loja?.telefone_whatsapp || '',
    imposto_padrao: loja?.imposto_padrao ?? 0,
    banners_urls: loja?.banners_urls || [],
    logo_url: loja?.logo_url || '',
    ativa: loja?.ativa ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.nome_loja || !form.slug) { toast.error('Nome e Slug são obrigatórios'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Identidade */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5 text-blue-600" /> Identidade
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Nome da Loja *</label>
            <Input value={form.nome_loja} onChange={e => set('nome_loja', e.target.value)} placeholder="Ex: Loja J&C" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Slug (URL) *</label>
            <Input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="Ex: loja-jc" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">CNPJ</label>
            <Input value={form.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
              <Phone className="w-3 h-3 inline mr-1" /> Telefone / WhatsApp
            </label>
            <Input value={form.telefone_whatsapp} onChange={e => set('telefone_whatsapp', e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">URL da Logo</label>
            <div className="flex gap-2 items-center">
              <Input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://..." className="flex-1" />
              {form.logo_url && (
                <img src={form.logo_url} alt="logo" className="h-9 w-auto object-contain border rounded px-2" />
              )}
            </div>
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => set('ativa', !form.ativa)}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all",
                form.ativa ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-50 border-slate-200 text-slate-500"
              )}
            >
              {form.ativa ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {form.ativa ? 'Loja Ativa' : 'Loja Inativa'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Financeiro */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="w-5 h-5 text-blue-600" /> Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Imposto Padrão NFe (%)</label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.imposto_padrao}
                onChange={e => set('imposto_padrao', parseFloat(e.target.value) || 0)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">%</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Será aplicado automaticamente no checkout.</p>
          </div>
        </CardContent>
      </Card>

      {/* Banners */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="w-5 h-5 text-blue-600" /> Banners do Carrossel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BannerManager banners={form.banners_urls} onChange={v => set('banners_urls', v)} />
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        )}
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 min-w-32">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1.5" /> Salvar</>}
        </Button>
      </div>
    </div>
  );
}

// ---- Página Principal ----
export default function ConfiguracoesLojas() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const { data: lojas = [], isLoading } = useQuery({
    queryKey: ['configuracoes_lojas'],
    queryFn: () => base44.entities.ConfiguracoesLoja.list()
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id
      ? base44.entities.ConfiguracoesLoja.update(id, data)
      : base44.entities.ConfiguracoesLoja.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracoes_lojas'] });
      toast.success('Configurações salvas com sucesso!');
      setShowNew(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ConfiguracoesLoja.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracoes_lojas'] });
      setSelectedId(null);
      toast.success('Loja removida.');
    }
  });

  const selectedLoja = lojas.find(l => l.id === selectedId);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              <Store className="w-7 h-7 text-blue-600" /> Configurações de Lojas
            </h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie as frentes de venda do sistema Multi-Loja.</p>
          </div>
          <Button onClick={() => { setSelectedId(null); setShowNew(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="w-4 h-4" /> Nova Loja
          </Button>
        </div>

        <div className="flex gap-6">

          {/* Lista de lojas */}
          <aside className="w-64 shrink-0 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : lojas.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 text-center">
                <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Nenhuma loja cadastrada</p>
              </div>
            ) : lojas.map(loja => (
              <button
                key={loja.id}
                onClick={() => { setSelectedId(loja.id); setShowNew(false); }}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all",
                  selectedId === loja.id
                    ? "bg-blue-50 border-blue-200 shadow-sm"
                    : "bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/50"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {loja.logo_url ? (
                    <img src={loja.logo_url} alt="" className="h-6 w-auto object-contain" />
                  ) : (
                    <Store className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span className="font-semibold text-sm text-slate-800 truncate">{loja.nome_loja}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">/{loja.slug}</span>
                  <Badge className={cn("text-[10px] border-0 px-1.5 py-0", loja.ativa ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                    {loja.ativa ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </button>
            ))}
          </aside>

          {/* Formulário */}
          <div className="flex-1 min-w-0">
            {showNew ? (
              <div>
                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" /> Nova Loja
                </h2>
                <LojaForm
                  onSave={(data) => saveMutation.mutateAsync({ id: null, data })}
                  onCancel={() => setShowNew(false)}
                />
              </div>
            ) : selectedLoja ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <Store className="w-5 h-5 text-blue-600" /> {selectedLoja.nome_loja}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => { if (confirm('Remover esta loja?')) deleteMutation.mutate(selectedLoja.id); }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Remover
                  </Button>
                </div>
                <LojaForm
                  key={selectedLoja.id}
                  loja={selectedLoja}
                  onSave={(data) => saveMutation.mutateAsync({ id: selectedLoja.id, data })}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center py-24 text-center">
                <Store className="w-12 h-12 text-slate-200 mb-4" />
                <p className="font-semibold text-slate-400">Selecione uma loja para editar</p>
                <p className="text-xs text-slate-300 mt-1">ou clique em "Nova Loja" para criar</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}