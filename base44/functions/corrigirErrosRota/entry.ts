import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { rota_id } = await req.json();
    
    const rotas = await base44.entities.RotaCobranca.filter({ id: rota_id });
    if (!rotas?.[0]) {
      return Response.json({ error: 'Rota não encontrada' }, { status: 404 });
    }

    const rota = rotas[0];
    const clientesDB = await base44.entities.Cliente.list('codigo', 500);
    
    let corrigidos = 0;
    const dadosAtualizados = (rota.dados_cobranca || []).map(item => {
      const clienteDB = clientesDB.find(c => c.codigo === item.cliente_codigo);
      
      if (clienteDB) {
        const endereco = [clienteDB.endereco, clienteDB.numero]
          .filter(Boolean).join(', ');
        const endereco_completo = [endereco, clienteDB.cidade, clienteDB.estado || 'SP']
          .filter(Boolean).join(', ') + ', Brasil';
        
        const atualizado = {
          ...item,
          cliente_cidade: clienteDB.cidade || item.cliente_cidade || '',
          cliente_estado: clienteDB.estado || 'SP',
          cliente_endereco_completo: endereco_completo,
          cliente_latitude: clienteDB.latitude || item.cliente_latitude || null,
          cliente_longitude: clienteDB.longitude || item.cliente_longitude || null,
        };
        
        if (atualizado.cliente_cidade !== item.cliente_cidade) corrigidos++;
        return atualizado;
      }
      return item;
    });

    await base44.entities.RotaCobranca.update(rota_id, { dados_cobranca: dadosAtualizados });
    const rotaAtualizada = await base44.entities.RotaCobranca.filter({ id: rota_id });
    
    return Response.json({ 
      success: true, 
      rota: rotaAtualizada[0],
      corrigidos
    });
  } catch (error) {
    console.error('Erro ao corrigir rota:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});