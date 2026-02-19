import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Modal com barra de progresso em tempo real via SSE.
 * Recebe `open` e `onClose(resultado)` como props.
 * Conecta ao endpoint SSE assim que `open` vira true.
 */
export default function SincronizarProgressoModal({ open, onClose }) {
  const [fase, setFase]           = useState('aguardando'); // aguardando|iniciando|processando|concluido|erro
  const [progresso, setProgresso] = useState(0);
  const [mensagem, setMensagem]   = useState('Preparando...');
  const [stats, setStats]         = useState({ criados: 0, atualizados: 0, ignorados: 0, erros: 0, total: 0, processados: 0 });
  const esRef = useRef(null);

  // Reinicia estado ao abrir
  useEffect(() => {
    if (!open) return;

    setFase('iniciando');
    setProgresso(0);
    setMensagem('Conectando...');
    setStats({ criados: 0, atualizados: 0, ignorados: 0, erros: 0, total: 0, processados: 0 });

    // Obtém a URL base das functions (usa mesma origem do SDK)
    const functionUrl = `${window.location.origin.replace('3000', '3001')}/sincronizarComissoes`;

    // Para chamar a function com auth, precisamos do token no header.
    // Como EventSource não suporta headers, usamos fetch com ReadableStream.
    const controller = new AbortController();

    (async () => {
      try {
        const { base44 } = await import('@/api/base44Client');
        const response = await base44.functions.invokeStream('sincronizarComissoes', {}, { signal: controller.signal });

        if (!response || !response.body) throw new Error('Stream não disponível');

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop(); // mantém linha incompleta

          for (const block of lines) {
            const dataLine = block.split('\n').find(l => l.startsWith('data:'));
            if (!dataLine) continue;
            try {
              const evento = JSON.parse(dataLine.slice(5).trim());
              setFase(evento.fase || 'processando');
              setProgresso(evento.progresso ?? 0);
              setMensagem(evento.mensagem || '');
              setStats({
                criados:     evento.criados     ?? 0,
                atualizados: evento.atualizados ?? 0,
                ignorados:   evento.ignorados   ?? 0,
                erros:       evento.erros       ?? 0,
                total:       evento.total       ?? 0,
                processados: evento.processados ?? 0,
              });
            } catch { /* JSON incompleto – aguarda próximo chunk */ }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setFase('erro');
        setMensagem(err.message || 'Falha na conexão com o servidor.');
      }
    })();

    return () => controller.abort();
  }, [open]);

  const concluido = fase === 'concluido';
  const erro      = fase === 'erro';
  const andamento = !concluido && !erro;

  const corBarra = erro ? 'bg-red-500' : concluido ? 'bg-emerald-500' : 'bg-blue-500';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !andamento) onClose(stats); }}>
      <DialogContent className="max-w-md p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            {andamento && <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />}
            {concluido && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            {erro      && <XCircle      className="w-5 h-5 text-red-500    shrink-0" />}
            <div>
              <h2 className="font-bold text-slate-800 text-base">
                {concluido ? 'Sincronização Concluída' : erro ? 'Erro na Sincronização' : 'Sincronizando Comissões...'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{mensagem}</p>
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex justify-between text-xs text-slate-500 font-medium mb-1">
            <span>{stats.processados > 0 ? `${stats.processados} de ${stats.total} pedidos` : 'Calculando...'}</span>
            <span className="font-bold text-slate-700">{progresso}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${corBarra}`}
              style={{ width: `${progresso}%` }}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            <StatBox label="Criadas"     value={stats.criados}     color="text-emerald-600" />
            <StatBox label="Atualizadas" value={stats.atualizados} color="text-blue-600"    />
            <StatBox label="Ignoradas"   value={stats.ignorados}   color="text-slate-500"   />
            <StatBox label="Erros"       value={stats.erros}       color="text-red-500"     />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          {andamento ? (
            <p className="text-xs text-center text-slate-400">
              Não feche esta janela enquanto a sincronização estiver em andamento.
            </p>
          ) : (
            <Button
              className={`w-full gap-2 ${concluido ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 hover:bg-slate-700'}`}
              onClick={() => onClose(stats)}
            >
              {concluido ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {concluido ? 'Fechar' : 'Fechar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400 uppercase font-medium">{label}</p>
    </div>
  );
}