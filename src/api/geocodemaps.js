const API_KEY = import.meta.env.VITE_GEOCODE_API_KEY;

if (!API_KEY) {
  console.warn('VITE_GEOCODE_API_KEY não encontrada no arquivo .env');
}

export async function geocodeEndereco(enderecoCompleto) {
  if (!API_KEY) return null;
  if (!enderecoCompleto?.trim() || enderecoCompleto.length < 15) return null;

  const url = `https://geocode.maps.co/search?q=${encodeURIComponent(enderecoCompleto)}&api_key=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`geocode.maps.co retornou ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const best = data[0];
      return {
        latitude: parseFloat(best.lat),
        longitude: parseFloat(best.lon),
        formatted: best.display_name || null,
        confidence: best.confidence || 1
      };
    }
  } catch (err) {
    console.error('Erro ao geocodificar:', err);
  }

  return null;
}
