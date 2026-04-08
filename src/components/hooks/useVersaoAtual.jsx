import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Retorna a versão mais recente registrada na entidade Atualizacao.
 * Usado pelo Layout (sidebar) e pela página Welcome.
 */
export function useVersaoAtual() {
  const { data } = useQuery({
    queryKey: ['atualizacoes_versao_atual'],
    queryFn: async () => {
      const lista = await base44.entities.Atualizacao.list('-data_publicacao', 1);
      return lista[0]?.versao ?? null;
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });

  return data ? `v${data}` : 'v—';
}