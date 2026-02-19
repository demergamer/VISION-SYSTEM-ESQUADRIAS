import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Badge inline que faz polling no SyncJob e atualiza em tempo real via subscribe.
 * Desaparece automaticamente 4s após concluir/erro.
 */
export default function JobStatusBadge({ jobId, onConcluido }) {
  const [status, setStatus] = useState('pendente');

  useEffect(() => {
    if (!jobId) return;

    // Leitura inicial
    base44.entities.SyncJob.get?.(jobId)
      .then(j => j && setStatus(j.status))
      .catch(() => {});

    // Subscribe a mudanças
    const unsub = base44.entities.SyncJob.subscribe((event) => {
      if (String(event.id) !== String(jobId)) return;
      const novoStatus = event.data?.status;
      if (novoStatus) setStatus(novoStatus);

      if (novoStatus === 'concluido' || novoStatus === 'erro') {
        setTimeout(() => onConcluido?.(), 4000);
      }
    });

    return unsub;
  }, [jobId]);

  const configs = {
    pendente:    { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Na fila...',       cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    processando: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Processando...',   cls: 'bg-blue-100 text-blue-700 border-blue-200'    },
    concluido:   { icon: <CheckCircle2 className="w-3 h-3" />,          label: 'Sync concluída!', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    erro:        { icon: <XCircle className="w-3 h-3" />,               label: 'Erro na sync',    cls: 'bg-red-100 text-red-600 border-red-200'       },
  };

  const c = configs[status] || configs.pendente;

  return (
    <Badge variant="outline" className={`gap-1.5 px-2 py-1 text-xs font-medium ${c.cls}`}>
      {c.icon}
      {c.label}
    </Badge>
  );
}