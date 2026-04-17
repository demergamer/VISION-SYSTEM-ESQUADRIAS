import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Car, Truck, Plus, ArrowLeft, MapPin, Clock, User, ClipboardList, Edit } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import ModalSaida from '@/components/portaria/ModalSaida';
import ModalRetorno from '@/components/portaria/ModalRetorno';
import ModalCadastroVeiculo from '@/components/portaria/ModalCadastroVeiculo';
import ModalOcorrencias from '@/components/portaria/ModalOcorrencias';

function safeFormat(d, fmt = 'HH:mm dd/MM') {
  try { const dt = new Date(d); if (isNaN(dt)) return '-'; return format(dt, fmt); } catch { return '-'; }
}

function VeiculoCard({ veiculo, movimentacaoAberta, onSaida, onRetorno, onOcorrencias }) {
  const naRua = veiculo.status === 'Na Rua';
  const Icon = veiculo.tipo === 'Caminhao' ? Truck : Car;

  return (
    <div className={`rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all shadow-sm hover:shadow-md
      ${naRua ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}>
      
      {/* Topo */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
            ${naRua ? 'bg-amber-200 text-amber-700' : 'bg-emerald-200 text-emerald-700'}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-lg leading-tight">{veiculo.placa}</p>
            <p className="text-sm text-slate-500">{veiculo.modelo}</p>
          </div>
        </div>
        <Badge className={naRua ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}>
          {naRua ? '🚗 Na Rua' : '✅ Na Empresa'}
        </Badge>
      </div>

      {/* Detalhes se Na Rua */}
      {naRua && movimentacaoAberta && (
        <div className="bg-amber-100/70 rounded-xl p-3 space-y-1 text-sm">
          <p className="flex items-center gap-2 text-slate-700"><User className="w-4 h-4 text-amber-600" /> <span className="font-medium">{movimentacaoAberta.motorista_nome}</span></p>
          <p className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4 text-amber-600" /> {movimentacaoAberta.destino}</p>
          <p className="flex items-center gap-2 text-slate-500"><Clock className="w-4 h-4 text-amber-600" /> Saiu às {safeFormat(movimentacaoAberta.data_saida)}</p>
        </div>
      )}

      {/* Detalhes se Na Empresa */}
      {!naRua && (
        <div className="text-sm text-slate-500 space-y-1">
          <p>🛣️ KM: <span className="font-medium text-slate-700">{veiculo.km_atual?.toLocaleString('pt-BR') || '0'}</span></p>
          <p>⛽ Combustível: <span className="font-medium text-slate-700">{veiculo.nivel_combustivel || '–'}</span></p>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2 pt-1">
        {!naRua ? (
          <Button size="sm" onClick={() => onSaida(veiculo)} className="flex-1 bg-red-600 hover:bg-red-700 gap-1">
            <ArrowLeft className="w-4 h-4 rotate-180" /> Registrar Saída
          </Button>
        ) : (
          <Button size="sm" onClick={() => onRetorno(veiculo, movimentacaoAberta)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1">
            <ArrowLeft className="w-4 h-4" /> Registrar Retorno
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onOcorrencias(veiculo)} title="Ocorrências">
          <ClipboardList className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function EstacionamentoVirtual() {
  const navigate = useNavigate();
  const [modalSaida, setModalSaida] = useState(null);
  const [modalRetorno, setModalRetorno] = useState({ veiculo: null, mov: null });
  const [modalCadastro, setModalCadastro] = useState(false);
  const [modalOcorrencias, setModalOcorrencias] = useState(null);

  const { data: veiculos = [] } = useQuery({ queryKey: ['veiculos'], queryFn: () => base44.entities.Veiculo.list() });
  const { data: movimentacoes = [] } = useQuery({ queryKey: ['movimentacoes'], queryFn: () => base44.entities.MovimentacaoPortaria.filter({ status: 'Aberto' }) });

  const { naEmpresa, naRua } = useMemo(() => ({
    naEmpresa: veiculos.filter(v => v.status === 'Na Empresa'),
    naRua: veiculos.filter(v => v.status === 'Na Rua'),
  }), [veiculos]);

  const movByVeiculo = useMemo(() => {
    const map = {};
    movimentacoes.forEach(m => { map[m.veiculo_id] = m; });
    return map;
  }, [movimentacoes]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portaria')}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Estacionamento Virtual</h1>
              <p className="text-sm text-slate-500">{veiculos.length} veículo(s) cadastrado(s)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/controlecirculacao')} variant="outline" size="sm" className="gap-2">
              <ClipboardList className="w-4 h-4" /> Histórico
            </Button>
            <Button onClick={() => setModalCadastro(true)} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Novo Veículo
            </Button>
          </div>
        </div>

        {/* Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Na Empresa */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <h2 className="text-lg font-bold text-slate-700">Na Empresa</h2>
              <Badge className="bg-emerald-100 text-emerald-700 ml-1">{naEmpresa.length}</Badge>
            </div>
            {naEmpresa.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-10 text-center text-emerald-400 text-sm">
                Nenhum veículo na empresa agora.
              </div>
            ) : (
              <div className="space-y-4">
                {naEmpresa.map(v => (
                  <VeiculoCard key={v.id} veiculo={v} movimentacaoAberta={movByVeiculo[v.id]}
                    onSaida={setModalSaida} onRetorno={(vei, mov) => setModalRetorno({ veiculo: vei, mov })} onOcorrencias={setModalOcorrencias} />
                ))}
              </div>
            )}
          </div>

          {/* Na Rua */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <h2 className="text-lg font-bold text-slate-700">Na Rua</h2>
              <Badge className="bg-amber-100 text-amber-700 ml-1">{naRua.length}</Badge>
            </div>
            {naRua.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-10 text-center text-amber-400 text-sm">
                Nenhum veículo fora da empresa.
              </div>
            ) : (
              <div className="space-y-4">
                {naRua.map(v => (
                  <VeiculoCard key={v.id} veiculo={v} movimentacaoAberta={movByVeiculo[v.id]}
                    onSaida={setModalSaida} onRetorno={(vei, mov) => setModalRetorno({ veiculo: vei, mov })} onOcorrencias={setModalOcorrencias} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalSaida open={!!modalSaida} onClose={() => setModalSaida(null)} veiculo={modalSaida} />
      <ModalRetorno open={!!modalRetorno.veiculo} onClose={() => setModalRetorno({ veiculo: null, mov: null })} veiculo={modalRetorno.veiculo} movimentacao={modalRetorno.mov} />
      <ModalCadastroVeiculo open={modalCadastro} onClose={() => setModalCadastro(false)} />
      <ModalOcorrencias open={!!modalOcorrencias} onClose={() => setModalOcorrencias(null)} veiculo={modalOcorrencias} />
    </div>
  );
}