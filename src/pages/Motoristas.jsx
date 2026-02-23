import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, ArrowLeft, Edit, Eye, Loader2, Phone, Wallet, UserX, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import MotoristaForm from "@/components/motoristas/MotoristaForm";
import MotoristaDetails from "@/components/motoristas/MotoristaDetails";
import PermissionGuard from "@/components/PermissionGuard";

export default function Motoristas() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInativos, setShowInativos] = useState(false);
  const [selectedMotorista, setSelectedMotorista] = useState(null);

  const { data: motoristas = [], isLoading } = useQuery({
    queryKey: ['motoristas'],
    queryFn: () => base44.entities.Motorista.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Motorista.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['motoristas'] }); setShowAddModal(false); toast.success('Motorista cadastrado!'); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Motorista.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['motoristas'] }); setShowEditModal(false); setSelectedMotorista(null); toast.success('Motorista atualizado!'); }
  });

  // Soft delete — apenas desativa
  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }) => base44.entities.Motorista.update(id, { ativo }),
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: ['motoristas'] });
      toast.success(ativo ? 'Motorista reativado!' : 'Motorista desativado (soft delete).');
    }
  });

  const filtered = motoristas.filter(m => {
    const matchSearch = m.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.telefone?.includes(searchTerm);
    const matchAtivo = showInativos ? !m.ativo : m.ativo !== false;
    return matchSearch && matchAtivo;
  });

  return (
    <PermissionGuard setor="Pedidos">
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Motoristas</h1>
                <p className="text-slate-500 mt-1">Gestão de motoristas e portadores de rotas</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowInativos(!showInativos)}
                className={showInativos ? "bg-red-50 border-red-200 text-red-700" : ""}
              >
                {showInativos ? <UserCheck className="w-4 h-4 mr-2" /> : <UserX className="w-4 h-4 mr-2" />}
                {showInativos ? 'Ver Ativos' : 'Ver Inativos'}
              </Button>
              <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Novo Motorista
              </Button>
            </div>
          </div>

          {/* Busca */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar por nome, código ou telefone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-white" />
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 border-2 border-dashed rounded-xl bg-white">
              <p className="text-lg font-medium">Nenhum motorista encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(m => (
                <Card key={m.id} className={`p-4 flex items-center gap-4 hover:shadow-md transition-all ${m.ativo === false ? 'opacity-60 bg-slate-50' : 'bg-white'}`}>
                  <Avatar className="h-12 w-12 border-2 border-slate-100">
                    <AvatarImage src={m.foto_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">{(m.nome_social || m.nome || 'M').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 truncate">{m.nome_social || m.nome}</span>
                      {m.ativo === false && <Badge className="bg-red-100 text-red-700 text-[10px]">Inativo</Badge>}
                    </div>
                    {m.codigo && <p className="text-xs text-slate-400 font-mono">Cód: {m.codigo}</p>}
                    {m.telefone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{m.telefone}</p>}
                    {m.chave_pix && <p className="text-xs text-slate-500 flex items-center gap-1"><Wallet className="w-3 h-3" />PIX: {m.chave_pix}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-blue-50" onClick={() => { setSelectedMotorista(m); setShowDetailsModal(true); }}>
                      <Eye className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-amber-50" onClick={() => { setSelectedMotorista(m); setShowEditModal(true); }}>
                      <Edit className="w-4 h-4 text-amber-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 ${m.ativo === false ? 'hover:bg-emerald-50' : 'hover:bg-red-50'}`}
                      title={m.ativo === false ? 'Reativar' : 'Desativar (Soft Delete)'}
                      onClick={() => toggleAtivoMutation.mutate({ id: m.id, ativo: m.ativo === false })}
                    >
                      {m.ativo === false ? <UserCheck className="w-4 h-4 text-emerald-600" /> : <UserX className="w-4 h-4 text-red-500" />}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Modais */}
          <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Novo Motorista" size="default">
            <MotoristaForm onSave={data => createMutation.mutate(data)} onCancel={() => setShowAddModal(false)} isLoading={createMutation.isPending} />
          </ModalContainer>

          <ModalContainer open={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Motorista" size="default">
            {selectedMotorista && (
              <MotoristaForm motorista={selectedMotorista} onSave={data => updateMutation.mutate({ id: selectedMotorista.id, data })} onCancel={() => setShowEditModal(false)} isLoading={updateMutation.isPending} />
            )}
          </ModalContainer>

          <ModalContainer open={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Dados do Motorista" size="default">
            {selectedMotorista && <MotoristaDetails motorista={selectedMotorista} />}
          </ModalContainer>
        </div>
      </div>
    </PermissionGuard>
  );
}