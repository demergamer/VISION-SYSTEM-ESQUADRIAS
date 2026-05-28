import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Buscar TODAS as rotas abertas (não apenas ROTA-004)
    const todasRotas = await base44.asServiceRole.entities.RotaCobranca.list();
    const rotasAbertas = todasRotas.filter(r => r.status === 'Aberta');

    if (!rotasAbertas.length) {
      return Response.json({ success: true, message: 'Nenhuma rota aberta para sincronizar', rotasAtualizadas: 0 });
    }

    // Buscar todos os clientes uma vez só
    const clientes = await base44.asServiceRole.entities.Cliente.list();

    let totalClientesAtualizados = 0;

    for (const rota of rotasAbertas) {
      const dadosCobrancaAtualizado = (rota.dados_cobranca || []).map(item => {
        const clienteDB = clientes.find(c => c.codigo === item.cliente_codigo);

        if (!clienteDB) return item;

        // Montar endereço completo
        const enderecoParts = [
          clienteDB.endereco,
          clienteDB.numero,
          clienteDB.cidade,
          clienteDB.estado || 'SP'
        ].filter(Boolean);
        const enderecoCompleto = clienteDB.cidade
          ? enderecoParts.join(', ') + ', Brasil'
          : '';

        // Montar contatos
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
          cliente_estado: clienteDB.estado || item.cliente_estado || 'SP',
          cliente_regiao: clienteDB.regiao || clienteDB.cidade || item.cliente_regiao,
          cliente_endereco_completo: enderecoCompleto || item.cliente_endereco_completo,
          cliente_latitude: clienteDB.latitude || item.cliente_latitude,
          cliente_longitude: clienteDB.longitude || item.cliente_longitude,
        };
      });

      await base44.asServiceRole.entities.RotaCobranca.update(rota.id, {
        dados_cobranca: dadosCobrancaAtualizado,
      });

      totalClientesAtualizados += dadosCobrancaAtualizado.length;
    }

    return Response.json({
      success: true,
      message: `${rotasAbertas.length} rota(s) sincronizada(s) com sucesso!`,
      rotasAtualizadas: rotasAbertas.length,
      clientesAtualizados: totalClientesAtualizados,
    });
  } catch (error) {
    console.error('Erro ao sincronizar rotas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});