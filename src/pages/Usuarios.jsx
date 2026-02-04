import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, ArrowLeft, Edit, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import ModalContainer from "@/components/modals/ModalContainer";
import UsuarioForm from "@/components/usuarios/UsuarioForm";
import ConvidarUsuarioForm from "@/components/usuarios/ConvidarUsuarioForm";
import PermissionGuard from "@/components/PermissionGuard";
// Se você não tiver esse hook usePermissions criado, pode remover a linha abaixo ou criar um mock
// import { usePermissions } from "@/components/UserNotRegisteredError"; 

export default function Usuarios() {
  const queryClient = useQueryClient();
  
  // Se não tiver o hook, assumimos true para admins acessarem aqui
  const canDo = (setor, acao) => true; 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // 1. Busca o usuário logado para saber quem "EU" sou
  const { data: currentUser } = useQuery({ 
    queryKey: ['me'], 
    queryFn: () => base44.auth.me() 
  });

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: (data, variables) => {
      // 2. Invalida a lista de usuários para atualizar a tabela
      queryClient.invalidateQueries({ queryKey: ['users'] });

      // 3. O PULO DO GATO: Se eu editei a mim mesmo, forço recarregar minhas permissões
      if (currentUser && currentUser.id === variables.id) {
          queryClient.invalidateQueries({ queryKey: ['me'] });
          // Opcional: queryClient.refetchQueries({ queryKey: ['me'] });
      }

      setShowEditModal(false);
      setSelectedUser(null);
      toast.success('Usuário e permissões atualizados!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar usuário: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }) => base44.users.inviteUser(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowInviteModal(false);
      toast.success('Convite enviado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao convidar usuário: ' + (error.message || ''));
    }
  });

  const filteredUsers = usuarios.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.setor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleInvite = (data) => {
    inviteMutation.mutate(data);
  };

  return (
    // Remova o PermissionGuard temporariamente se ainda estiver tendo problemas de acesso AQUI
    // <PermissionGuard setor="Usuarios"> 
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
                <p className="text-slate-500">Gerenciamento de usuários e permissões</p>
              </div>
            </div>
            {canDo('Usuarios', 'adicionar') && (
              <Button onClick={() => setShowInviteModal(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-4 h-4" />
                Convidar Usuário
              </Button>
            )}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Total</p>
                <p className="text-2xl font-bold text-slate-800">{usuarios.length}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Admins</p>
                <p className="text-2xl font-bold text-slate-800">{usuarios.filter(u => u.role === 'admin').length}</p>
              </div>
            </Card>
          </div>

          {/* Tabela de Usuários */}
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, email ou setor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-200"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="p-4">Nome</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Setor</th>
                    <th className="p-4">Perfil</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {isLoading ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-500">Carregando usuários...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-700">{user.full_name}</td>
                        <td className="p-4 text-slate-500">{user.email}</td>
                        <td className="p-4 text-slate-500">{user.setor || '-'}</td>
                        <td className="p-4">
                          <Badge variant="outline" className={user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-700 border-slate-200'}>
                            {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          {canDo('Usuarios', 'editar') && (
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} className="hover:text-blue-600">
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Modal de Edição */}
          <ModalContainer
            open={showEditModal}
            onClose={() => { setShowEditModal(false); setSelectedUser(null); }}
            title="Editar Usuário"
            description="Gerencie as permissões e dados do usuário."
          >
            {selectedUser && (
              <UsuarioForm
                user={selectedUser}
                currentUser={currentUser} 
                onSave={(data) => updateMutation.mutate({ id: selectedUser.id, data })}
                onCancel={() => { setShowEditModal(false); setSelectedUser(null); }}
                isLoading={updateMutation.isPending}
              />
            )}
          </ModalContainer>

          {/* Modal de Convite */}
          <ModalContainer
            open={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            title="Convidar Novo Usuário"
            description="Envie um e-mail de convite para acesso ao sistema."
          >
            <ConvidarUsuarioForm
              onSave={handleInvite}
              onCancel={() => setShowInviteModal(false)}
              isLoading={inviteMutation.isPending}
            />
          </ModalContainer>

        </div>
      </div>
    // </PermissionGuard>
  );
}