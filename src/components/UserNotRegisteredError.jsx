import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export function usePermissions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca os dados do usuário atual
    base44.auth.me()
      .then(setUser)
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Verifica se pode acessar uma página/setor inteiro
  const canAccess = (setor) => {
    if (!user) return false;
    
    // Regra removida: Admin agora também precisa de permissão explícita
    // if (user.role === 'admin') return true; 

    const permissoes = user.permissoes || {};
    const perm = permissoes[setor];

    // Se a permissão for true direto (legado) ou se tiver a flag 'visualizar'
    return perm === true || perm?.visualizar === true;
  };

  // Verifica se pode executar uma ação específica (botões)
  const canDo = (setor, funcao) => {
    if (!user) return false;
    
    // Regra removida: Admin agora também precisa de permissão explícita
    // if (user.role === 'admin') return true; 

    const permissoes = user.permissoes || {};
    const setorPerms = permissoes[setor];
    
    // 1. Se não existe registro de permissão para esse setor, bloqueia.
    if (!setorPerms) return false;
    
    // 2. Se for um booleano simples 'true', libera tudo.
    if (setorPerms === true) return true;
    
    // 3. Se for um objeto, verifica a função específica (ex: 'editar', 'excluir')
    // Se a função for undefined no objeto, retorna false (bloqueado)
    return setorPerms[funcao] === true;
  };

  return { user, loading, canAccess, canDo };
}

export default function UserNotRegisteredError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="p-8 max-w-md text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
        <p className="text-slate-600">
          Você não tem permissão para realizar esta ação.
        </p>
        <p className="text-sm text-slate-500 mt-4">
          Entre em contato com o administrador do sistema.
        </p>
      </Card>
    </div>
  );
}