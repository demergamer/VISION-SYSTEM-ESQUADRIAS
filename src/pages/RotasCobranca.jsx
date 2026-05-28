import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, MapPin, Loader2 } from 'lucide-react';
import CriarRotaModal from '@/components/cobranca/CriarRotaModal';
import DetalhesRotaModal from '@/components/cobranca/DetalhesRotaModal';
import GeocodificarClientesModal from '@/components/cobranca/GeocodificarClientesModal';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export default function RotasCobranca() {
  const queryClient = useQueryClient();
  const [showCriar, setShowCriar] = useState(false);
  const [rotaSelecionada, setRotaSelecionada] = useState(null);
  const [showGeocodificar, setShowGeocodificar] = useState(false);

  const { data: rotas = [], isLoading } = useQuery({
    queryKey: ['rotas_cobranca'],
    queryFn: () => base44.entities.RotaCobranca.list('-data_rota', 100),
    refetchInterval: 30000,
  });

  useEffect(() => {
    const unsub = base44.entities.RotaCobranca.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['rotas_cobranca'] });
    });
    return unsub;
  }, [queryClient]);

  const stats = [
    { label: 'Total de Rotas', value: rotas.length },
    { label: 'Abertas', value: rotas.filter(r => r.status === 'Aberta').length },
    { label: 'Concluídas', value: rotas.filter(r => r.status === 'Concluída').length },
    { label: 'WhatsApp Enviado', value: rotas.filter(r => r.whatsapp_disparado).length },
  ];

  const totalArrecadado = rotas
    .filter(r => r.status === 'Concluída')
    .reduce((sum, r) => sum + (r.valor_total_rota || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">🛵 Rotas de Cobrança</h1>
          <p className="text-slate-600 mt-1">Gerenciador de rotas do Gil</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowGeocodificar(true)}
            className="gap-2"
          >
            <MapPin className="w-4 h-4" /> Geocodificar
          </Button>
          <Button
            onClick={() => setShowCriar(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" /> Nova Rota
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
          >
            <p className="text-xs text-slate-500 font-semibold uppercase">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Total arrecadado */}
      {totalArrecadado > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-700 font-medium">Total Arrecadado (Rotas Concluídas)</p>
          <p className="text-3xl font-bold text-green-900 mt-1">{formatCurrency(totalArrecadado)}</p>
        </div>
      )}

      {/* Lista de rotas */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Histórico</h2>
          <Badge variant="outline">{rotas.length} rota(s)</Badge>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
            <p className="text-slate-500 mt-2">Carregando rotas...</p>
          </div>
        ) : rotas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">🛵</p>
            <p className="text-slate-600 font-medium">Nenhuma rota criada</p>
            <p className="text-slate-400 text-sm mt-1">Clique em "Nova Rota" para começar</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {rotas.map((rota) => {
              const isAberta = rota.status === 'Aberta';
              const clienteCount = (rota.dados_cobranca || []).length;
              const clientesAtivos = (rota.dados_cobranca || []).filter(c => !c.recusado).length;

              return (
                <div
                  key={rota.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    {/* Código e status */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-slate-900 text-lg">{rota.codigo_rota}</h3>
                      <Badge
                        className={
                          isAberta
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }
                      >
                        {rota.status}
                      </Badge>
                      {rota.whatsapp_disparado && (
                        <Badge className="bg-emerald-100 text-emerald-700">✓ WhatsApp</Badge>
                      )}
                    </div>

                    {/* Informações */}
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                      <span>📅 {formatDate(rota.data_rota)}</span>
                      <span>👤 {rota.cobrador_nome || 'Gil'}</span>
                      <span>
                        👥 {clientesAtivos}/{clienteCount} clientes
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(rota.valor_total_rota || 0)}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRotaSelecionada(rota)}
                    className="gap-1.5 shrink-0"
                  >
                    <Eye className="w-4 h-4" /> Detalhes
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modais */}
      {showGeocodificar && (
        <GeocodificarClientesModal onClose={() => setShowGeocodificar(false)} />
      )}

      {showCriar && (
        <CriarRotaModal
          onClose={() => setShowCriar(false)}
          onSaved={(rota) => {
            queryClient.invalidateQueries({ queryKey: ['rotas_cobranca'] });
            setShowCriar(false);
            setRotaSelecionada(rota);
          }}
        />
      )}

      {rotaSelecionada && (
        <DetalhesRotaModal
          rota={rotaSelecionada}
          onClose={() => setRotaSelecionada(null)}
          onUpdated={(rotaAtualizada) => {
            setRotaSelecionada(rotaAtualizada);
            queryClient.invalidateQueries({ queryKey: ['rotas_cobranca'] });
          }}
        />
      )}
    </div>
  );
}