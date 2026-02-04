import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Package, Search, Plus, Edit, Trash2, ArrowLeft, Save, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import PermissionGuard from "@/components/PermissionGuard";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function ProdutoForm({ produto, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    codigo: produto?.codigo || '',
    nome: produto?.nome || '',
    categoria: produto?.categoria || 'Esquadrias',
    preco_custo: produto?.preco_custo || '',
    preco_venda: produto?.preco_venda || '',
    unidade: produto?.unidade || 'UN',
    descricao: produto?.descricao || '',
    estoque_minimo: produto?.estoque_minimo || '',
    ativo: produto?.ativo !== undefined ? produto.ativo : true
  });

  const [foto, setFoto] = useState(produto?.foto_url || null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFoto(file_url);
      toast.success('Foto anexada!');
    } catch (error) {
      toast.error('Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, foto_url: foto });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Código/SKU *</Label>
          <Input
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            placeholder="Ex: ESQ-001"
            required
            disabled={!!produto}
          />
        </div>
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do produto"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Categoria *</Label>
          <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Esquadrias">Esquadrias</SelectItem>
              <SelectItem value="Vidros">Vidros</SelectItem>
              <SelectItem value="Acessórios">Acessórios</SelectItem>
              <SelectItem value="Ferragens">Ferragens</SelectItem>
              <SelectItem value="Serviços">Serviços</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Unidade *</Label>
          <Select value={form.unidade} onValueChange={(v) => setForm({ ...form, unidade: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="UN">Unidade (UN)</SelectItem>
              <SelectItem value="M2">Metro Quadrado (M²)</SelectItem>
              <SelectItem value="M">Metro (M)</SelectItem>
              <SelectItem value="KG">Quilograma (KG)</SelectItem>
              <SelectItem value="CX">Caixa (CX)</SelectItem>
              <SelectItem value="PC">Peça (PC)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Preço de Custo (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={form.preco_custo}
            onChange={(e) => setForm({ ...form, preco_custo: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Preço de Venda (R$) *</Label>
          <Input
            type="number"
            step="0.01"
            value={form.preco_venda}
            onChange={(e) => setForm({ ...form, preco_venda: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Estoque Mínimo</Label>
          <Input
            type="number"
            value={form.estoque_minimo}
            onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Descrição</Label>
          <Textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Foto do Produto</Label>
        {foto ? (
          <div className="relative group">
            <img src={foto} alt="Produto" className="w-full h-48 object-cover rounded-xl border-2 border-slate-200" />
            <button
              type="button"
              onClick={() => setFoto(null)}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className={cn(
            "flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed cursor-pointer transition-all",
            uploading ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50"
          )}>
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-2" />
                <p className="text-sm text-blue-600">Enviando...</p>
              </>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-600">Clique para adicionar foto</p>
                <p className="text-xs text-slate-400">PNG, JPG até 5MB</p>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        )}
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
        <div>
          <Label className="text-base font-semibold cursor-pointer">Produto Ativo</Label>
          <p className="text-sm text-slate-500">Disponível para venda</p>
        </div>
        <Switch
          checked={form.ativo}
          onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
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

export default function Produtos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState(null);

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Produto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      setShowAddModal(false);
      toast.success('Produto cadastrado!');
    },
    onError: () => toast.error('Erro ao cadastrar')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Produto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      setShowEditModal(false);
      setSelectedProduto(null);
      toast.success('Produto atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Produto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      setShowDeleteDialog(false);
      setProdutoToDelete(null);
      toast.success('Produto excluído!');
    },
    onError: () => toast.error('Erro ao excluir')
  });

  const filteredProdutos = produtos.filter(p =>
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    // CORREÇÃO AQUI: Mudado de "CadastroPecas" para "Produtos"
    <PermissionGuard setor="Produtos">
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
                <h1 className="text-3xl font-bold text-slate-800">Produtos</h1>
                <p className="text-slate-500 mt-1">Catálogo de produtos e serviços</p>
              </div>
            </div>
            {/* ADICIONADO: Bloqueio do botão Novo */}
            <PermissionGuard setor="Produtos" funcao="adicionar" showBlocked={false}>
              <Button onClick={() => setShowAddModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Produto
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {isLoading ? (
                <p className="col-span-full text-center text-slate-500 py-8">Carregando...</p>
              ) : filteredProdutos.length === 0 ? (
                <p className="col-span-full text-center text-slate-500 py-8">Nenhum produto cadastrado</p>
              ) : (
                filteredProdutos.map((produto) => (
                  <Card key={produto.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {produto.foto_url ? (
                      <img src={produto.foto_url} alt={produto.nome} className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-slate-100 flex items-center justify-center">
                        <Package className="w-16 h-16 text-slate-300" />
                      </div>
                    )}
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-800 text-lg">{produto.nome}</h3>
                          <Badge className={produto.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                            {produto.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500">{produto.codigo}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{produto.categoria}</Badge>
                        <span className="text-xs text-slate-500">{produto.unidade}</span>
                      </div>
                      <div className="border-t pt-3">
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(produto.preco_venda)}</p>
                        {produto.preco_custo && (
                          <p className="text-xs text-slate-400">Custo: {formatCurrency(produto.preco_custo)}</p>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2 border-t">
                        {/* ADICIONADO: Bloqueio do botão Editar */}
                        <PermissionGuard setor="Produtos" funcao="editar" showBlocked={false}>
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedProduto(produto); setShowEditModal(true); }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                            </Button>
                        </PermissionGuard>
                        
                        {/* ADICIONADO: Bloqueio do botão Excluir */}
                        <PermissionGuard setor="Produtos" funcao="excluir" showBlocked={false}>
                            <Button variant="outline" size="sm" onClick={() => { setProdutoToDelete(produto); setShowDeleteDialog(true); }} className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                            </Button>
                        </PermissionGuard>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>

          <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Novo Produto" description="Cadastre um novo produto ou serviço" size="lg">
            <ProdutoForm
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setShowAddModal(false)}
              isLoading={createMutation.isPending}
            />
          </ModalContainer>

          <ModalContainer open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedProduto(null); }} title="Editar Produto" description="Atualize os dados do produto" size="lg">
            {selectedProduto && (
              <ProdutoForm
                produto={selectedProduto}
                onSave={(data) => updateMutation.mutate({ id: selectedProduto.id, data })}
                onCancel={() => { setShowEditModal(false); setSelectedProduto(null); }}
                isLoading={updateMutation.isPending}
              />
            )}
          </ModalContainer>

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <strong>{produtoToDelete?.nome}</strong>?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setProdutoToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate(produtoToDelete.id)} className="bg-red-600 hover:bg-red-700">
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