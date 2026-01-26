import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function PermissionGuard({ setor, funcao, children, showBlocked = true }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  }

  // Admin tem acesso total
  if (user?.role === 'admin') {
    return <>{children}</>;
  }

  // Verificar permissões granulares
  const permissoes = user?.permissoes || {};
  
  // Setor sem função específica (acesso à página)
  if (!funcao) {
    const temAcesso = permissoes[setor]?.visualizar === true;
    
    if (!temAcesso && showBlocked) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
          <Card className="p-8 max-w-md text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Bloqueado</h2>
            <p className="text-slate-600">
              Você não tem permissão para acessar <strong>{setor}</strong>.
            </p>
            <p className="text-sm text-slate-500 mt-4">
              Entre em contato com o administrador do sistema para solicitar acesso.
            </p>
          </Card>
        </div>
      );
    }
    
    return temAcesso ? <>{children}</> : null;
  }

  // Função específica dentro do setor
  const temAcesso = permissoes[setor]?.[funcao] === true;

  if (!temAcesso) {
    return null;
  }

  return <>{children}</>;
}