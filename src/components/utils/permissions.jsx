export const PERMISSOES_LABELS = {
  visualizar: '👁️', adicionar: '➕', editar: '✏️', excluir: '🗑️',
  liquidar: '💰', fechar: '🔒', aprovar: '✅', juntar: '🔗', exportar: '📄'
};

export const PERMISSOES_DESCRICOES = {
  visualizar: 'Ver', adicionar: 'Criar', editar: 'Editar', excluir: 'Excluir',
  liquidar: 'Liquidar', fechar: 'Fechar', aprovar: 'Aprovar', juntar: 'Juntar', exportar: 'Exportar'
};

export const MODULOS_CONFIG = [
  // PRINCIPAL
  { nome: 'Dashboard', label: '📊 Dashboard', grupo: 'Principal', permissoes: ['visualizar'] },
  
  // VENDAS
  { nome: 'Pedidos', label: '🛒 Pedidos', grupo: 'Vendas', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'liquidar', 'exportar'] },
  { nome: 'Orcamentos', label: '📝 Orçamentos', grupo: 'Vendas', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'aprovar', 'exportar'] },
  
  // CADASTROS
  { nome: 'Clientes', label: '🏢 Clientes', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] },
  { nome: 'Representantes', label: '👤 Representantes', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] },
  { nome: 'Fornecedores', label: '🚛 Fornecedores', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] },
  { nome: 'Produtos', label: '📦 Produtos', grupo: 'Cadastros', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir', 'exportar'] },
  
  // FINANCEIRO
  { nome: 'Financeiro', label: '💰 Financeiro Geral', grupo: 'Financeiro', permissoes: ['visualizar'] },
  { nome: 'Cheques', label: '🎫 Cheques', grupo: 'Financeiro', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] },
  { nome: 'Pagamentos', label: '💸 Contas a Pagar', grupo: 'Financeiro', permissoes: ['visualizar', 'adicionar', 'editar', 'liquidar'] },
  { nome: 'Comissoes', label: '💼 Comissões', grupo: 'Financeiro', permissoes: ['visualizar', 'editar', 'fechar'] },
  { nome: 'Creditos', label: '💵 Créditos', grupo: 'Financeiro', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] },

  // ADMIN
  { nome: 'Usuarios', label: '👥 Usuários', grupo: 'Admin', permissoes: ['visualizar', 'adicionar', 'editar', 'excluir'] },
  { nome: 'Logs', label: '📜 Logs do Sistema', grupo: 'Admin', permissoes: ['visualizar'] }
];

export function criarPermissoesDefault() {
  const perms = {};
  MODULOS_CONFIG.forEach(modulo => {
    perms[modulo.nome] = {};
    modulo.permissoes.forEach(perm => { perms[modulo.nome][perm] = false; });
  });
  return perms;
}