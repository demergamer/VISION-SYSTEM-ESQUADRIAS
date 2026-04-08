import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const VERSAO_INICIAL = "1.0.0001";

  const existentes = await base44.asServiceRole.entities.Atualizacao.filter({ versao: VERSAO_INICIAL });

  if (existentes && existentes.length > 0) {
    return Response.json({ status: 'already_exists', versao: VERSAO_INICIAL });
  }

  const novo = await base44.asServiceRole.entities.Atualizacao.create({
    versao: VERSAO_INICIAL,
    descricao_simples: "Lançamento do novo sistema de registro de atualizações. Agora você pode acompanhar todas as melhorias e correções feitas no Vision System diretamente por aqui!",
    descricao_tecnica: "Implementação da entidade Atualizacao, página de timeline interativa com paginação, e integração do versionamento do public/version.json com o banco de dados.",
    data_publicacao: new Date().toISOString(),
  });

  return Response.json({ status: 'created', data: novo });
});