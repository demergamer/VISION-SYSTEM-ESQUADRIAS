import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Search, Plus, Edit, Trash2, ArrowLeft, Save, X, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import PermissionGuard from "@/components/PermissionGuard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function FormaPagamentoForm({ forma, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    nome: forma?.nome || '',
    descricao: forma?.descricao || '',
    prazo_dias: forma?.prazo_dias || '',
    ativa: forma?.ativa !== undefined ? forma.ativa : true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome da Forma de Pagamento *</Label>
        <Input
          id="nome"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          placeholder="Ex: Boleto 30 dias"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          placeholder="Detalhes sobre esta forma de pagamento"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prazo">Prazo (dias)</Label>
        <Input
          id="prazo"
          type="number"
          min="0"
          value={form.prazo_dias}
          onChange={(e) => setForm({ ...form, prazo_dias: parseInt(e.target.value) || '' })}
          placeholder="Ex: 30"
        />
      </div>
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
        <div>
          <Label htmlFor="ativa" className="text-base font-semibold cursor-pointer">Ativa</Label>
          <p className="text-sm text-slate-500">Disponível para seleção no cadastro de clientes</p>
        </div>
        <Switch
          id="ativa"
          checked={form.ativa}
          onCheckedChange={(checked) => setForm({ ...form, ativa: checked })}
        />
      </div>

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

export default function FormasPagamento() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedForma, setSelectedForma] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formaToDelete, setFormaToDelete] = useState(null);

  const { data: formas = [], isLoading } = useQuery({
    queryKey: ['formasPagamento'],
    queryFn: () => base44.entities.FormaPagamento.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FormaPagamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formasPagamento'] });
      setShowAddModal(false);
      toast.success('Forma de pagamento cadastrada!');
    },
    onError: () => toast.error('Erro ao cadastrar')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FormaPagamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formasPagamento'] });
      setShowEditModal(false);
      setSelectedForma(null);
      toast.success('Forma de pagamento atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FormaPagamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formasPagamento'] });
      setShowDeleteDialog(false);
      setFormaToDelete(null);
      toast.success('Forma de pagamento excluída!');
    },
    onError: () => toast.error('Erro ao excluir')
  });

  const filteredFormas = formas.filter(f =>
    f.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (forma) => {
    setFormaToDelete(forma);
    setShowDeleteDialog(true);
  };

  return (
    <PermissionGuard setor="FormasPagamento">
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
                <h1 className="text-3xl font-bold text-slate-800">Formas de Pagamento</h1>
                <p className="text-slate-500 mt-1">Gerencie as formas de pagamento disponíveis</p>
              </div>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Forma
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b bg-white">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar forma de pagamento..."
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
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Nome</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Descrição</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Prazo</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-500">Carregando...</td>
                    </tr>
                  ) : filteredFormas.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-500">Nenhuma forma de pagamento cadastrada</td>
                    </tr>
                  ) : (
                    filteredFormas.map((forma) => (
                      <tr key={forma.id} className="hover:bg-slate-50">
                        <td className="p-4"><p className="font-semibold">{forma.nome}</p></td>
                        <td className="p-4"><p className="text-sm text-slate-600">{forma.descricao || '-'}</p></td>
                        <td className="p-4"><p className="text-sm">{forma.prazo_dias ? `${forma.prazo_dias} dias` : '-'}</p></td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${forma.ativa ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {forma.ativa ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedForma(forma); setShowEditModal(true); }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(forma)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Nova Forma de Pagamento" description="Cadastre uma nova forma de pagamento">
            <FormaPagamentoForm
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setShowAddModal(false)}
              isLoading={createMutation.isPending}
            />
          </ModalContainer>

          <ModalContainer open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedForma(null); }} title="Editar Forma de Pagamento" description="Atualize os dados">
            {selectedForma && (
              <FormaPagamentoForm
                forma={selectedForma}
                onSave={(data) => updateMutation.mutate({ id: selectedForma.id, data })}
                onCancel={() => { setShowEditModal(false); setSelectedForma(null); }}
                isLoading={updateMutation.isPending}
              />
            )}
          </ModalContainer>

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <strong>{formaToDelete?.nome}</strong>? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setFormaToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate(formaToDelete.id)} className="bg-red-600 hover:bg-red-700">
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