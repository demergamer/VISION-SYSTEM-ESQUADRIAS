import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export function usePermissions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Verifica se pode acessar uma página/setor inteiro
  const canAccess = (setor) => {
    if (!user) return false;
    
    // Admin precisa de permissão explícita também
    const permissoes = user.permissoes || {};
    const perm = permissoes[setor];

    // Se a permissão for true direto (legado) ou se tiver a flag 'visualizar'
    return perm === true || perm?.visualizar === true;
  };

  // Verifica se pode executar uma ação específica (botões)
  const canDo = (setor, funcao) => {
    if (!user) return false;
    
    const permissoes = user.permissoes || {};
    const setorPerms = permissoes[setor];
    
    // 1. Se não existe registro de permissão para esse setor, bloqueia
    if (!setorPerms) return false;
    
    // 2. Se for um booleano simples 'true', libera tudo
    if (setorPerms === true) return true;
    
    // 3. Se for um objeto, verifica a função específica
    return setorPerms[funcao] === true;
  };

  return { user, loading, canAccess, canDo };
}