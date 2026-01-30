export function createPageUrl(pageName) {
  if (!pageName) return '/';
  // Adiciona a barra inicial e garante que não haja espaços (troca por hífen)
  return '/' + pageName.replace(/ /g, '-');
}