/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const pedidosEmProducao = await base44.asServiceRole.entities.Pedido.filter({ status: 'emproducao' });

  if (pedidosEmProducao.length === 0) {
    return Response.json({ success: true, deleted: 0, message: 'Nenhum pedido em produção para remover.' });
  }

  const BATCH = 50;
  let deleted = 0;

  for (let i = 0; i < pedidosEmProducao.length; i += BATCH) {
    const lote = pedidosEmProducao.slice(i, i + BATCH);
    await Promise.all(lote.map(p => base44.asServiceRole.entities.Pedido.delete(p.id)));
    deleted += lote.length;
  }

  return Response.json({
    success: true,
    deleted,
    message: `${deleted} pedido(s) em produção removidos com sucesso.`
  });
});