import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function PermissionGuard({ setor, funcao, children, showBlocked = true }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    
    setMounted(true);
    base44.auth.me()
      .then((userData) => {
        setUser(userData);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [mounted]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se não há usuário logado, não renderizar nada (será tratado pelo sistema de auth)
  if (!user) {
    return null;
  }

  // CRÍTICO: Admin tem acesso total - NUNCA BLOQUEAR
  if (user.role === 'admin') {
    return <>{children}</>;
  }

  // Verificar permissões granulares para usuários não-admin
  const permissoes = user.permissoes || {};
  
  // Setor sem função específica (acesso à página completa)
  if (!funcao) {
    const temAcesso = permissoes[setor]?.visualizar === true;
    
    if (!temAcesso && showBlocked) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-slate-50 to-orange-50 flex items-center justify-center p-6">
          <Card className="p-8 max-w-md text-center shadow-2xl">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">🔒 Acesso Bloqueado</h2>
            <p className="text-slate-600 leading-relaxed">
              Você não tem permissão para acessar o módulo <strong className="text-red-600">{setor}</strong>.
            </p>
            <p className="text-sm text-slate-500 mt-4">
              Entre em contato com o administrador do sistema para solicitar as permissões necessárias.
            </p>
            <Button 
              onClick={() => window.location.href = createPageUrl('Dashboard')}
              className="mt-6 bg-blue-600 hover:bg-blue-700"
            >
              Voltar ao Dashboard
            </Button>
          </Card>
        </div>
      );
    }
    
    return temAcesso ? <>{children}</> : null;
  }

  // Função específica dentro do setor (ex: adicionar, editar, excluir)
  const temAcesso = permissoes[setor]?.[funcao] === true;

  // Se não tem acesso a função específica, não renderizar (esconder botão/componente)
  if (!temAcesso) {
    return null;
  }

  return <>{children}</>;
}