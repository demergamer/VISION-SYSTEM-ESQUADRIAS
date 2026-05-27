import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import ModalContainer from '@/components/modals/ModalContainer';
import { MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
// Geocodificação direta via Nominatim (OpenStreetMap) — sem chave de API
async function geocodificarNominatim(endereco) {
  const params = new URLSearchParams({
    q: endereco,
    format: 'json',
    countrycodes: 'br',
    limit: '1',
    addressdetails: '0',
  });
  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'JCVisionSystem/1.0' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.length > 0) {
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  }
  return null;
}
import { toast } from 'sonner';

export default function GeocodificarClientesModal({ onClose }) {
  const queryClient = useQueryClient();
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultados, setResultados] = useState({ ok: 0, erro: 0, pulado: 0 });
  const [log, setLog] = useState([]);
  const [concluido, setConcluido] = useState(false);

  const { data: clientesSemCoordenada = [], isLoading } = useQuery({
    queryKey: ['clientes_sem_coordenada'],
    queryFn: async () => {
      const todos = await base44.entities.Cliente.list('nome', 2000);
      return todos.filter(c => !c.latitude || !c.longitude);
    },
  });

  const addLog = (msg, tipo = 'info') => {
    setLog(prev => [...prev.slice(-80), { msg, tipo, ts: Date.now() }]);
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const iniciar = async () => {
    setRodando(true);
    setProgresso(0);
    setResultados({ ok: 0, erro: 0, pulado: 0 });
    setLog([]);

    const clientes = [...clientesSemCoordenada];
    let ok = 0, erro = 0, pulado = 0;

    for (let i = 0; i < clientes.length; i++) {
      const c = clientes[i];
      setProgresso(Math.round(((i + 1) / clientes.length) * 100));

      // Monta endereço — usa apenas rua + número + cidade + estado para maximizar acerto
      if (!c.cidade) {
        addLog(`⚠️ ${c.nome} — sem cidade cadastrada, pulando`, 'aviso');
        pulado++;
        setResultados({ ok, erro, pulado });
        continue;
      }

      // Tenta primeiro endereço completo, depois só cidade se falhar
      const enderecoCompleto = [c.endereco, c.numero, c.cidade, c.estado].filter(Boolean).join(', ') + ', Brasil';
      const enderecoFallback = [c.cidade, c.estado].filter(Boolean).join(', ') + ', Brasil';

      try {
        let geo = await geocodificarNominatim(enderecoCompleto);
        // Fallback: só cidade+estado se endereço completo falhar
        if (!geo && enderecoCompleto !== enderecoFallback) {
          await sleep(600);
          geo = await geocodificarNominatim(enderecoFallback);
        }
        if (geo?.latitude && geo?.longitude) {
          await base44.entities.Cliente.update(c.id, {
            latitude: geo.latitude,
            longitude: geo.longitude,
          });
          addLog(`✅ ${c.nome} → (${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)})`, 'ok');
          ok++;
        } else {
          addLog(`❌ ${c.nome} — sem resultado`, 'erro');
          erro++;
        }
      } catch (e) {
        addLog(`❌ ${c.nome} — erro: ${e.message}`, 'erro');
        erro++;
      }

      setResultados({ ok, erro, pulado });

      // Respeita rate limit da API (1 req/seg)
      await sleep(1100);
    }

    queryClient.invalidateQueries({ queryKey: ['clientes_sem_coordenada'] });
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
    queryClient.invalidateQueries({ queryKey: ['clientes_lista_cobranca'] });
    setConcluido(true);
    setRodando(false);
    toast.success(`Geocodificação concluída: ${ok} ok, ${erro} erro(s), ${pulado} pulado(s)`);
  };

  const total = clientesSemCoordenada.length;

  return (
    <ModalContainer open={true} onClose={onClose} title="📍 Geocodificar Clientes" description="Preenche latitude/longitude automaticamente para todos os clientes sem coordenadas" size="lg">
      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando clientes...
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl mb-4">
            <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-semibold text-slate-800">
                {total} cliente{total !== 1 ? 's' : ''} sem coordenadas
              </p>
              <p className="text-xs text-slate-500">
                A geocodificação usa o endereço cadastrado. Clientes sem endereço completo serão pulados.
              </p>
            </div>
          </div>

          {total === 0 && !concluido && (
            <div className="text-center py-6 text-green-600 font-semibold">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              Todos os clientes já têm coordenadas!
            </div>
          )}

          {(rodando || concluido) && (
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Progresso: {progresso}%</span>
                <span className="flex gap-3">
                  <span className="text-green-600">✅ {resultados.ok}</span>
                  <span className="text-red-500">❌ {resultados.erro}</span>
                  <span className="text-amber-500">⚠️ {resultados.pulado}</span>
                </span>
              </div>
              <Progress value={progresso} className="h-2" />

              <div className="bg-slate-900 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs space-y-1">
                {log.map((l, i) => (
                  <div key={i} className={
                    l.tipo === 'ok' ? 'text-green-400' :
                    l.tipo === 'erro' ? 'text-red-400' :
                    l.tipo === 'aviso' ? 'text-amber-400' : 'text-slate-300'
                  }>{l.msg}</div>
                ))}
                {rodando && <div className="text-blue-400 animate-pulse">⏳ Processando...</div>}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            {!concluido && total > 0 && (
              <Button
                onClick={iniciar}
                disabled={rodando || total === 0}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                {rodando ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando ({progresso}%)</> : `▶ Iniciar (${total} clientes)`}
              </Button>
            )}
          </div>
        </>
      )}
    </ModalContainer>
  );
}