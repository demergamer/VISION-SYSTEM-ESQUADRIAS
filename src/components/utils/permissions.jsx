// src/components/utils/permissions.jsx

/**
 * Ícones para cada tipo de permissão (Exibidos no cabeçalho da tabela)
 */
export const PERMISSOES_LABELS = {
  visualizar: '👁️',
  adicionar: '➕',
  editar: '✏️',
  excluir: '🗑️',
  
  // Financeiro / Fluxo
  liquidar: '💰',
  liquidacao_massa: '💸',
  confirmar_transito: '🚚',
  fechar: '🔒',
  aprovar: '✅',
  cancelar: '🚫',
  
  // Dados Sensíveis
  ver_custo: '💲',
  ver_total: 'Σ',
  
  // Utilitários
  imprimir: '🖨️',
  exportar: '📄',
  enviar: '📧'
};

/**
 * Descrição legível para o tooltip ou legenda
 */
export const PERMISSOES_DESCRICOES = {
  visualizar: 'Ver Lista/Detalhes',
  adicionar: 'Criar Novo',
  editar: 'Editar Dados',
  excluir: 'Excluir (Apagar)',
  liquidar: 'Autorizar Liquidação',
  liquidacao_massa: 'Liquidação em Massa',
  confirmar_transito: 'Confirmar Trânsito',
  fechar: 'Fechar Caixa/Mês',
  aprovar: 'Aprovar Pedido/Orçamento',
  cancelar: 'Cancelar (Estornar)',
  ver_custo: 'Ver Custo e Margem',
  ver_total: 'Ver Totais Financeiros',
  imprimir: 'Imprimir/Gerar PDF',
  exportar: 'Exportar Excel/CSV',
  enviar: 'Enviar Email/Msg'
};

/**
 * Configuração dos Módulos e quais permissões cada um suporta.
 * IMPORTANTE: O campo 'nome' deve bater EXATAMENTE com as chaves do PAGE_PERMISSIONS no App.jsx.
 */
export const MODULOS_CONFIG = [
  // --- GRUPO: PRINCIPAL ---
  { 
    nome: 'Dashboard', 
    label: '📊 Dashboard', 
    grupo: 'Principal', 
    permissoes: ['visualizar', 'ver_total'] 
  },
  
  // --- GRUPO: VENDAS ---
  { 
    nome: 'Pedidos', 
    label: '🛒 Pedidos', 
    grupo: 'Vendas', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'cancelar', 'aprovar', 'liquidar', 'liquidacao_massa', 'confirmar_transito', 'imprimir', 'exportar'] 
  },
  { 
    nome: 'Orcamentos', 
    label: '📝 Orçamentos', 
    grupo: 'Vendas', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'aprovar', 'imprimir', 'enviar', 'exportar'] 
  },
  { 
    nome: 'EntradaCaucao', 
    label: '🤝 Entrada/Caução', 
    grupo: 'Vendas', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'imprimir'] 
  },

  // --- GRUPO: CADASTROS ---
  { 
    nome: 'Produtos', 
    label: '📦 Produtos', 
    grupo: 'Cadastros', 
    // 'ver_custo' permite esconder o preço de custo de vendedores
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'ver_custo', 'exportar'] 
  },
  { 
    nome: 'Clientes', 
    label: '🏢 Clientes', 
    grupo: 'Cadastros', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] 
  },
  { 
    nome: 'Representantes', 
    label: '👤 Representantes', 
    grupo: 'Cadastros', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] 
  },
  { 
    nome: 'Motoristas', 
    label: '🚗 Motoristas', 
    grupo: 'Cadastros', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] 
  },
  { 
    nome: 'Fornecedores', 
    label: '🚛 Fornecedores', 
    grupo: 'Cadastros', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] 
  },
  { 
    nome: 'FormasPagamento', 
    label: '💳 Formas Pagto', 
    grupo: 'Cadastros', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] 
  },
  
  // --- GRUPO: FINANCEIRO ---
  { 
    nome: 'Financeiro', 
    label: '💰 Visão Geral', 
    grupo: 'Financeiro', 
    permissoes: ['visualizar', 'ver_total'] 
  },
  { 
    nome: 'Pagamentos', 
    label: '💸 Contas a Pagar', 
    grupo: 'Financeiro', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'liquidar', 'cancelar', 'exportar'] 
  },
  { 
    nome: 'Cheques', 
    label: '🎫 Cheques', 
    grupo: 'Financeiro', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'liquidar', 'exportar'] 
  },
  { 
    nome: 'CaixaDiario', 
    label: '🏧 Caixa Diário', 
    grupo: 'Financeiro', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'fechar', 'exportar'] 
  },
  { 
    nome: 'Comissoes', 
    label: '💼 Comissões', 
    grupo: 'Financeiro', 
    permissoes: ['visualizar', 'editar', 'fechar', 'exportar'] 
  },
  { 
    nome: 'Creditos', 
    label: '💵 Créditos Clientes', 
    grupo: 'Financeiro', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] 
  },
  
  // --- GRUPO: ANALYTICS / RELATÓRIOS ---
  { 
    nome: 'Relatorios', 
    label: '📈 Relatórios Gerais', 
    grupo: 'Analytics', 
    permissoes: ['visualizar', 'ver_total', 'exportar'] 
  },
  { 
    nome: 'Balanco', 
    label: '⚖️ Balanço', 
    grupo: 'Analytics', 
    permissoes: ['visualizar', 'ver_total', 'exportar'] 
  },

  // --- GRUPO: PORTARIA ---
  { 
    nome: 'Portaria', 
    label: '🏢 Hub Portaria', 
    grupo: 'Portaria', 
    permissoes: ['visualizar'] 
  },
  { 
    nome: 'EstacionamentoVirtual', 
    label: '🅿️ Estacionamento Virtual', 
    grupo: 'Portaria', 
    permissoes: ['visualizar'] 
  },
  { 
    nome: 'ControleCirculacao', 
    label: '📋 Controle de Circulação', 
    grupo: 'Portaria', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] 
  },

  // --- GRUPO: ADMINISTRAÇÃO ---
  { 
    nome: 'Usuarios', 
    label: '👥 Usuários', 
    grupo: 'Admin', 
    permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] 
  },
  { 
     nome: 'Logs', 
     label: '📜 Logs do Sistema', 
     grupo: 'Admin', 
     permissoes: ['visualizar'] 
   },
   { 
     nome: 'ConfiguracoesLojas', 
     label: '🏪 Configurações Lojas', 
     grupo: 'Admin', 
     permissoes: ['visualizar', 'editar'] 
   }
  ];

/**
 * Função auxiliar para criar o objeto de permissões inicial (tudo false)
 */
export function criarPermissoesDefault() {
  const perms = {};
  MODULOS_CONFIG.forEach(modulo => {
    perms[modulo.nome] = {};
    modulo.permissoes.forEach(perm => { 
      perms[modulo.nome][perm] = false; 
    });
  });
  return perms;
}