// src/api/geocodemaps.js
const API_KEY = import.meta.env.VITE_GEOCODE_API_KEY;

if (!API_KEY) {
  console.warn('VITE_GEOCODE_API_KEY não encontrada no .env');
}

export async function geocodeEndereco(enderecoCompleto) {
  if (!API_KEY) {
    console.error('API Key ausente');
    return null;
  }

  if (!enderecoCompleto?.trim() || enderecoCompleto.trim().length < 15) {
    console.warn('Endereço muito curto ou vazio:', enderecoCompleto);
    return null;
  }

  // Força Brasil + bias para território brasileiro (melhora precisão)
  const params = new URLSearchParams({
    q: enderecoCompleto,
    api_key: API_KEY,
    countrycodes: 'br',          // ← Restringe ao Brasil (ISO 3166-1 alpha-2)
    limit: '3',                  // Pega até 3 resultados para escolher o melhor
    format: 'json',
    addressdetails: '1'
  });

  // Opcional: viewbox para Brasil inteiro (min_lon, min_lat, max_lon, max_lat)
  // params.append('viewbox', '-74.0,-33.7,-34.8,5.3'); // América do Sul/Brasil aproximado

  const url = `https://geocode.maps.co/search?${params.toString()}`;

  try {
    console.log('Requisição enviada para:', url); // ← Útil para debug

    const response = await fetch(url);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`geocode.maps.co erro ${response.status}: ${errText || response.statusText}`);
    }

    const data = await response.json();

    console.log('Resposta completa da API:', data); // ← Debug essencial!

    if (Array.isArray(data) && data.length > 0) {
      // Pega o primeiro com maior confidence (ou o primeiro se não tiver)
      const best = data.reduce((prev, curr) => 
        (curr.confidence || 0) > (prev.confidence || 0) ? curr : prev
      );

      if (best.lat && best.lon) {
        return {
          latitude: parseFloat(best.lat),
          longitude: parseFloat(best.lon),
          formatted: best.display_name || null,
          confidence: best.confidence || 1,
          osm_type: best.osm_type // opcional, ajuda a debug
        };
      }
    }

    console.warn('Nenhum resultado válido para:', enderecoCompleto);
    return null;
  } catch (err) {
    console.error('Falha total na geocodificação:', err.message);
    return null;
  }
}