// src/components/usuarios/UsuarioForm.jsx

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Importado
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, X, ShieldCheck, CheckSquare, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Importa configuração de permissões
import { 
  MODULOS_CONFIG, 
  PERMISSOES_LABELS, 
  PERMISSOES_DESCRICOES, 
  criarPermissoesDefault 
} from '@/components/utils/permissions.jsx';

export default function UsuarioForm({ user, currentUser, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    full_name: '',
    setor: '',
    role: 'user', // Novo campo editável
    permissoes: criarPermissoesDefault()
  });

  const isSelf = currentUser && user && currentUser.id === user.id;

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        setor: user.setor || '',
        role: user.role || 'user',
        // Garante merge com novas permissões que possam ter surgido no config
        permissoes: { ...criarPermissoesDefault(), ...(user.permissoes || {}) }
      });
    }
  }, [user]);

  const handleSave = () => {
    // Proteção: Não deixar o próprio usuário tirar seu Admin
    if (isSelf && user.role === 'admin' && form.role !== 'admin') {
        toast.error("Você não pode remover seu próprio status de Administrador.");
        return;
    }
    onSave(form);
  };

  const updatePermissao = (modulo, permissao, valor) => {
    if (isSelf && modulo === 'Usuarios' && permissao === 'editar' && valor === false) {
       toast.warning("Cuidado: Você está removendo sua permissão de editar usuários.");
    }
    setForm(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [modulo]: { ...prev.permissoes[modulo], [permissao]: valor }
      }
    }));
  };

  // Funções auxiliares de toggle (Global e Módulo) mantidas iguais...
  const toggleModuloCompleto = (modulo) => {
    const moduloConfig = MODULOS_CONFIG.find(m => m.nome === modulo);
    const todasMarcadas = moduloConfig.permissoes.every(p => form.permissoes[modulo]?.[p]);
    setForm(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [modulo]: moduloConfig.permissoes.reduce((acc, perm) => {
          acc[perm] = !todasMarcadas;
          return acc;
        }, {})
      }
    }));
  };

  const togglePermissaoGlobal = (permissao) => {
    const modulosComEssaPermissao = MODULOS_CONFIG.filter(m => m.permissoes.includes(permissao));
    const todasMarcadas = modulosComEssaPermissao.every(m => form.permissoes[m.nome]?.[permissao]);
    setForm(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        ...modulosComEssaPermissao.reduce((acc, modulo) => {
          acc[modulo.nome] = { ...prev.permissoes[modulo.nome], [permissao]: !todasMarcadas };
          return acc;
        }, {})
      }
    }));
  };

  return (
    <Tabs defaultValue="dados" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="dados">Dados Básicos</TabsTrigger>
        <TabsTrigger value="permissoes" className="gap-2">
          <ShieldCheck className="w-4 h-4" />
          Permissões
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dados" className="space-y-4 mt-4 p-1">
        {isSelf && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>Você está editando seu próprio perfil. Cuidado ao alterar permissões.</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="full_name">Nome Completo *</Label>
          <Input
            id="full_name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Nome completo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email || ''} disabled className="bg-slate-100 text-slate-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
            <Label htmlFor="setor">Setor</Label>
            <Input
                id="setor"
                value={form.setor}
                onChange={(e) => setForm({ ...form, setor: e.target.value })}
                placeholder="Ex: Financeiro"
            />
            </div>

            <div className="space-y-2">
            <Label htmlFor="role">Perfil de Acesso</Label>
            <Select 
                value={form.role} 
                onValueChange={(v) => setForm({...form, role: v})}
                disabled={isSelf && user.role === 'admin'} // Evita auto-rebaixamento acidental
            >
                <SelectTrigger className={cn(form.role === 'admin' ? "border-purple-200 bg-purple-50 text-purple-900" : "")}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="user">Usuário Padrão</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
            </Select>
            {isSelf && user.role === 'admin' && <p className="text-[10px] text-slate-400">Você não pode remover seu próprio admin aqui.</p>}
            </div>
        </div>
      </TabsContent>

      <TabsContent value="permissoes" className="mt-4">
        {/* Lógica de renderização da tabela igual, mas usando MODULOS_CONFIG importado */}
        <Card className="border overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="space-y-8 p-4">
              {['Principal', 'Vendas', 'Cadastros', 'Financeiro', 'Fluxo', 'Analytics', 'Admin'].map(grupo => {
                const modulosDoGrupo = MODULOS_CONFIG.filter(m => m.grupo === grupo);
                if (modulosDoGrupo.length === 0) return null;

                return (
                  <div key={grupo} className="border rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-2 border-b">
                      <h3 className="font-bold text-sm text-slate-700 uppercase">{grupo}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-white border-b">
                            <th className="text-left p-3 text-xs font-semibold text-slate-500 w-[200px]">Módulo</th>
                            {Object.keys(PERMISSOES_LABELS).map(key => (
                              <th key={key} className="text-center p-2 min-w-[50px]">
                                <button 
                                  onClick={() => togglePermissaoGlobal(key)}
                                  className="flex flex-col items-center gap-1 hover:bg-slate-50 p-1 rounded w-full"
                                  title={`Alternar tudo`}
                                >
                                  <span className="text-lg">{PERMISSOES_LABELS[key]}</span>
                                  <span className="text-[9px] text-slate-400 font-normal">{PERMISSOES_DESCRICOES[key]}</span>
                                </button>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {modulosDoGrupo.map(modulo => {
                            const permsModulo = form.permissoes[modulo.nome] || {};
                            const todasMarcadas = modulo.permissoes.every(p => permsModulo[p]);
                            return (
                              <tr key={modulo.nome} className="hover:bg-slate-50/50">
                                <td className="p-3">
                                  <button type="button" onClick={() => toggleModuloCompleto(modulo.nome)} className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600">
                                    <CheckSquare className={cn("w-4 h-4 text-slate-300", todasMarcadas && "text-blue-600")} />
                                    {modulo.label}
                                  </button>
                                </td>
                                {Object.keys(PERMISSOES_LABELS).map(permKey => {
                                  if (!modulo.permissoes.includes(permKey)) return <td key={permKey} className="text-center p-2"><span className="text-slate-200 text-xs">•</span></td>;
                                  return (
                                    <td key={permKey} className="text-center p-2">
                                      <Checkbox
                                        checked={permsModulo[permKey] || false}
                                        onCheckedChange={(c) => updatePermissao(modulo.nome, permKey, c)}
                                        className="data-[state=checked]:bg-blue-600"
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </TabsContent>

      <div className="flex justify-end gap-3 pt-4 border-t mt-4">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
        <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </div>
    </Tabs>
  );
}