import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, X, ShieldCheck, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const modulosConfig = [
  {
    nome: 'Dashboard',
    label: 'Dashboard',
    permissoes: ['visualizar']
  },
  {
    nome: 'Pedidos',
    label: 'Pedidos',
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'liquidar', 'exportar']
  },
  {
    nome: 'Orcamentos',
    label: 'Orçamentos',
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'aprovar', 'juntar', 'exportar']
  },
  {
    nome: 'EntradaCaucao',
    label: 'Entrada/Caução',
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar']
  },
  {
    nome: 'Clientes',
    label: 'Clientes',
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar']
  },
  {
    nome: 'Representantes',
    label: 'Representantes',
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar']
  },
  {
    nome: 'Comissoes',
    label: 'Comissões',
    permissoes: ['visualizar', 'editar', 'fechar', 'exportar']
  },
  {
    nome: 'Pagamentos',
    label: 'Pagamentos (Contas a Pagar)',
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'aprovar', 'exportar']
  },
  {
    nome: 'Produtos',
    label: 'Produtos/Estoque',
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar']
  },
  {
    nome: 'Cheques',
    label: 'Cheques',
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar']
  },
  {
    nome: 'Creditos',
    label: 'Créditos',
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar']
  },
  {
    nome: 'Fornecedores',
    label: 'Fornecedores',
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir']
  },
  {
    nome: 'FormasPagamento',
    label: 'Formas de Pagamento',
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir']
  },
  {
    nome: 'Relatorios',
    label: 'Relatórios',
    permissoes: ['visualizar', 'exportar']
  },
  {
    nome: 'Balanco',
    label: 'Balanço',
    permissoes: ['visualizar', 'exportar']
  },
  {
    nome: 'Usuarios',
    label: 'Usuários/Configurações',
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir']
  }
];

const permissoesLabels = {
  visualizar: 'Visualizar',
  adicionar: 'Adicionar',
  editar: 'Editar',
  excluir: 'Excluir',
  liquidar: 'Liquidar/Financeiro',
  fechar: 'Fechar Mês',
  aprovar: 'Aprovar',
  juntar: 'Juntar/Mesclar',
  exportar: 'Exportar/Imprimir'
};

function criarPermissoesDefault() {
  const perms = {};
  modulosConfig.forEach(modulo => {
    perms[modulo.nome] = {};
    modulo.permissoes.forEach(perm => {
      perms[modulo.nome][perm] = false;
    });
  });
  return perms;
}

export default function UsuarioForm({ user, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    full_name: '',
    setor: '',
    permissoes: criarPermissoesDefault()
  });

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        setor: user.setor || '',
        permissoes: user.permissoes || criarPermissoesDefault()
      });
    }
  }, [user]);

  const handleSave = () => {
    onSave(form);
  };

  const updatePermissao = (modulo, permissao, valor) => {
    setForm(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [modulo]: {
          ...prev.permissoes[modulo],
          [permissao]: valor
        }
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

      <TabsContent value="dados" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nome Completo *</Label>
          <Input
            id="full_name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Nome completo do usuário"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={user?.email || ''}
            disabled
            className="bg-slate-100"
          />
          <p className="text-xs text-slate-500">O email não pode ser alterado</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="setor">Setor</Label>
          <Input
            id="setor"
            value={form.setor}
            onChange={(e) => setForm({ ...form, setor: e.target.value })}
            placeholder="Ex: Financeiro, Vendas, TI..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Perfil</Label>
          <Input
            id="role"
            value={user?.role === 'admin' ? 'Administrador' : 'Usuário'}
            disabled
            className="bg-slate-100"
          />
          <p className="text-xs text-slate-500">O perfil não pode ser alterado aqui</p>
        </div>
      </TabsContent>

      <TabsContent value="permissoes" className="mt-4">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-slate-700">
              <strong>Configure as permissões por módulo.</strong> Marque as caixas conforme o nível de acesso necessário.
            </p>
          </Card>

          {/* Tabela de Permissões */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300">
                  <th className="text-left p-3 text-sm font-bold text-slate-700 sticky left-0 bg-slate-100">Módulo</th>
                  {Object.keys(permissoesLabels).map(key => (
                    <th key={key} className="text-center p-2 text-xs font-medium text-slate-600">
                      <button
                        type="button"
                        onClick={() => togglePermissaoGlobal(key)}
                        className="hover:text-blue-600 transition-colors flex flex-col items-center gap-1"
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>{permissoesLabels[key]}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {modulosConfig.map(modulo => {
                  const permsModulo = form.permissoes[modulo.nome] || {};
                  const todasMarcadas = modulo.permissoes.every(p => permsModulo[p]);
                  
                  return (
                    <tr key={modulo.nome} className="hover:bg-slate-50">
                      <td className="p-3 sticky left-0 bg-white hover:bg-slate-50">
                        <button
                          type="button"
                          onClick={() => toggleModuloCompleto(modulo.nome)}
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors font-medium text-sm"
                        >
                          <CheckSquare className={cn("w-4 h-4", todasMarcadas && "text-blue-600")} />
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
                                className="mx-auto"
                              />
                            ) : (
                              <span className="text-slate-300">-</span>
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
      </TabsContent>

      <div className="flex justify-end gap-3 pt-4 border-t mt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>
    </Tabs>
  );
}