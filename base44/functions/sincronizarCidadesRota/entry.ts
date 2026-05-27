import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { rota_id } = await req.json();
    
    // Buscar a rota
    const rotas = await base44.entities.RotaCobranca.filter({ id: rota_id });
    if (!rotas || rotas.length === 0) {
      return Response.json({ error: 'Rota não encontrada' }, { status: 404 });
    }

    const rota = rotas[0];
    const dadosCobranca = rota.dados_cobranca || [];
    
    // Buscar todos os clientes do banco
    const clientesDB = await base44.entities.Cliente.list('codigo', 500);
    
    // Atualizar cidades faltantes
    const dadosAtualizados = dadosCobranca.map(item => {
      const clienteDB = clientesDB.find(c => c.codigo === item.cliente_codigo);
      
      // Se não tem cidade, tenta do cliente DB
      const cidade = item.cliente_cidade?.trim() ? item.cliente_cidade : (clienteDB?.cidade || '');
      const estado = item.cliente_estado?.trim() ? item.cliente_estado : (clienteDB?.estado || 'SP');
      
      if (!cidade && clienteDB?.cidade) {
        return {
          ...item,
          cliente_cidade: clienteDB.cidade,
          cliente_estado: clienteDB.estado || 'SP',
          cliente_endereco_completo: [
            clienteDB.endereco,
            clienteDB.numero,
            clienteDB.cidade,
            clienteDB.estado || 'SP'
          ].filter(Boolean).join(', ') + ', Brasil' || item.cliente_endereco_completo || '',
        };
      }
      return item;
    });

    // Salvar de volta
    await base44.entities.RotaCobranca.update(rota_id, { dados_cobranca: dadosAtualizados });
    
    const rotaAtualizada = await base44.entities.RotaCobranca.filter({ id: rota_id });
    
    return Response.json({ 
      success: true, 
      rota: rotaAtualizada[0],
      atualizados: dadosAtualizados.filter((d, i) => d.cliente_cidade !== dadosCobranca[i]?.cliente_cidade).length
    });
  } catch (error) {
    console.error('Erro ao sincronizar cidades:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});