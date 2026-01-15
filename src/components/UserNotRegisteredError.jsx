import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export function usePermissions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const canAccess = (setor) => {
    if (!user) return false;
    const permissoes = user.permissoes || {};
    const perm = permissoes[setor];
    return perm === true || perm?.acesso === true;
  };

  const canDo = (setor, funcao) => {
    if (!user) return false;
    const permissoes = user.permissoes || {};
    const setorPerms = permissoes[setor];
    
    // Se não tem acesso ao setor, não pode fazer nada
    if (!setorPerms?.acesso && setorPerms !== true) return false;
    
    // Se for setor simples (true/false)
    if (setorPerms === true) return true;
    
    // Verificar função específica
    return setorPerms?.[funcao] === true;
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