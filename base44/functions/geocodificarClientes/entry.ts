import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function geocodificarNominatim(endereco) {
  const params = new URLSearchParams({
    q: endereco,
    format: 'json',
    countrycodes: 'br',
    limit: '1',
    addressdetails: '0',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'JCVisionSystem/1.0' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.length > 0) {
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  }
  return null;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Busca todos os clientes sem lat/lon
    const todos = await base44.asServiceRole.entities.Cliente.list('nome', 5000);
    const semCoordenada = todos.filter(c => !c.latitude || !c.longitude);

    let ok = 0, erro = 0, pulado = 0;
    const detalhes = [];

    for (const c of semCoordenada) {
      if (!c.cidade) {
        pulado++;
        detalhes.push({ nome: c.nome, status: 'pulado', motivo: 'sem cidade' });
        continue;
      }

      const enderecoCompleto = [c.endereco, c.numero, c.cidade, c.estado].filter(Boolean).join(', ') + ', Brasil';
      const enderecoFallback = [c.cidade, c.estado].filter(Boolean).join(', ') + ', Brasil';

      try {
        let geo = await geocodificarNominatim(enderecoCompleto);
        if (!geo) {
          await sleep(700);
          geo = await geocodificarNominatim(enderecoFallback);
        }

        if (geo?.latitude && geo?.longitude) {
          await base44.asServiceRole.entities.Cliente.update(c.id, {
            latitude: geo.latitude,
            longitude: geo.longitude,
          });
          ok++;
          detalhes.push({ nome: c.nome, status: 'ok', lat: geo.latitude, lon: geo.longitude });
        } else {
          erro++;
          detalhes.push({ nome: c.nome, status: 'erro', motivo: 'sem resultado' });
        }
      } catch (e) {
        erro++;
        detalhes.push({ nome: c.nome, status: 'erro', motivo: e.message });
      }

      // Rate limit Nominatim: 1 req/s
      await sleep(1100);
    }

    return Response.json({
      total: semCoordenada.length,
      ok,
      erro,
      pulado,
      detalhes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});