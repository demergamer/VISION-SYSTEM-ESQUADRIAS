import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Mapeamento: entidade -> query keys que devem ser invalidadas
const ENTITY_QUERY_KEYS = {
  Tarefa:               [['tarefas'], ['tarefas_calendario']],
  Pedido:               [['pedidos'], ['pedidos_rota'], ['bordero'], ['pendentes_aprovacao'], ['pedidos_motorista_portal'], ['rotas_checklist'], ['rotas_pendentes'], ['rotas_parciais'], ['rotas_concluidas']],
  RotaImportada:        [['rotas'], ['rotas_importadas'], ['rotas_motorista_portal'], ['rotas_checklist'], ['rotas_pendentes'], ['rotas_parciais'], ['rotas_concluidas'], ['pedidos_rota']],
  Cliente:              [['clientes']],
  Representante:        [['representantes']],
  Motorista:            [['motoristas']],
  Produto:              [['produtos']],
  Fornecedor:           [['fornecedores']],
  ContaPagar:           [['contas_pagar'], ['pagamentos']],
  CaixaDiario:          [['caixa_diario'], ['caixa']],
  Cheque:               [['cheques']],
  Credito:              [['creditos']],
  LiquidacaoPendente:   [['liquidacoes_pendentes'], ['pendentes_aprovacao']],
  Bordero:              [['borderos'], ['bordero']],
  BorderoPagamento:     [['borderos_pagamento']],
  Port:                 [['ports'], ['entradas_caucao']],
  CommissionEntry:      [['commission_entries'], ['comissoes']],
  FechamentoComissao:   [['fechamentos_comissao'], ['comissoes']],
  Notificacao:          [['notificacoes_bell'], ['notificacoes']],
  Orcamento:            [['orcamentos']],
  ConfiguracoesLoja:    [['configuracoes_loja'], ['lojas']],
  FormaPagamento:       [['formas_pagamento']],
  LinhaProduto:         [['linhas_produto']],
  ProducaoItem:         [['producao_items']],
};

/**
 * Hook que sincroniza em tempo real via WebSocket (sem consumir créditos de integração).
 * Deve ser ativado UMA VEZ no Layout para funcionar em toda a aplicação.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribers = [];

    Object.entries(ENTITY_QUERY_KEYS).forEach(([entityName, queryKeys]) => {
      try {
        const entity = base44.entities[entityName];
        if (!entity?.subscribe) return;

        const unsubscribe = entity.subscribe(() => {
          // Invalida todas as queries relacionadas a essa entidade
          queryKeys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        });

        unsubscribers.push(unsubscribe);
      } catch {
        // Silencioso: entidade pode não existir em todas as versões
      }
    });

    return () => {
      unsubscribers.forEach(unsub => { try { unsub(); } catch {} });
    };
  }, [queryClient]);
}