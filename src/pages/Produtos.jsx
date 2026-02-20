import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import PermissionGuard from "@/components/PermissionGuard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ProdutoForm from "@/components/produtos/ProdutoForm";
import ProdutoCard from "@/components/produtos/ProdutoCard";

const CATEGORIAS = ["Todas", "Portas", "Janelas", "Esquadrias", "Vidros", "Acessórios", "Ferragens", "Serviços", "Outros"];

export default function Produtos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
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

  const filteredProdutos = produtos.filter(p => {
    const nome = (p.nome_base || p.nome || '').toLowerCase();
    const matchSearch = nome.includes(searchTerm.toLowerCase()) ||
      (p.variacoes || []).some(v => v.sku?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = categoriaFiltro === 'Todas' || p.categoria === categoriaFiltro;
    return matchSearch && matchCat;
  });

  const stats = {
    total: produtos.length,
    ativos: produtos.filter(p => p.ativo !== false).length,
    variacoes: produtos.reduce((acc, p) => acc + (p.variacoes?.length || 0), 0),
  };

  return (
    <PermissionGuard setor="Produtos">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Catálogo de Produtos</h1>
                <p className="text-slate-500 mt-0.5 text-sm">Produtos com variações e tabelas de preços</p>
              </div>
            </div>
            <PermissionGuard setor="Produtos" funcao="adicionar" showBlocked={false}>
              <Button onClick={() => setShowAddModal(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Novo Produto
              </Button>
            </PermissionGuard>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total de Produtos', value: stats.total, color: 'text-blue-600' },
              { label: 'Ativos', value: stats.ativos, color: 'text-green-600' },
              { label: 'Variações (SKUs)', value: stats.variacoes, color: 'text-purple-600' }
            ].map(s => (
              <Card key={s.label} className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* ── Filters ── */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome ou SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* ── Grid ── */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filteredProdutos.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">Nenhum produto encontrado</p>
              <p className="text-slate-400 text-sm mt-1">
                {searchTerm || categoriaFiltro !== 'Todas' ? 'Tente ajustar os filtros' : 'Cadastre o primeiro produto'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProdutos.map(produto => (
                <ProdutoCard
                  key={produto.id}
                  produto={produto}
                  onEdit={(p) => { setSelectedProduto(p); setShowEditModal(true); }}
                  onDelete={(p) => { setProdutoToDelete(p); setShowDeleteDialog(true); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modais ── */}
      <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Novo Produto" description="Cadastre um produto com variações e tabelas de preço" size="xl">
        <ProdutoForm
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => setShowAddModal(false)}
          isLoading={createMutation.isPending}
        />
      </ModalContainer>

      <ModalContainer open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedProduto(null); }} title="Editar Produto" description="Atualize os dados e variações do produto" size="xl">
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
              Tem certeza que deseja excluir <strong>{produtoToDelete?.nome_base || produtoToDelete?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProdutoToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(produtoToDelete.id)} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PermissionGuard>
  );
}