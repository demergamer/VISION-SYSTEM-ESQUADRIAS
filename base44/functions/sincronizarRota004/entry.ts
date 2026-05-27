import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Buscar a rota 004
    const rotas = await base44.asServiceRole.entities.RotaCobranca.list();
    const rota = rotas.find(r => r.codigo_rota === 'ROTA-004');

    if (!rota) {
      return Response.json({ error: 'Rota 004 não encontrada' }, { status: 404 });
    }

    // Buscar todos os clientes
    const clientes = await base44.asServiceRole.entities.Cliente.list();

    // Reconstruir dados_cobranca com informações corretas
    const dadosCobrancaAtualizado = (rota.dados_cobranca || []).map(item => {
      const clienteDB = clientes.find(c => c.codigo === item.cliente_codigo);

      if (!clienteDB) {
        return item; // Se cliente não existe, mantém como está
      }

      // Montar endereço completo correto
      const enderecoParts = [
        clienteDB.endereco,
        clienteDB.numero,
        clienteDB.cidade,
        clienteDB.estado || 'SP'
      ].filter(Boolean);
      const enderecoCompleto = clienteDB.cidade
        ? enderecoParts.join(', ') + ', Brasil'
        : '';

      // Montar lista de contatos
      const contatos = [
        clienteDB.telefone_1 ? { telefone: clienteDB.telefone_1, nome: clienteDB.responsavel_1 || '' } : null,
        clienteDB.telefone_2 ? { telefone: clienteDB.telefone_2, nome: clienteDB.responsavel_2 || '' } : null,
        clienteDB.telefone_3 ? { telefone: clienteDB.telefone_3, nome: clienteDB.responsavel_3 || '' } : null,
        ...(clienteDB.contatos_lista || []).map(c => ({ telefone: c.telefone, nome: c.nome_responsavel || '' })),
      ].filter(Boolean);

      const todosTelefones = [
        clienteDB.telefone_1,
        clienteDB.telefone_2,
        clienteDB.telefone_3,
        ...(clienteDB.contatos_lista || []).map(c => c.telefone)
      ].filter(Boolean);

      return {
        ...item,
        cliente_nome: clienteDB.nome || item.cliente_nome,
        cliente_telefone: clienteDB.telefone_1 || item.cliente_telefone,
        todos_telefones: todosTelefones,
        contatos_nomeados: contatos,
        cliente_cidade: clienteDB.cidade || item.cliente_cidade,
        cliente_regiao: clienteDB.regiao || clienteDB.cidade || item.cliente_regiao,
        cliente_endereco_completo: enderecoCompleto,
        cliente_latitude: clienteDB.latitude || item.cliente_latitude,
        cliente_longitude: clienteDB.longitude || item.cliente_longitude,
      };
    });

    // Atualizar a rota
    await base44.asServiceRole.entities.RotaCobranca.update(rota.id, {
      dados_cobranca: dadosCobrancaAtualizado,
    });

    return Response.json({
      success: true,
      message: 'Rota 004 sincronizada com sucesso!',
      clientesAtualizados: dadosCobrancaAtualizado.length
    });
  } catch (error) {
    console.error('Erro ao sincronizar rota:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});