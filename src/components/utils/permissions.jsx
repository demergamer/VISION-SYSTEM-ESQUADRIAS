// Configuração dos Módulos e Permissões do Sistema
export const MODULOS_CONFIG = [
  { nome: 'Dashboard', label: '📊 Dashboard', grupo: 'Principal', permissoes: ['visualizar'] },
  { nome: 'Pedidos', label: '🛒 Pedidos', grupo: 'Vendas', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'liquidar', 'exportar'] },
  { nome: 'Orcamentos', label: '📝 Orçamentos', grupo: 'Vendas', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'aprovar', 'exportar'] },
  { nome: 'EntradaCaucao', label: '💰 Entrada/Caução (PORT)', grupo: 'Vendas', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] },
  { nome: 'Clientes', label: '🏢 Clientes', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] },
  { nome: 'Representantes', label: '👤 Representantes', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] },
  { nome: 'Fornecedores', label: '🚛 Fornecedores', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] },
  { nome: 'Produtos', label: '📦 Produtos', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] },
  { nome: 'FormasPagamento', label: '💳 Formas de Pagamento', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] },
  { nome: 'Cheques', label: '🎫 Cheques', grupo: 'Financeiro', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] },
  { nome: 'Creditos', label: '💵 Créditos', grupo: 'Financeiro', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] },
  { nome: 'Pagamentos', label: '💸 Contas a Pagar', grupo: 'Financeiro', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'liquidar', 'exportar'] },
  { nome: 'CaixaDiario', label: '💰 Caixa Diário', grupo: 'Financeiro', permissoes: ['visualizar', 'adicionar', 'editar', 'exportar'] },
  { nome: 'Comissoes', label: '💼 Comissões', grupo: 'Financeiro', permissoes: ['visualizar', 'editar', 'fechar', 'exportar'] },
  { nome: 'Relatorios', label: '📈 Relatórios', grupo: 'Analytics', permissoes: ['visualizar', 'exportar'] },
  { nome: 'Balanco', label: '⚖️ Balanço', grupo: 'Analytics', permissoes: ['visualizar', 'exportar'] },
  { nome: 'Usuarios', label: '👥 Usuários', grupo: 'Admin', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] }
];

export const PERMISSOES_LABELS = {
  visualizar: '👁️',
  adicionar: '➕',
  editar: '✏️',
  excluir: '🗑️',
  liquidar: '💰',
  fechar: '🔒',
  aprovar: '✅',
  juntar: '🔗',
  exportar: '📄'
};

export const PERMISSOES_DESCRICOES = {
  visualizar: 'Ver',
  adicionar: 'Criar',
  editar: 'Editar',
  excluir: 'Excluir',
  liquidar: 'Liquidar',
  fechar: 'Fechar',
  aprovar: 'Aprovar',
  juntar: 'Juntar',
  exportar: 'Exportar'
};

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