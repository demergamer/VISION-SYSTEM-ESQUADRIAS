import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
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

  // Se não há usuário logado, não renderizar nada
  if (!user) {
    return null;
  }

  // --- ALTERAÇÃO AQUI ---
  // A regra que dava acesso total ao admin foi REMOVIDA.
  // Agora o admin também passa pela verificação abaixo.

  // Verificar permissões granulares
  const permissoes = user.permissoes || {};
  
  // --- CASO 1: Bloqueio de Página Inteira (ex: Acessar /pedidos) ---
  if (!funcao) {
    // Verifica se tem a permissão de VISUALIZAR o setor
    const temAcesso = permissoes[setor]?.visualizar === true;
    
    if (!temAcesso) {
      if (showBlocked) {
        // Redireciona para a página dedicada de Acesso Negado
        return <Navigate to={createPageUrl('AcessoNegado')} replace />;
      }
      return null; // Apenas esconde (ex: botão no menu) se showBlocked for false
    }
    
    return <>{children}</>;
  }

  // --- CASO 2: Bloqueio de Função Específica (ex: Botão "Excluir") ---
  const temAcessoFuncao = permissoes[setor]?.[funcao] === true;

  // Se não tem acesso a função específica, não renderizar (esconder botão/componente)
  if (!temAcessoFuncao) {
    return null; 
  }

  return <>{children}</>;
}