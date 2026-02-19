/**
 * POST /despacharSincronizacao
 *
 * Endpoint leve: apenas cria um SyncJob "pendente" e dispara o worker
 * via SDK service-role (sem depender de URL auto-derivada ou token manual).
 * Acesso: somente admin.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user   = await base44.auth.me();
  if (!user)                 return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden'    }, { status: 403 });

  // Verifica se já há um job em andamento (evita disparo duplo)
  const emAndamento = await base44.asServiceRole.entities.SyncJob.filter({
    status: 'processando',
    tipo:   'sincronizar_comissoes',
  });
  if (emAndamento.length > 0) {
    return Response.json({
      status:  'already_running',
      message: 'Já existe uma sincronização em andamento.',
      job_id:  emAndamento[0].id,
    }, { status: 409 });
  }

  // Cria o job na fila
  const job = await base44.asServiceRole.entities.SyncJob.create({
    tipo:           'sincronizar_comissoes',
    status:         'pendente',
    solicitado_por: user.email,
  });

  console.log(`[Despachar] ✅ Job ${job.id} criado. Disparando worker...`);

  // Dispara o worker via SDK (service role — sem depender de URL ou token manual)
  base44.asServiceRole.functions.invoke('executarSyncWorker', { job_id: job.id })
    .catch((err) => console.error(`[Despachar] ❌ Falha ao invocar worker:`, err?.message || err));

  return Response.json({
    status:  'accepted',
    message: 'Sincronização enviada para processamento em segundo plano.',
    job_id:  job.id,
  }, { status: 202 });
});