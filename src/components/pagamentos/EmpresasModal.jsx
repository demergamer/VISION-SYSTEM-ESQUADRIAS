import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Building2, Plus, Edit, Archive, Loader2, Save, X, Search } from "lucide-react";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import { cn } from "@/lib/utils";

const FORM_EMPTY = { razao_social: '', nome: '', cnpj: '', sigla: '', endereco: '', cnaes: '' };

function gerarSigla(razaoSocial) {
  return razaoSocial
    .split(/\s+/)
    .filter(p => !['de', 'da', 'do', 'e', 'a', 'o', 'ltda', 'me', 's/a', 'sa'].includes(p.toLowerCase()))
    .map(p => p[0]?.toUpperCase())
    .filter(Boolean)
    .join('');
}

function EmpresaForm({ empresa, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(empresa ? {
    razao_social: empresa.razao_social || '',
    nome: empresa.nome || '',
    cnpj: empresa.cnpj || '',
    sigla: empresa.sigla || '',
    endereco: empresa.endereco || '',
    cnaes: empresa.cnaes || ''
  } : FORM_EMPTY);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const buscarCnpj = async () => {
    const cnpj = form.cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) { toast.error('CNPJ inválido'); return; }
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = await res.json();
      if (data.razao_social) {
        const sigla = gerarSigla(data.razao_social);
        setForm(f => ({
          ...f,
          razao_social: data.razao_social || f.razao_social,
          nome: data.nome_fantasia || f.nome || data.razao_social,
          sigla: f.sigla || sigla,
          endereco: [data.logradouro, data.numero, data.bairro, data.municipio, data.uf].filter(Boolean).join(', '),
          cnaes: data.cnae_fiscal_descricao || f.cnaes
        }));
        toast.success('Dados preenchidos via CNPJ!');
      }
    } catch {
      toast.error('Erro ao buscar CNPJ');
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleRazaoChange = (val) => {
    setForm(f => ({ ...f, razao_social: val, sigla: f.sigla || gerarSigla(val) }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-2">
          <Label>CNPJ</Label>
          <div className="flex gap-2">
            <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
            <Button type="button" variant="outline" onClick={buscarCnpj} disabled={loadingCnpj} className="shrink-0">
              {loadingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Sigla *</Label>
          <Input value={form.sigla} onChange={e => setForm(f => ({ ...f, sigla: e.target.value.toUpperCase() }))} placeholder="JCE" maxLength={6} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Razão Social *</Label>
        <Input value={form.razao_social} onChange={e => handleRazaoChange(e.target.value)} placeholder="J&C Esquadrias LTDA" required />
      </div>

      <div className="space-y-2">
        <Label>Nome Fantasia / Apelido *</Label>
        <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="J&C Esquadrias" required />
      </div>

      <div className="space-y-2">
        <Label>Endereço</Label>
        <Input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, Número, Bairro, Cidade - UF" />
      </div>

      <div className="space-y-2">
        <Label>CNAEs</Label>
        <Input value={form.cnaes} onChange={e => setForm(f => ({ ...f, cnaes: e.target.value }))} placeholder="Atividade econômica principal" />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
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
      const ultimo = todas[0].codigo || '';
      const num = parseInt(ultimo.split('-')[0]);
      if (!isNaN(num)) proximo = num + 1;
    }
    return `${proximo}-${sigla}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const codigo = await gerarCodigo(data.sigla || 'EMP');
      return base44.entities.Empresa.create({ ...data, codigo, arquivada: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      setShowForm(false);
      toast.success('Empresa criada!');
    },
    onError: () => toast.error('Erro ao criar empresa')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Empresa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      setEditando(null);
      setShowForm(false);
      toast.success('Empresa atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar')
  });

  const arquivarMutation = useMutation({
    mutationFn: ({ id, arquivada }) => base44.entities.Empresa.update(id, { arquivada }),
    onSuccess: (_, { arquivada }) => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast.success(arquivada ? 'Empresa arquivada' : 'Empresa restaurada');
    }
  });

  const handleSave = (data) => {
    if (editando) {
      updateMutation.mutate({ id: editando.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const listaFiltrada = empresas.filter(e => mostrarArquivadas ? e.arquivada : !e.arquivada);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <ModalContainer open={open} onClose={onClose} title="Configurações de Empresas" description="Gerencie as empresas do grupo para organizar as contas a pagar" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Switch checked={mostrarArquivadas} onCheckedChange={setMostrarArquivadas} id="arquivadas-toggle" />
            <Label htmlFor="arquivadas-toggle" className="cursor-pointer text-sm text-slate-600">Mostrar arquivadas</Label>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => { setEditando(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Empresa
            </Button>
          )}
        </div>

        {showForm && (
          <Card className="p-4 border-2 border-blue-200 bg-blue-50/30">
            <h3 className="font-semibold text-slate-800 mb-4">{editando ? `Editar: ${editando.nome}` : 'Nova Empresa'}</h3>
            <EmpresaForm
              empresa={editando}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditando(null); }}
              isSaving={isSaving}
            />
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
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
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-blue-700 font-bold text-sm">{emp.sigla?.slice(0, 3) || '?'}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">{emp.nome}</p>
                        <Badge variant="outline" className="text-xs font-mono">{emp.codigo}</Badge>
                        {emp.arquivada && <Badge className="bg-slate-100 text-slate-500 text-xs">Arquivada</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{emp.razao_social}</p>
                      {emp.cnpj && <p className="text-xs text-slate-400">{emp.cnpj}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditando(emp); setShowForm(true); }}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={emp.arquivada ? "text-green-600" : "text-slate-500"}
                      onClick={() => arquivarMutation.mutate({ id: emp.id, arquivada: !emp.arquivada })}
                    >
                      <Archive className="w-3 h-3" />
                    </Button>
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