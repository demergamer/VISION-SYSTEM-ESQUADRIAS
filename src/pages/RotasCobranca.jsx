import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, FileText, MessageSquare, CheckCircle2, MapPin } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">🛵 Rota do Gil</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerenciador de Rotas de Cobrança</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowGeocodificar(true)} className="gap-2 text-slate-600">
            <MapPin className="w-4 h-4" /> Geocodificar Clientes
          </Button>
          <Button onClick={() => setShowCriar(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="w-4 h-4" /> Nova Rota
          </Button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total de Rotas', value: rotas.length },
          { label: 'Rotas Abertas', value: rotas.filter(r => r.status === 'Aberta').length },
          { label: 'Concluídas', value: rotas.filter(r => r.status === 'Concluída').length },
          { label: 'WhatsApp Disparado', value: rotas.filter(r => r.whatsapp_disparado).length },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <span className="font-bold text-slate-700">Histórico de Rotas</span>
          <Badge variant="outline">{rotas.length}</Badge>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Carregando...</div>
        ) : rotas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">🛵</p>
            <p className="text-slate-500 font-medium">Nenhuma rota criada ainda</p>
            <p className="text-slate-400 text-sm">Clique em "Nova Rota" para começar</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {rotas.map(rota => (
              <div key={rota.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{rota.codigo_rota}</span>
                    <Badge className={rota.status === 'Concluída' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                      {rota.status}
                    </Badge>
                    {rota.whatsapp_disparado && (
                      <Badge className="bg-green-50 text-green-600 border border-green-200">
                        <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp Enviado
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                    <span>📅 {formatDate(rota.data_rota)}</span>
                    <span>👤 {rota.cobrador_nome || 'Gil'}</span>
                    <span>👥 {(rota.dados_cobranca || []).length} clientes</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(rota.valor_total_rota)}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setRotaSelecionada(rota)} className="gap-1.5 shrink-0">
                  <Eye className="w-3.5 h-3.5" /> Abrir
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

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