import React, { useState } from 'react';

import { base44 } from '@/api/base44Client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";

import { Truck, Search, Plus, Edit, Trash2, ArrowLeft, Save, X, Loader2 } from "lucide-react";

import { Link } from "react-router-dom";

import { createPageUrl } from "@/utils";

import { toast } from "sonner";

import ModalContainer from "@/components/modals/ModalContainer";

import PermissionGuard from "@/components/PermissionGuard";

import { cn } from "@/lib/utils";

import { InputCpfCnpj } from "@/components/ui/input-mask";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";



function FornecedorForm({ fornecedor, onSave, onCancel, isLoading }) {

  const [form, setForm] = useState({

    codigo: fornecedor?.codigo || '',

    nome: fornecedor?.nome || '',

    cnpj: fornecedor?.cnpj || '',

    telefone: fornecedor?.telefone || '',

    email: fornecedor?.email || '',

    tipo: fornecedor?.tipo || 'material',

    observacao: fornecedor?.observacao || ''

  });



  const handleSubmit = (e) => {

    e.preventDefault();

    onSave(form);

  };



  return (

    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="space-y-2">

          <Label htmlFor="codigo">Código *</Label>

          <Input

            id="codigo"

            value={form.codigo}

            onChange={(e) => setForm({ ...form, codigo: e.target.value })}

            placeholder="Ex: FOR001"

            required

            disabled={!!fornecedor}

          />

        </div>

        <div className="space-y-2">

          <Label htmlFor="nome">Nome/Razão Social *</Label>

          <Input

            id="nome"

            value={form.nome}

            onChange={(e) => setForm({ ...form, nome: e.target.value })}

            placeholder="Nome do fornecedor"

            required

          />

        </div>

        <div className="space-y-2">

          <Label htmlFor="cnpj">CPF/CNPJ</Label>

          <InputCpfCnpj

            id="cnpj"

            value={form.cnpj}

            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}

          />

        </div>

        <div className="space-y-2">

          <Label htmlFor="tipo">Tipo</Label>

          <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>

            <SelectTrigger><SelectValue /></SelectTrigger>

            <SelectContent>

              <SelectItem value="material">Material</SelectItem>

              <SelectItem value="servico">Serviço</SelectItem>

              <SelectItem value="equipamento">Equipamento</SelectItem>

              <SelectItem value="diversos">Diversos</SelectItem>

            </SelectContent>

          </Select>

        </div>

        <div className="space-y-2">

          <Label htmlFor="telefone">Telefone</Label>

          <Input

            id="telefone"

            value={form.telefone}

            onChange={(e) => setForm({ ...form, telefone: e.target.value })}

            placeholder="(00) 00000-0000"

          />

        </div>

        <div className="space-y-2">

          <Label htmlFor="email">Email</Label>

          <Input

            id="email"

            type="email"

            value={form.email}

            onChange={(e) => setForm({ ...form, email: e.target.value })}

            placeholder="email@fornecedor.com"

          />

        </div>

        <div className="space-y-2 md:col-span-2">

          <Label htmlFor="obs">Observações</Label>

          <Textarea

            id="obs"

            value={form.observacao}

            onChange={(e) => setForm({ ...form, observacao: e.target.value })}

            rows={3}

          />

        </div>

      </div>



      <div className="flex justify-end gap-3 pt-4 border-t">

        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>

          <X className="w-4 h-4 mr-2" />

          Cancelar

        </Button>

        <Button type="submit" disabled={isLoading} className={isLoading ? 'cursor-not-allowed opacity-70' : ''}>

          {isLoading ? (

            <>

              <Loader2 className="w-4 h-4 mr-2 animate-spin" />

              Salvando...

            </>

          ) : (

            <>

              <Save className="w-4 h-4 mr-2" />

              Salvar

            </>

          )}

        </Button>

      </div>

    </form>

  );

}



export default function Fornecedores() {

  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedFornecedor, setSelectedFornecedor] = useState(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [fornecedorToDelete, setFornecedorToDelete] = useState(null);



  const { data: fornecedores = [], isLoading } = useQuery({

    queryKey: ['fornecedores'],

    queryFn: () => base44.entities.Fornecedor.list()

  });



  const createMutation = useMutation({

    mutationFn: (data) => base44.entities.Fornecedor.create(data),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });

      setShowAddModal(false);

      toast.success('Fornecedor cadastrado!');

    },

    onError: () => toast.error('Erro ao cadastrar')

  });



  const updateMutation = useMutation({

    mutationFn: ({ id, data }) => base44.entities.Fornecedor.update(id, data),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });

      setShowEditModal(false);

      setSelectedFornecedor(null);

      toast.success('Fornecedor atualizado!');

    },

    onError: () => toast.error('Erro ao atualizar')

  });



  const deleteMutation = useMutation({

    mutationFn: (id) => base44.entities.Fornecedor.delete(id),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });

      setShowDeleteDialog(false);

      setFornecedorToDelete(null);

      toast.success('Fornecedor excluído!');

    },

    onError: () => toast.error('Erro ao excluir')

  });



  const filteredFornecedores = fornecedores.filter(f =>

    f.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||

    f.codigo?.toLowerCase().includes(searchTerm.toLowerCase())

  );



  const handleDelete = (fornecedor) => {

    setFornecedorToDelete(fornecedor);

    setShowDeleteDialog(true);

  };



  return (

    <PermissionGuard setor="Fornecedores">

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

                <h1 className="text-3xl font-bold text-slate-800">Fornecedores</h1>

                <p className="text-slate-500 mt-1">Gestão de fornecedores e parceiros</p>

              </div>

            </div>

            <PermissionGuard setor="Fornecedores" funcao="adicionar" showBlocked={false}>

              <Button onClick={() => setShowAddModal(true)} className="gap-2">

                <Plus className="w-4 h-4" />

                Novo Fornecedor

              </Button>

            </PermissionGuard>

          </div>



          <Card className="overflow-hidden">

            <div className="p-4 border-b bg-white">

              <div className="relative max-w-md">

                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <Input

                  placeholder="Buscar por nome ou código..."

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

                    <th className="text-left p-4 text-sm font-medium text-slate-600">Código</th>

                    <th className="text-left p-4 text-sm font-medium text-slate-600">Nome</th>

                    <th className="text-left p-4 text-sm font-medium text-slate-600">CNPJ</th>

                    <th className="text-left p-4 text-sm font-medium text-slate-600">Tipo</th>

                    <th className="text-left p-4 text-sm font-medium text-slate-600">Contato</th>

                    <th className="text-right p-4 text-sm font-medium text-slate-600">Ações</th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {isLoading ? (

                    <tr>

                      <td colSpan="6" className="p-8 text-center text-slate-500">Carregando...</td>

                    </tr>

                  ) : filteredFornecedores.length === 0 ? (

                    <tr>

                      <td colSpan="6" className="p-8 text-center text-slate-500">Nenhum fornecedor encontrado</td>

                    </tr>

                  ) : (

                    filteredFornecedores.map((fornecedor) => (

                      <tr key={fornecedor.id} className="hover:bg-slate-50">

                        <td className="p-4"><p className="font-bold text-slate-700">{fornecedor.codigo}</p></td>

                        <td className="p-4"><p className="font-medium">{fornecedor.nome}</p></td>

                        <td className="p-4"><p className="text-sm text-slate-600">{fornecedor.cnpj || '-'}</p></td>

                        <td className="p-4"><p className="text-sm capitalize">{fornecedor.tipo}</p></td>

                        <td className="p-4"><p className="text-sm text-slate-600">{fornecedor.telefone || fornecedor.email || '-'}</p></td>

                        <td className="p-4">

                          <div className="flex justify-end gap-2">

                            <PermissionGuard setor="Fornecedores" funcao="editar" showBlocked={false}>

                              <Button variant="ghost" size="sm" onClick={() => { setSelectedFornecedor(fornecedor); setShowEditModal(true); }}>

                                <Edit className="w-4 h-4" />

                              </Button>

                            </PermissionGuard>

                            <PermissionGuard setor="Fornecedores" funcao="excluir" showBlocked={false}>

                              <Button variant="ghost" size="sm" onClick={() => handleDelete(fornecedor)} className="text-red-600 hover:text-red-700">

                                <Trash2 className="w-4 h-4" />

                              </Button>

                            </PermissionGuard>

                          </div>

                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

          </Card>



          <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Novo Fornecedor" description="Cadastre um novo fornecedor">

            <FornecedorForm

              onSave={(data) => createMutation.mutate(data)}

              onCancel={() => setShowAddModal(false)}

              isLoading={createMutation.isPending}

            />

          </ModalContainer>



          <ModalContainer open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedFornecedor(null); }} title="Editar Fornecedor" description="Atualize os dados do fornecedor">

            {selectedFornecedor && (

              <FornecedorForm

                fornecedor={selectedFornecedor}

                onSave={(data) => updateMutation.mutate({ id: selectedFornecedor.id, data })}

                onCancel={() => { setShowEditModal(false); setSelectedFornecedor(null); }}

                isLoading={updateMutation.isPending}

              />

            )}

          </ModalContainer>



          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>

            <AlertDialogContent>

              <AlertDialogHeader>

                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>

                <AlertDialogDescription>

                  Tem certeza que deseja excluir o fornecedor <strong>{fornecedorToDelete?.nome}</strong>? Esta ação não pode ser desfeita.

                </AlertDialogDescription>

              </AlertDialogHeader>

              <AlertDialogFooter>

                <AlertDialogCancel onClick={() => setFornecedorToDelete(null)}>Cancelar</AlertDialogCancel>

                <AlertDialogAction onClick={() => deleteMutation.mutate(fornecedorToDelete.id)} className="bg-red-600 hover:bg-red-700">

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