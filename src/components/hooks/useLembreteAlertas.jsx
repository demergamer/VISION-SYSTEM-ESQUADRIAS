import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ANTECEDENCIA_MIN = {
  na_hora: 0,
  '5min': 5,
  '10min': 10,
  '30min': 30,
  '1h': 60,
};

const FIRED_KEY = 'jc_lembretes_fired';

function getFired() {
  try { return new Set(JSON.parse(sessionStorage.getItem(FIRED_KEY) || '[]')); } catch { return new Set(); }
}
function markFired(id) {
  const set = getFired();
  set.add(id);
  sessionStorage.setItem(FIRED_KEY, JSON.stringify([...set]));
}

/**
 * Hook que verifica lembretes do dia a cada 60s e dispara toast de alerta.
 * @param {Array} tarefas - lista de tarefas/lembretes
 * @param {string} userEmail
 */
export function useLembreteAlertas(tarefas, userEmail) {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!tarefas?.length || !userEmail) return;

    const verificar = () => {
      const agora = new Date();
      const hoje = format(agora, 'yyyy-MM-dd');
      const agoraMin = agora.getHours() * 60 + agora.getMinutes();
      const fired = getFired();

      tarefas.forEach(t => {
        const data = t.data_vencimento || t.data;
        if (!data || data !== hoje) return;
        if (!t.hora) return; // Sem hora = sem alerta de tempo

        const escopo = t.escopo || t.tipo || 'geral';
        const isMeu = escopo === 'geral' || t.dono_id === userEmail || t.criador_id === userEmail;
        if (!isMeu) return;
        if (t.status === 'concluida' || t.status === 'recusada') return;

        const [h, m] = t.hora.split(':').map(Number);
        const tarefaMin = h * 60 + m;
        const antecedencia = ANTECEDENCIA_MIN[t.aviso_antecedencia || 'na_hora'] || 0;
        const alertaMin = tarefaMin - antecedencia;

        // Janela de 1 minuto para disparar
        if (agoraMin >= alertaMin && agoraMin < alertaMin + 1) {
          const firedId = `${t.id}_${hoje}_${alertaMin}`;
          if (fired.has(firedId)) return;
          markFired(firedId);

          const label = t.tipo_evento === 'lembrete' ? '🔔 Lembrete' : '📋 Tarefa';
          const msg = antecedencia === 0
            ? `${label}: ${t.titulo}`
            : `${label} em ${antecedencia} min: ${t.titulo}`;

          toast(msg, {
            description: t.descricao || `Agendado para ${t.hora}`,
            duration: 8000,
            icon: t.tipo_evento === 'lembrete' ? '🔔' : '✅',
          });
        }
      });
    };

    verificar(); // roda imediatamente
    intervalRef.current = setInterval(verificar, 60 * 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [tarefas, userEmail]);
}