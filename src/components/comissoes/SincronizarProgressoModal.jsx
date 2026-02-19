import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

/**
 * Modal de progresso em tempo real para a sincronização de comissões.
 * - Não pode ser fechado durante o processamento (prevenção de abandono).
 * - Consome o endpoint SSE via fetch + ReadableStream.
 * - Fallback automático para invoke() caso stream não esteja disponível.
 */
export default function SincronizarProgressoModal({ open, onClose }) {
  const [fase, setFase]           = useState('aguardando');
  const [progresso, setProgresso] = useState(0);
  const [mensagem, setMensagem]   = useState('Preparando...');
  const [detalhe, setDetalhe]     = useState('');
  const [stats, setStats]         = useState({ criados: 0, atualizados: 0, ignorados: 0, erros: 0, total: 0, processados: 0 });
  const controllerRef             = useRef(null);

  const concluido = fase === 'concluido';
  const erro      = fase === 'erro';
  const andamento = !concluido && !erro;

  // ── Inicia a stream quando o modal abre ──────────────────────────────────
  useEffect(() => {
    if (!open) return;

    // Reseta estado
    setFase('iniciando');
    setProgresso(0);
    setMensagem('Conectando ao servidor...');
    setDetalhe('');
    setStats({ criados: 0, atualizados: 0, ignorados: 0, erros: 0, total: 0, processados: 0 });

    const controller = new AbortController();
    controllerRef.current = controller;

    const aplicarEvento = (evento) => {
      if (!evento?.fase) return;
      setFase(evento.fase);
      setProgresso(evento.progresso ?? 0);
      setMensagem(evento.mensagem   || '');
      setDetalhe(evento.lote ? `Lote ${evento.lote} — ${evento.processados ?? 0} de ${evento.total ?? 0} pedidos` : '');
      setStats({
        criados:     evento.criados      ?? 0,
        atualizados: evento.atualizados  ?? 0,
        ignorados:   evento.ignorados    ?? 0,
        erros:       typeof evento.erros === 'number' ? evento.erros : (evento.erros?.length ?? 0),
        total:       evento.total        ?? 0,
        processados: evento.processados  ?? 0,
      });
    };

    (async () => {
      try {
        // Tenta stream SSE via fetch
        const response = await base44.functions.invokeRaw?.('sincronizarComissoes', {}, {
          signal: controller.signal,
          headers: { Accept: 'text/event-stream' },
        }).catch(() => null);

        const streamDisponivel = response?.ok && response?.body &&
          response.headers?.get('content-type')?.includes('text/event-stream');

        if (streamDisponivel) {
          // ── Modo stream SSE ─────────────────────────────────────────────
          const reader  = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const blocos = buffer.split('\n\n');
            buffer = blocos.pop();

            for (const bloco of blocos) {
              const dataLine = bloco.split('\n').find(l => l.startsWith('data:'));
              if (!dataLine) continue;
              try { aplicarEvento(JSON.parse(dataLine.slice(5).trim())); } catch { /* chunk parcial */ }
            }
          }
        } else {
          // ── Fallback: invoke() normal (sem progresso em tempo real) ────
          setMensagem('Processando... (pode levar alguns minutos)');
          const res = await base44.functions.invoke('sincronizarComissoes', {});
          const d   = res?.data || {};
          aplicarEvento({
            fase:        d.success ? 'concluido' : 'erro',
            progresso:   100,
            mensagem:    d.message || (d.success ? 'Sincronização concluída.' : (d.error || 'Erro desconhecido')),
            criados:     d.criados     ?? 0,
            atualizados: d.atualizados ?? 0,
            ignorados:   d.ignorados   ?? 0,
            erros:       d.erros?.length ?? 0,
            total:       d.processados ?? 0,
            processados: d.processados ?? 0,
          });
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setFase('erro');
        setMensagem(err.message || 'Falha na comunicação com o servidor.');
      }
    })();

    return () => controller.abort();
  }, [open]);

  // ── Tenta fechar: bloqueia se ainda em andamento ─────────────────────────
  const handleClose = () => {
    if (andamento) {
      if (window.confirm('A sincronização ainda está em andamento.\nDeseja realmente abortar?')) {
        controllerRef.current?.abort();
        setFase('erro');
        setMensagem('Abortado pelo usuário.');
        onClose(stats);
      }
      return;
    }
    onClose(stats);
  };

  // ── Cores dinâmicas ──────────────────────────────────────────────────────
  const corBarra    = erro ? 'bg-red-500' : concluido ? 'bg-emerald-500' : 'bg-blue-500';
  const corShimmer  = andamento && progresso > 0 && progresso < 100;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md p-0 gap-0 [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>

        {/* ── Header ── */}
        <div className={`px-6 pt-6 pb-4 border-b ${concluido ? 'bg-emerald-50' : erro ? 'bg-red-50' : 'bg-white'}`}>
          <div className="flex items-center gap-3">
            {andamento && <Loader2 className="w-6 h-6 text-blue-500 animate-spin shrink-0" />}
            {concluido && <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />}
            {erro      && <XCircle      className="w-6 h-6 text-red-500    shrink-0" />}
            <div>
              <h2 className="font-bold text-slate-800 text-base leading-tight">
                {concluido ? '✅ Sincronização Concluída!' : erro ? '❌ Erro na Sincronização' : '⏳ Sincronizando Comissões...'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{mensagem}</p>
            </div>
          </div>
        </div>

        {/* ── Barra de Progresso ── */}
        <div className="px-6 pt-5 pb-2 space-y-2">
          <div className="flex justify-between items-center text-xs font-medium mb-1">
            <span className="text-slate-500">
              {stats.processados > 0
                ? `Processando ${stats.processados.toLocaleString('pt-BR')} de ${stats.total.toLocaleString('pt-BR')} pedidos`
                : detalhe || 'Aguardando dados...'}
            </span>
            <span className={`font-bold text-base ${concluido ? 'text-emerald-600' : erro ? 'text-red-500' : 'text-blue-600'}`}>
              {progresso}%
            </span>
          </div>

          {/* Track */}
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden ${corBarra}`}
              style={{ width: `${progresso}%` }}
            >
              {/* Shimmer animado durante processamento */}
              {corShimmer && (
                <div className="absolute inset-0 -skew-x-12 animate-[shimmer_1.5s_infinite]"
                  style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear' }}
                />
              )}
            </div>
          </div>

          {detalhe && andamento && (
            <p className="text-[11px] text-slate-400 text-right">{detalhe}</p>
          )}
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-4 gap-2 px-6 py-3">
          <StatBox label="Criadas"     value={stats.criados}     color="text-emerald-600" bg="bg-emerald-50 border-emerald-100" />
          <StatBox label="Atualizadas" value={stats.atualizados} color="text-blue-600"    bg="bg-blue-50 border-blue-100"       />
          <StatBox label="Ignoradas"   value={stats.ignorados}   color="text-slate-500"   bg="bg-slate-50 border-slate-100"     />
          <StatBox label="Erros"       value={stats.erros}       color="text-red-500"     bg={stats.erros > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"} />
        </div>

        {/* ── Footer ── */}
        <div className="px-6 pb-6 pt-2 border-t">
          {andamento ? (
            <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Não feche esta janela. Clique abaixo para abortar se necessário.
              <button onClick={handleClose} className="underline text-red-400 hover:text-red-600 ml-1">Abortar</button>
            </div>
          ) : (
            <Button
              className={`w-full gap-2 font-semibold ${concluido ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 hover:bg-slate-700'}`}
              onClick={() => onClose(stats)}
            >
              {concluido ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {concluido ? 'Concluir e Fechar' : 'Fechar'}
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, color, bg }) {
  return (
    <div className={`rounded-lg p-2 text-center border ${bg}`}>
      <p className={`text-xl font-bold ${color}`}>{value.toLocaleString('pt-BR')}</p>
      <p className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">{label}</p>
    </div>
  );
}