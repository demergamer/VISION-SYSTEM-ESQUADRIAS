import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Search, Plus, Edit, Trash2, ArrowLeft, Save, X, Loader2, Upload, CheckCircle, Calendar, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import PermissionGuard from "@/components/PermissionGuard";
import { cn } from "@/lib/utils";
import { InputCpfCnpj } from "@/components/ui/input-mask";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function ContaPagarForm({ conta, fornecedores, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    fornecedor_codigo: conta?.fornecedor_codigo || '',
    fornecedor_nome: conta?.fornecedor_nome || '',
    descricao: conta?.descricao || '',
    valor: conta?.valor || '',
    data_vencimento: conta?.data_vencimento || '',
    status: conta?.status || 'pendente',
    observacao: conta?.observacao || ''
  });

  const [comprovante, setComprovante] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFornecedorChange = (codigo) => {
    const forn = fornecedores.find(f => f.codigo === codigo);
    setForm({ ...form, fornecedor_codigo: codigo, fornecedor_nome: forn?.nome || '' });
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setComprovante(file_url);
      toast.success('Comprovante anexado!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.status !== 'pendente' && !comprovante && !conta?.comprovante_url) {
      toast.error('Anexe o comprovante de pagamento');
      return;
    }
    onSave({ ...form, comprovante_url: comprovante || conta?.comprovante_url });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fornecedor *</Label>
          <Select value={form.fornecedor_codigo} onValueChange={handleFornecedorChange}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {fornecedores.map(f => (
                <SelectItem key={f.codigo} value={f.codigo}>{f.codigo} - {f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Valor (R$) *</Label>
          <Input
            type="number"
            step="0.01"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Data de Vencimento *</Label>
          <Input
            type="date"
            value={form.data_vencimento}
            onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="futuro">Futuro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Descrição *</Label>
          <Textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descreva o item/serviço"
            rows={2}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Observações</Label>
          <Textarea
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            rows={2}
          />
        </div>
      </div>

      {form.status !== 'pendente' && (
        <div className="space-y-2">
          <Label>Comprovante de Pagamento *</Label>
          <label className={cn(
            "flex items-center justify-center gap-2 h-12 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
            comprovante || conta?.comprovante_url ? "border-green-300 bg-green-50 text-green-700" : "border-slate-300 bg-white hover:border-blue-400"
          )}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : comprovante || conta?.comprovante_url ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            <span className="font-medium">{uploading ? 'Enviando...' : comprovante || conta?.comprovante_url ? 'Comprovante Anexado' : 'Clique para Anexar'}</span>
            <input type="file" accept="image/*,.pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

export default function Pagamentos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedConta, setSelectedConta] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contaToDelete, setContaToDelete] = useState(null);

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ['contasPagar'],
    queryFn: () => base44.entities.ContaPagar.list('-data_vencimento')
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: () => base44.entities.Fornecedor.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContaPagar.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contasPagar'] });
      setShowAddModal(false);
      toast.success('Conta cadastrada!');
    },
    onError: () => toast.error('Erro ao cadastrar')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContaPagar.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contasPagar'] });
      setShowEditModal(false);
      setSelectedConta(null);
      toast.success('Conta atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContaPagar.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contasPagar'] });
      setShowDeleteDialog(false);
      setContaToDelete(null);
      toast.success('Conta excluída!');
    },
    onError: () => toast.error('Erro ao excluir')
  });

  const filteredContas = contas.filter(c =>
    c?.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c?.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
    const pendentes = contas.filter(c => c?.status === 'pendente');
    const pagas = contas.filter(c => c?.status === 'pago');
    const futuras = contas.filter(c => c?.status === 'futuro');

    return {
      totalPendente: pendentes.reduce((sum, c) => sum + (c?.valor || 0), 0),
      totalPago: pagas.reduce((sum, c) => sum + (c?.valor || 0), 0),
      totalFuturo: futuras.reduce((sum, c) => sum + (c?.valor || 0), 0),
      qtdPendente: pendentes.length
    };
  }, [contas]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const getStatusBadge = (status) => {
    const config = {
      pendente: { label: 'Pendente', class: 'bg-yellow-100 text-yellow-700' },
      pago: { label: 'Pago', class: 'bg-green-100 text-green-700' },
      futuro: { label: 'Futuro', class: 'bg-blue-100 text-blue-700' }
    };
    return config[status] || config.pendente;
  };

  return (
    <PermissionGuard setor="ChequesPagar">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Pagamentos</h1>
                <p className="text-slate-500 mt-1">Gestão de contas a pagar e fornecedores</p>
              </div>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Conta
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pendentes</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalPendente)}</p>
                  <p className="text-xs text-slate-400">{stats.qtdPendente} contas</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pagas</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalPago)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Futuras</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalFuturo)}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b bg-white">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por fornecedor ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Fornecedor</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Descrição</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Vencimento</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Valor</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500">Carregando...</td>
                    </tr>
                  ) : filteredContas.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500">Nenhuma conta encontrada</td>
                    </tr>
                  ) : (
                    filteredContas.map((conta) => {
                      const statusConfig = getStatusBadge(conta?.status);
                      return (
                        <tr key={conta?.id} className="hover:bg-slate-50">
                          <td className="p-4"><p className="font-semibold">{conta?.fornecedor_nome || 'Sem nome'}</p></td>
                          <td className="p-4"><p className="text-sm text-slate-600 max-w-xs truncate">{conta?.descricao || '-'}</p></td>
                          <td className="p-4"><p className="text-sm">{conta?.data_vencimento ? new Date(conta.data_vencimento).toLocaleDateString('pt-BR') : '-'}</p></td>
                          <td className="p-4"><p className="font-bold text-slate-700">{formatCurrency(conta?.valor)}</p></td>
                          <td className="p-4">
                            <Badge className={statusConfig?.class || 'bg-slate-100 text-slate-700'}>{statusConfig?.label || 'N/A'}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedConta(conta); setShowEditModal(true); }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setContaToDelete(conta); setShowDeleteDialog(true); }} className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Nova Conta a Pagar" description="Cadastre uma nova conta">
            <ContaPagarForm
              fornecedores={fornecedores}
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setShowAddModal(false)}
              isLoading={createMutation.isPending}
            />
          </ModalContainer>

          <ModalContainer open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedConta(null); }} title="Editar Conta" description="Atualize os dados da conta">
            {selectedConta && (
              <ContaPagarForm
                conta={selectedConta}
                fornecedores={fornecedores}
                onSave={(data) => updateMutation.mutate({ id: selectedConta.id, data })}
                onCancel={() => { setShowEditModal(false); setSelectedConta(null); }}
                isLoading={updateMutation.isPending}
              />
            )}
          </ModalContainer>

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta conta a pagar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setContaToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate(contaToDelete.id)} className="bg-red-600 hover:bg-red-700">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </PermissionGuard>
  );
}