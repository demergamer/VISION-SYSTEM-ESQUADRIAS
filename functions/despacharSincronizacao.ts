/**
 * POST /despacharSincronizacao
 *
 * Endpoint leve: apenas cria um SyncJob "pendente" e retorna 202 imediatamente.
 * O processamento pesado acontece no worker (executarSyncWorker).
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

  // Dispara o worker em background (não awaita — retorna 202 antes de processar)
  const workerUrl = req.url.replace('despacharSincronizacao', 'executarSyncWorker');
  fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': req.headers.get('Authorization') || '',
    },
    body: JSON.stringify({ job_id: job.id }),
  }).catch((err) => console.error('Falha ao disparar worker:', err.message));

  return Response.json({
    status:  'accepted',
    message: 'Sincronização enviada para processamento em segundo plano.',
    job_id:  job.id,
  }, { status: 202 });
});