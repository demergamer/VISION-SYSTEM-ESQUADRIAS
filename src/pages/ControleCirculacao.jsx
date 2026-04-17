import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Plus, Car, Truck, CheckCircle, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import ModalSaida from '@/components/portaria/ModalSaida';

function safeFormat(d, fmt = 'dd/MM/yy HH:mm') {
  try { const dt = new Date(d); if (isNaN(dt)) return '-'; return format(dt, fmt); } catch { return '-'; }
}

const formatKm = (v) => v ? v.toLocaleString('pt-BR') + ' km' : '–';

export default function ControleCirculacao() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [modalSaidaVeiculo, setModalSaidaVeiculo] = useState(null);
  const [showVeiculoSelect, setShowVeiculoSelect] = useState(false);

  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ['movimentacoes_todas'],
    queryFn: () => base44.entities.MovimentacaoPortaria.list('-created_date', 200),
  });
  const { data: veiculos = [] } = useQuery({
    queryKey: ['veiculos'],
    queryFn: () => base44.entities.Veiculo.list(),
  });

  const filtradas = useMemo(() => {
    if (!busca.trim()) return movimentacoes;
    const q = busca.toLowerCase();
    return movimentacoes.filter(m =>
      m.veiculo_placa?.toLowerCase().includes(q) ||
      m.motorista_nome?.toLowerCase().includes(q) ||
      m.destino?.toLowerCase().includes(q)
    );
  }, [movimentacoes, busca]);

  const veiculosNaEmpresa = useMemo(() => veiculos.filter(v => v.status === 'Na Empresa'), [veiculos]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portaria')}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Controle de Circulação</h1>
              <p className="text-sm text-slate-500">{movimentacoes.length} movimentação(ões) registrada(s)</p>
            </div>
          </div>
          <Button onClick={() => setShowVeiculoSelect(v => !v)} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nova Movimentação
          </Button>
        </div>

        {/* Seletor de veículo para nova movimentação */}
        {showVeiculoSelect && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-3">Selecione o veículo para registrar saída:</p>
            {veiculosNaEmpresa.length === 0 ? (
              <p className="text-slate-400 text-sm">Nenhum veículo disponível na empresa.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {veiculosNaEmpresa.map(v => {
                  const Icon = v.tipo === 'Caminhao' ? Truck : Car;
                  return (
                    <button key={v.id} onClick={() => { setModalSaidaVeiculo(v); setShowVeiculoSelect(false); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-sm transition-all">
                      <Icon className="w-4 h-4" /> {v.placa} — {v.modelo}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Busca */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" placeholder="Buscar por placa, motorista ou destino..." />
            </div>
          </div>

          {/* Tabela */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Carregando...</div>
          ) : filtradas.length === 0 ? (
            <div className="p-12 text-center text-slate-400">Nenhuma movimentação encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Placa / Modelo</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>KM Rodado</TableHead>
                    <TableHead>Porteiro</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map(m => {
                    const kmRodado = m.km_entrada && m.km_saida ? m.km_entrada - m.km_saida : null;
                    return (
                      <TableRow key={m.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <p className="font-mono font-bold text-slate-800">{m.veiculo_placa}</p>
                          <p className="text-xs text-slate-400">{m.veiculo_modelo}</p>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">{m.motorista_nome}</TableCell>
                        <TableCell className="text-slate-600">{m.destino}</TableCell>
                        <TableCell className="text-sm">
                          <p className="text-slate-700">{safeFormat(m.data_saida)}</p>
                          <p className="text-xs text-slate-400">⛽ {m.combustivel_saida}</p>
                          <p className="text-xs text-slate-400">🛣️ {formatKm(m.km_saida)}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {m.data_entrada ? (
                            <>
                              <p className="text-slate-700">{safeFormat(m.data_entrada)}</p>
                              <p className="text-xs text-slate-400">⛽ {m.combustivel_entrada}</p>
                              <p className="text-xs text-slate-400">🛣️ {formatKm(m.km_entrada)}</p>
                            </>
                          ) : <span className="text-slate-300">–</span>}
                        </TableCell>
                        <TableCell>
                          {kmRodado !== null ? (
                            <span className="font-medium text-slate-700">{kmRodado.toLocaleString('pt-BR')} km</span>
                          ) : <span className="text-slate-300">–</span>}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          <p>{m.porteiro_saida || '–'}</p>
                          {m.porteiro_entrada && <p className="text-slate-400">{m.porteiro_entrada}</p>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={m.status === 'Fechado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                            {m.status === 'Fechado' ? <><CheckCircle className="w-3 h-3 inline mr-1" />Fechado</> : <><Clock className="w-3 h-3 inline mr-1" />Aberto</>}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <ModalSaida open={!!modalSaidaVeiculo} onClose={() => setModalSaidaVeiculo(null)} veiculo={modalSaidaVeiculo} />
    </div>
  );
}