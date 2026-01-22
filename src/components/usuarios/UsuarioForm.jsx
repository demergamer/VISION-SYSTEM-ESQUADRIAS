import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Save, X } from "lucide-react";

const permissoesDefault = {
  Dashboard: false,
  Representantes: { acesso: false, visualizar: false, adicionar: false, editar: false },
  Clientes: { acesso: false, visualizar: false, adicionar: false, editar: false },
  Pedidos: { acesso: false, visualizar: false, adicionar: false, editar: false, liquidar: false },
  Creditos: { acesso: false, visualizar: false, adicionar: false, editar: false },
  Cheques: { acesso: false, visualizar: false, adicionar: false, editar: false, excluir: false },
  Comissoes: false,
  Balanco: false,
  Relatorios: false,
  Usuarios: { acesso: false, visualizar: false, adicionar: false, editar: false },
  ChequesPagar: false,
  Logs: false,
  CadastroFornecedor: false,
  FormasPagamento: false,
  SolicitacaoCadastro: false,
  Orcamentos: false,
  CadastroPecas: false,
  AgruparOrcamentos: false
};

export default function UsuarioForm({ user, onSave, onCancel, isLoading }) {
  const [form, setForm] = useState({
    full_name: '',
    setor: '',
    permissoes: permissoesDefault
  });

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        setor: user.setor || '',
        permissoes: user.permissoes || permissoesDefault
      });
    }
  }, [user]);

  const handleSave = () => {
    onSave(form);
  };

  const updatePermissao = (setor, funcao = null, valor) => {
    const novasPermissoes = { ...form.permissoes };
    if (funcao) {
      novasPermissoes[setor] = { ...novasPermissoes[setor], [funcao]: valor };
      // Se desmarcar acesso, desmarcar todas as funções
      if (funcao === 'acesso' && !valor) {
        Object.keys(novasPermissoes[setor]).forEach(key => {
          if (key !== 'acesso') novasPermissoes[setor][key] = false;
        });
      }
    } else {
      novasPermissoes[setor] = valor;
    }
    setForm({ ...form, permissoes: novasPermissoes });
  };

  const setorComFuncoes = ['Representantes', 'Clientes', 'Pedidos', 'Creditos', 'Cheques', 'Usuarios'];
  const setoresSemFuncoes = ['Dashboard', 'Comissoes', 'Balanco', 'Relatorios', 'ChequesPagar', 'Logs', 'CadastroFornecedor', 'FormasPagamento', 'SolicitacaoCadastro', 'Orcamentos', 'CadastroPecas', 'AgruparOrcamentos'];

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      <div className="space-y-4">
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
      </div>

      {/* Permissões */}
      <div className="space-y-3 pt-4 border-t">
        <h3 className="font-semibold text-lg">Permissões de Acesso</h3>
        
        {/* Setores sem funções detalhadas */}
        {setoresSemFuncoes.map(setor => (
          <Card key={setor} className="p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.permissoes[setor]}
                onCheckedChange={(checked) => updatePermissao(setor, null, checked)}
              />
              <Label className="cursor-pointer font-medium">{setor}</Label>
            </div>
          </Card>
        ))}

        {/* Setores com funções detalhadas */}
        {setorComFuncoes.map(setor => {
          const permSetor = form.permissoes[setor];
          const funcoes = Object.keys(permSetor).filter(k => k !== 'acesso');
          
          return (
            <Card key={setor} className="p-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={permSetor.acesso}
                    onCheckedChange={(checked) => updatePermissao(setor, 'acesso', checked)}
                  />
                  <Label className="cursor-pointer font-semibold text-base">{setor}</Label>
                </div>
                
                {permSetor.acesso && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    {funcoes.map(funcao => (
                      <div key={funcao} className="flex items-center gap-2">
                        <Checkbox
                          checked={permSetor[funcao]}
                          onCheckedChange={(checked) => updatePermissao(setor, funcao, checked)}
                        />
                        <Label className="cursor-pointer text-sm capitalize">{funcao}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
}