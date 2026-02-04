import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, X, ShieldCheck, CheckSquare, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Configuração dos Módulos (Mantida igual, apenas exemplo encurtado)
const modulosConfig = [
  { nome: 'Dashboard', label: '📊 Dashboard', grupo: 'Principal', permissoes: ['visualizar'] },
  { nome: 'Pedidos', label: '🛒 Pedidos', grupo: 'Vendas', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'liquidar', 'exportar'] },
  { nome: 'Orcamentos', label: '📝 Orçamentos', grupo: 'Vendas', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'aprovar', 'exportar'] },
  { nome: 'Clientes', label: '🏢 Clientes', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] },
  { nome: 'Representantes', label: '👤 Representantes', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] },
  { nome: 'Fornecedores', label: '🚛 Fornecedores', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] },
  { nome: 'Produtos', label: '📦 Produtos', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] },
  { nome: 'Financeiro', label: '💰 Financeiro Geral', grupo: 'Financeiro', permissoes: ['visualizar'] },
  { nome: 'Cheques', label: '🎫 Cheques', grupo: 'Financeiro', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] },
  { nome: 'Pagamentos', label: '💸 Contas a Pagar', grupo: 'Financeiro', permissoes: ['visualizar', 'adicionar', 'editar', 'liquidar'] },
  { nome: 'Comissoes', label: '💼 Comissões', grupo: 'Financeiro', permissoes: ['visualizar', 'editar', 'fechar'] },
  { nome: 'Usuarios', label: '👥 Usuários', grupo: 'Admin', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] }
];

const permissoesLabels = {
  visualizar: '👁️', adicionar: '➕', editar: '✏️', excluir: '🗑️',
  liquidar: '💰', fechar: '🔒', aprovar: '✅', juntar: '🔗', exportar: '📄'
};

const permissoesDescricoes = {
  visualizar: 'Ver', adicionar: 'Criar', editar: 'Editar', excluir: 'Excluir',
  liquidar: 'Liquidar', fechar: 'Fechar', aprovar: 'Aprovar', juntar: 'Juntar', exportar: 'Exportar'
};

function criarPermissoesDefault() {
  const perms = {};
  modulosConfig.forEach(modulo => {
    perms[modulo.nome] = {};
    modulo.permissoes.forEach(perm => { perms[modulo.nome][perm] = false; });
  });
  return perms;
}

export default function UsuarioForm({ user, currentUser, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    full_name: '',
    setor: '',
    permissoes: criarPermissoesDefault()
  });

  // Proteção: É o próprio usuário logado?
  const isSelf = currentUser && user && currentUser.id === user.id;

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        setor: user.setor || '',
        // Mescla com default para garantir que novos módulos apareçam
        permissoes: { ...criarPermissoesDefault(), ...(user.permissoes || {}) }
      });
    }
  }, [user]);

  const handleSave = () => {
    // Validação extra para não remover permissão de admin de si mesmo se fosse possível editar roles aqui
    // Como roles são fixas no backend ou outro lugar, aqui focamos nas permissões
    onSave(form);
  };

  const updatePermissao = (modulo, permissao, valor) => {
    // Bloqueio de segurança: Se for o próprio usuário tentando tirar acesso de usuários, avisa (opcional)
    if (isSelf && modulo === 'Usuarios' && permissao === 'editar' && valor === false) {
       toast.warning("Cuidado! Você está removendo sua própria permissão de editar usuários.");
    }

    setForm(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [modulo]: { ...prev.permissoes[modulo], [permissao]: valor }
      }
    }));
  };

  const toggleModuloCompleto = (modulo) => {
    const moduloConfig = modulosConfig.find(m => m.nome === modulo);
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
    const modulosComEssaPermissao = modulosConfig.filter(m => m.permissoes.includes(permissao));
    const todasMarcadas = modulosComEssaPermissao.every(m => form.permissoes[m.nome]?.[permissao]);
    
    setForm(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        ...modulosComEssaPermissao.reduce((acc, modulo) => {
          acc[modulo.nome] = {
            ...prev.permissoes[modulo.nome],
            [permissao]: !todasMarcadas
          };
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
          Permissões de Acesso
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dados" className="space-y-4 mt-4 p-1">
        {isSelf && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>Você está editando seu próprio perfil. Tenha cuidado ao alterar permissões críticas.</p>
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
          <Label htmlFor="role">Perfil</Label>
          <Input
            id="role"
            value={user?.role === 'admin' ? 'Administrador' : 'Usuário'}
            disabled
            className="bg-slate-100 text-slate-500"
          />
        </div>
      </TabsContent>

      <TabsContent value="permissoes" className="mt-4">
        <Card className="border overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="space-y-8 p-4">
              {['Principal', 'Vendas', 'Cadastros', 'Financeiro', 'Fluxo', 'Analytics', 'Admin'].map(grupo => {
                const modulosDoGrupo = modulosConfig.filter(m => m.grupo === grupo);
                if (modulosDoGrupo.length === 0) return null;

                return (
                  <div key={grupo} className="border rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-2 border-b flex justify-between items-center">
                      <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide">{grupo}</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-white border-b">
                            <th className="text-left p-3 text-xs font-semibold text-slate-500 w-[200px]">Módulo</th>
                            {Object.keys(permissoesLabels).map(key => (
                              <th key={key} className="text-center p-2 min-w-[50px]">
                                <button 
                                  onClick={() => togglePermissaoGlobal(key)}
                                  className="flex flex-col items-center gap-1 group hover:bg-slate-50 p-1 rounded transition-colors w-full"
                                  title={`Alternar ${permissoesDescricoes[key]} para todos`}
                                >
                                  <span className="text-lg leading-none group-hover:scale-110 transition-transform">{permissoesLabels[key]}</span>
                                  <span className="text-[9px] text-slate-400 font-normal">{permissoesDescricoes[key]}</span>
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
                              <tr key={modulo.nome} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleModuloCompleto(modulo.nome)}
                                    className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors text-left w-full"
                                  >
                                    <CheckSquare className={cn("w-4 h-4 text-slate-300", todasMarcadas && "text-blue-600")} />
                                    {modulo.label}
                                  </button>
                                </td>
                                {Object.keys(permissoesLabels).map(permKey => {
                                  const temEssaPermissao = modulo.permissoes.includes(permKey);
                                  return (
                                    <td key={permKey} className="text-center p-2">
                                      {temEssaPermissao ? (
                                        <Checkbox
                                          checked={permsModulo[permKey] || false}
                                          onCheckedChange={(checked) => updatePermissao(modulo.nome, permKey, checked)}
                                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                      ) : (
                                        <span className="text-slate-200 text-xs select-none">•</span>
                                      )}
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
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </div>
    </Tabs>
  );
}