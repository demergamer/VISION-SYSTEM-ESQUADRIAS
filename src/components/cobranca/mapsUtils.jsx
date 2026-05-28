/**
 * Utilitários de geração de URLs do Google Maps para a Rota do Gil.
 * Aplica chunking de até 9 paradas por URL para contornar o limite do Maps.
 */

/**
 * Calcula a distância em Km entre duas coordenadas usando a fórmula de Haversine.
 */
export function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Ordena um array de clientesAgrupados usando o algoritmo Nearest Neighbor,
 * partindo das coordenadas da fábrica em Ribeirão Pires.
 * Clientes sem coordenadas são colocados no final.
 */
export function otimizarOrdemNearestNeighbor(clientesAgrupados, startLat = -23.7141, startLon = -46.4137) {
  const comCoords = clientesAgrupados.filter(c => c.cliente_latitude && c.cliente_longitude);
  const semCoords = clientesAgrupados.filter(c => !c.cliente_latitude || !c.cliente_longitude);

  const ordenados = [];
  const restantes = [...comCoords];
  let latAtual = startLat;
  let lonAtual = startLon;

  while (restantes.length > 0) {
    let menorDist = Infinity;
    let idxMaisProximo = 0;
    restantes.forEach((c, i) => {
      const dist = calcularDistanciaHaversine(latAtual, lonAtual, c.cliente_latitude, c.cliente_longitude);
      if (dist < menorDist) { menorDist = dist; idxMaisProximo = i; }
    });
    const maisProximo = restantes.splice(idxMaisProximo, 1)[0];
    latAtual = maisProximo.cliente_latitude;
    lonAtual = maisProximo.cliente_longitude;
    ordenados.push(maisProximo);
  }

  return [...ordenados, ...semCoords];
}

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
  // 1. Prefere endereco completo
  if (item.cliente_endereco_completo?.trim()) return item.cliente_endereco_completo.trim();
  
  // 2. Tenta coordenadas
  if (item.cliente_latitude && item.cliente_longitude) {
    return `${item.cliente_latitude},${item.cliente_longitude}`;
  }
  
  // 3. Monta de partes
  const partes = [
    item.cliente_endereco,
    item.cliente_numero,
    item.cliente_cidade
  ].filter(p => p?.trim());
  
  if (partes.length > 0) {
    const estado = item.cliente_estado?.trim() || 'SP';
    return partes.join(', ') + ', ' + estado + ', Brasil';
  }
  
  // 4. Fallback para cidade + estado
  if (item.cliente_cidade?.trim()) {
    const estado = item.cliente_estado?.trim() || 'SP';
    return `${item.cliente_cidade}, ${estado}, Brasil`;
  }
  
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