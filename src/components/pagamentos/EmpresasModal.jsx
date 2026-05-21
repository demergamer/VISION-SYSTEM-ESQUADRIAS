import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Building2, Plus, Edit, Archive, Loader2, Save, X, Search, Upload, CheckCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import { cn } from "@/lib/utils";

function gerarSigla(razaoSocial) {
  return razaoSocial
    .split(/\s+/)
    .filter(p => !['de', 'da', 'do', 'e', 'a', 'o', 'ltda', 'me', 's/a', 'sa'].includes(p.toLowerCase()))
    .map(p => p[0]?.toUpperCase())
    .filter(Boolean)
    .join('');
}

function UploadField({ label, url, onUpload, uploading }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <label className={cn(
        "flex items-center gap-2 h-10 px-3 rounded-lg border-2 border-dashed cursor-pointer transition-all text-xs",
        url ? "border-green-300 bg-green-50 text-green-700" : "border-slate-300 bg-white hover:border-blue-400"
      )}>
        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : url ? <CheckCircle className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
        <span className="truncate">{uploading ? 'Enviando...' : url ? 'Arquivo Anexado' : 'Clique para anexar'}</span>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-600 underline shrink-0" onClick={e => e.stopPropagation()}>Ver</a>}
        <input type="file" accept="image/*,.pdf" onChange={onUpload} className="hidden" disabled={uploading} />
      </label>
    </div>
  );
}

function EmpresaForm({ empresa, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(empresa ? {
    razao_social: empresa.razao_social || '', nome: empresa.nome || '', apelido: empresa.apelido || '',
    cnpj: empresa.cnpj || '', sigla: empresa.sigla || '', cnaes: empresa.cnaes || '',
    rua: empresa.rua || '', numero: empresa.numero || '', bairro: empresa.bairro || '',
    cidade: empresa.cidade || '', estado: empresa.estado || '', cep: empresa.cep || '',
    cartao_cnpj_url: empresa.cartao_cnpj_url || '', contrato_social_url: empresa.contrato_social_url || ''
  } : {
    razao_social: '', nome: '', apelido: '', cnpj: '', sigla: '', cnaes: '',
    rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '',
    cartao_cnpj_url: '', contrato_social_url: ''
  });
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [uploadingCartao, setUploadingCartao] = useState(false);
  const [uploadingContrato, setUploadingContrato] = useState(false);

  const buscarCnpj = async () => {
    const cnpj = form.cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) { toast.error('CNPJ inválido (14 dígitos)'); return; }
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = await res.json();
      if (data.razao_social) {
        setForm(f => ({
          ...f,
          razao_social: data.razao_social,
          nome: data.nome_fantasia || f.nome || data.razao_social,
          sigla: f.sigla || gerarSigla(data.razao_social),
          cnaes: data.cnae_fiscal_descricao || f.cnaes,
          rua: data.logradouro || f.rua,
          numero: data.numero || f.numero,
          bairro: data.bairro || f.bairro,
          cidade: data.municipio || f.cidade,
          estado: data.uf || f.estado,
          cep: data.cep?.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') || f.cep
        }));
        toast.success('Dados preenchidos via CNPJ!');
      } else {
        toast.error('CNPJ não encontrado na base');
      }
    } catch { toast.error('Erro ao buscar CNPJ'); }
    finally { setLoadingCnpj(false); }
  };

  const handleUpload = async (field, setLoading, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, [field]: file_url }));
      toast.success('Arquivo enviado!');
    } catch { toast.error('Erro ao enviar arquivo'); }
    finally { setLoading(false); e.target.value = ''; }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* CNPJ + Busca */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">CNPJ</Label>
          <div className="flex gap-2">
            <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" className="h-9" />
            <Button type="button" variant="outline" onClick={buscarCnpj} disabled={loadingCnpj} className="shrink-0 h-9 px-3">
              {loadingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sigla *</Label>
          <Input value={form.sigla} onChange={e => setForm(f => ({ ...f, sigla: e.target.value.toUpperCase() }))} placeholder="JCE" maxLength={6} className="h-9" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Razão Social *</Label>
          <Input value={form.razao_social} onChange={e => setForm(f => ({ ...f, razao_social: e.target.value, sigla: f.sigla || gerarSigla(e.target.value) }))} placeholder="J&C Esquadrias LTDA" className="h-9" required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nome Fantasia *</Label>
          <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="J&C Esquadrias" className="h-9" required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Apelido Interno</Label>
          <Input value={form.apelido} onChange={e => setForm(f => ({ ...f, apelido: e.target.value }))} placeholder="JC Principal" className="h-9" />
        </div>
      </div>

      {/* CNAEs — bloqueado para edição (preenchido via API) */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          CNAEs <Lock className="w-3 h-3 text-slate-400" />
          <span className="text-slate-400 font-normal">(preenchido automaticamente)</span>
        </Label>
        <Input value={form.cnaes} readOnly placeholder="Busque pelo CNPJ para preencher" className="h-9 bg-slate-50 cursor-not-allowed text-slate-500" />
      </div>

      {/* Endereço separado */}
      <div className="space-y-2 p-3 bg-slate-50 rounded-xl">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Endereço</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Rua / Logradouro</Label>
            <Input value={form.rua} onChange={e => setForm(f => ({ ...f, rua: e.target.value }))} placeholder="Rua das Flores" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Número</Label>
            <Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="123" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bairro</Label>
            <Input value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} placeholder="Centro" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cidade</Label>
            <Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="São Paulo" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">UF</Label>
              <Input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))} placeholder="SP" maxLength={2} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CEP</Label>
              <Input value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} placeholder="00000-000" className="h-9" />
            </div>
          </div>
        </div>
      </div>

      {/* Uploads */}
      <div className="grid grid-cols-2 gap-3">
        <UploadField
          label="📄 Cartão CNPJ"
          url={form.cartao_cnpj_url}
          uploading={uploadingCartao}
          onUpload={e => handleUpload('cartao_cnpj_url', setUploadingCartao, e)}
        />
        <UploadField
          label="📋 Contrato Social"
          url={form.contrato_social_url}
          uploading={uploadingContrato}
          onUpload={e => handleUpload('contrato_social_url', setUploadingContrato, e)}
        />
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}><X className="w-4 h-4 mr-2" />Cancelar</Button>
        <Button type="button" onClick={() => onSave(form)} disabled={isSaving || !form.razao_social || !form.nome}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {empresa ? 'Atualizar' : 'Criar Empresa'}
        </Button>
      </div>
    </div>
  );
}

export default function EmpresasModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => base44.entities.Empresa.list('codigo'),
    enabled: open
  });

  const gerarCodigo = async (sigla) => {
    const todas = await base44.entities.Empresa.list('-codigo', 1);
    let proximo = 1000;
    if (todas.length > 0) {
      const num = parseInt((todas[0].codigo || '').split('-')[0]);
      if (!isNaN(num)) proximo = num + 1;
    }
    return `${proximo}-${sigla || 'EMP'}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const codigo = await gerarCodigo(data.sigla);
      return base44.entities.Empresa.create({ ...data, codigo, arquivada: false });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['empresas'] }); setShowForm(false); toast.success('Empresa criada!'); },
    onError: () => toast.error('Erro ao criar empresa')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Empresa.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['empresas'] }); setEditando(null); setShowForm(false); toast.success('Empresa atualizada!'); },
    onError: () => toast.error('Erro ao atualizar')
  });

  const arquivarMutation = useMutation({
    mutationFn: ({ id, arquivada }) => base44.entities.Empresa.update(id, { arquivada }),
    onSuccess: (_, { arquivada }) => { queryClient.invalidateQueries({ queryKey: ['empresas'] }); toast.success(arquivada ? 'Empresa arquivada' : 'Empresa restaurada'); }
  });

  const handleSave = (data) => editando ? updateMutation.mutate({ id: editando.id, data }) : createMutation.mutate(data);
  const listaFiltrada = empresas.filter(e => mostrarArquivadas ? e.arquivada : !e.arquivada);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <ModalContainer open={open} onClose={onClose} title="Configurações de Empresas" description="Gerencie as empresas do grupo" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Switch checked={mostrarArquivadas} onCheckedChange={setMostrarArquivadas} id="arq-toggle" />
            <Label htmlFor="arq-toggle" className="cursor-pointer text-sm text-slate-600">Mostrar arquivadas</Label>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => { setEditando(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />Nova Empresa
            </Button>
          )}
        </div>

        {showForm && (
          <Card className="p-4 border-2 border-blue-200 bg-blue-50/20">
            <h3 className="font-semibold text-slate-800 mb-3">{editando ? `Editar: ${editando.nome}` : 'Nova Empresa'}</h3>
            <EmpresaForm empresa={editando} onSave={handleSave} onCancel={() => { setShowForm(false); setEditando(null); }} isSaving={isSaving} />
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : listaFiltrada.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p>{mostrarArquivadas ? 'Nenhuma empresa arquivada' : 'Nenhuma empresa cadastrada'}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {listaFiltrada.map(emp => (
              <Card key={emp.id} className={cn("p-4", emp.arquivada && "opacity-60 bg-slate-50")}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-sm">{emp.sigla?.slice(0, 3) || '?'}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{emp.nome}</p>
                        <Badge variant="outline" className="text-xs font-mono">{emp.codigo}</Badge>
                        {emp.arquivada && <Badge className="bg-slate-100 text-slate-500 text-xs">Arquivada</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{emp.razao_social}</p>
                      {emp.cnpj && <p className="text-xs text-slate-400">{emp.cnpj}</p>}
                      {(emp.rua || emp.cidade) && (
                        <p className="text-xs text-slate-400">{[emp.rua, emp.numero, emp.cidade, emp.estado].filter(Boolean).join(', ')}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        {emp.cartao_cnpj_url && <a href={emp.cartao_cnpj_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">📄 Cartão CNPJ</a>}
                        {emp.contrato_social_url && <a href={emp.contrato_social_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">📋 Contrato Social</a>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditando(emp); setShowForm(true); }}><Edit className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className={emp.arquivada ? "text-green-600" : "text-slate-500"} onClick={() => arquivarMutation.mutate({ id: emp.id, arquivada: !emp.arquivada })}><Archive className="w-3 h-3" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ModalContainer>
  );
}