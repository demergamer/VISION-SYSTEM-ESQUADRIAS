/**
 * Utilitários de geração de URLs do Google Maps para a Rota do Gil.
 * Aplica chunking de até 9 paradas por URL para contornar o limite do Maps.
 */

const FABRICA = 'J&C Esquadrias, Ribeirão Pires, SP, Brasil';
const CHUNK_SIZE = 9; // paradas por lote (excluindo origem/destino do chunk)

/**
 * Gera array de URLs do Google Maps com lotes de até CHUNK_SIZE paradas.
 * @param {string[]} paradas – array de endereços/coordenadas dos clientes (já filtrados)
 * @returns {string[]} – array de URLs (1 ou mais)
 */
export function gerarUrlsMaps(paradas) {
  if (!paradas || paradas.length === 0) return [];

  // Divide em chunks
  const chunks = [];
  for (let i = 0; i < paradas.length; i += CHUNK_SIZE) {
    chunks.push(paradas.slice(i, i + CHUNK_SIZE));
  }

  return chunks.map((chunk, idx) => {
    const origem = idx === 0 ? FABRICA : paradas[idx * CHUNK_SIZE - 1];
    const pontos = [origem, ...chunk];

    // Formata para URL do Maps (modo dir simples, sem API key)
    const encoded = pontos.map(p => encodeURIComponent(p)).join('/');
    return `https://www.google.com/maps/dir/${encoded}`;
  });
}

/**
 * Extrai endereço textual de um item da dados_cobranca.
 */
export function extrairEnderecoItem(item) {
  if (item.cliente_endereco_completo) return item.cliente_endereco_completo;
  if (item.cliente_latitude && item.cliente_longitude)
    return `${item.cliente_latitude},${item.cliente_longitude}`;
  if (item.cliente_cidade) return `${item.cliente_cidade}, SP, Brasil`;
  return null;
}

/**
 * Retorna paradas válidas (não recusadas, com endereço).
 */
export function getParadasValidas(itens) {
  return itens
    .filter(i => !i.recusado)
    .map(extrairEnderecoItem)
    .filter(Boolean);
}