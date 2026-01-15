import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, ArrowLeft, Plus, Edit, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import ModalContainer from "@/components/modals/ModalContainer";
import UsuarioForm from "@/components/usuarios/UsuarioForm";
import ConvidarUsuarioForm from "@/components/usuarios/ConvidarUsuarioForm";
import PermissionGuard from "@/components/PermissionGuard";
import { usePermissions } from "@/components/UserNotRegisteredError";

export default function Usuarios() {
  const queryClient = useQueryClient();
  const { canDo } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditModal(false);
      setSelectedUser(null);
      toast.success('Usuário atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar usuário');
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
    <PermissionGuard setor="Usuarios">
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
              <p className="text-slate-500">Gerenciamento de usuários do sistema</p>
            </div>
          </div>
          {canDo('Usuarios', 'adicionar') && (
            <Button onClick={() => setShowInviteModal(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Convidar Usuário
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold">{usuarios.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Admins</p>
                <p className="text-2xl font-bold">
                  {usuarios.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Usuários</p>
                <p className="text-2xl font-bold">
                  {usuarios.filter(u => u.role === 'user').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Lista */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-white">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, email ou setor..."
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
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Email</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Setor</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Perfil</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">
                      Carregando...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-medium">{user.full_name}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-slate-600">{user.email}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{user.setor || '-'}</p>
                      </td>
                      <td className="p-4">
                        <Badge className={user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                        }>
                          {user.role === 'admin' ? 'Admin' : 'Usuário'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {canDo('Usuarios', 'editar') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Edit Modal */}
        <ModalContainer
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          title="Editar Usuário"
          description="Atualize as informações do usuário"
        >
          {selectedUser && (
            <UsuarioForm
              user={selectedUser}
              onSave={(data) => updateMutation.mutate({ id: selectedUser.id, data })}
              onCancel={() => {
                setShowEditModal(false);
                setSelectedUser(null);
              }}
              isLoading={updateMutation.isPending}
            />
          )}
        </ModalContainer>

        {/* Invite Modal */}
        <ModalContainer
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          title="Convidar Usuário"
          description="Envie um convite para um novo usuário"
        >
          <ConvidarUsuarioForm
            onSave={handleInvite}
            onCancel={() => setShowInviteModal(false)}
            isLoading={inviteMutation.isPending}
          />
        </ModalContainer>
      </div>
    </div>
    </PermissionGuard>
  );
}