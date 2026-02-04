import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function usePermissions() {
  const { data: user, isLoading } = useQuery({ 
    queryKey: ['me'], 
    queryFn: () => base44.auth.me(),
    staleTime: 1000 * 60 * 10,
  });

  const canAccess = (setor) => {
    if (!user) return false;
    const permissoes = user.permissoes || {};
    const perm = permissoes[setor];
    return perm === true || perm?.visualizar === true;
  };

  const canDo = (setor, funcao) => {
    if (!user) return false;
    const permissoes = user.permissoes || {};
    const setorPerms = permissoes[setor];
    
    if (!setorPerms) return false;
    if (setorPerms === true) return true;
    return setorPerms[funcao] === true;
  };

  const can = (setor, funcao) => canDo(setor, funcao);

  return { user, loading: isLoading, canAccess, canDo, can };
}