import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Package, ArrowDownCircle, ArrowUpCircle, BarChart3,
  Plus, Search, AlertTriangle, TrendingDown, Pencil, Warehouse,
  DollarSign, Boxes
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InsumoModal from '@/components/almoxarifado/InsumoModal';
import EntradaModal from '@/components/almoxarifado/EntradaModal';
import SaidaModal from '@/components/almoxarifado/SaidaModal';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

// ─── Cards de Métricas ───────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, color = 'blue', sub }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600 border-blue-200',
    green:  'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber:  'bg-amber-50 text-amber-600 border-amber-200',
    red:    'bg-rose-50 text-rose-600 border-rose-200',
  };
  return (
    <div className={`rounded-xl border p-5 flex items-center gap-4 ${colors[color]}`}>
      <div className="p-3 rounded-lg bg-white/70 shadow-sm">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
        <p className="text-2xl font-black">{value}</p>
        {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Aba: Visão Geral ────────────────────────────────────────────────────────
function AbaVisaoGeral({ insumos }) {
  const totalInsumos = insumos.length;
  const valorInvestido = insumos.reduce((s, i) => s + ((i.quantidade_estoque || 0) * (i.preco_custo || 0)), 0);
  const alertas = insumos.filter(i => i.estoque_minimo > 0 && (i.quantidade_estoque || 0) <= i.estoque_minimo);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard icon={Boxes} label="Total de Insumos" value={totalInsumos} color="blue" sub="cadastrados no sistema" />
        <MetricCard icon={DollarSign} label="Valor em Estoque" value={fmt(valorInvestido)} color="green" sub="soma do inventário atual" />
        <MetricCard icon={AlertTriangle} label="Alertas de Ruptura" value={alertas.length} color={alertas.length > 0 ? 'red' : 'amber'} sub={alertas.length > 0 ? 'insumos abaixo do mínimo' : 'estoque saudável'} />
      </div>

      {alertas.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-rose-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Insumos com Estoque Crítico
          </h3>
          <div className="rounded-xl border border-rose-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-rose-50">
                <tr>
                  <th className="text-left p-3 text-rose-700 font-semibold">Código</th>
                  <th className="text-left p-3 text-rose-700 font-semibold">Nome</th>
                  <th className="text-right p-3 text-rose-700 font-semibold">Estoque Atual</th>
                  <th className="text-right p-3 text-rose-700 font-semibold">Estoque Mínimo</th>
                  <th className="text-center p-3 text-rose-700 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map(i => {
                  const zerado = (i.quantidade_estoque || 0) <= 0;
                  return (
                    <tr key={i.id} className="border-t border-rose-100 hover:bg-rose-50/50">
                      <td className="p-3 font-mono text-xs text-slate-500">{i.codigo}</td>
                      <td className="p-3 font-medium text-slate-800">{i.nome}</td>
                      <td className="p-3 text-right font-bold text-rose-700">{i.quantidade_estoque ?? 0}</td>
                      <td className="p-3 text-right text-slate-500">{i.estoque_minimo}</td>
                      <td className="p-3 text-center">
                        <Badge className={zerado ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}>
                          {zerado ? 'Sem Estoque' : 'Estoque Baixo'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {alertas.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum alerta de estoque baixo!</p>
          <p className="text-xs mt-1">Configure o estoque mínimo nos insumos para receber alertas aqui.</p>
        </div>
      )}
    </div>
  );
}

// ─── Aba: Insumos ────────────────────────────────────────────────────────────
function AbaInsumos({ insumos, onRefresh }) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);

  const filtered = insumos.filter(i =>
    i.nome?.toLowerCase().includes(search.toLowerCase()) ||
    i.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar insumo..." className="pl-9" />
        </div>
        <Button onClick={() => { setEditando(null); setModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Insumo
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 text-slate-600 font-semibold">Código</th>
              <th className="text-left p-3 text-slate-600 font-semibold">Nome</th>
              <th className="text-right p-3 text-slate-600 font-semibold">Estoque</th>
              <th className="text-right p-3 text-slate-600 font-semibold">Mínimo</th>
              <th className="text-right p-3 text-slate-600 font-semibold">Preço Custo</th>
              <th className="text-right p-3 text-slate-600 font-semibold">Valor Estoque</th>
              <th className="text-center p-3 text-slate-600 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhum insumo cadastrado.</td></tr>
            )}
            {filtered.map(i => {
              const alerta = i.estoque_minimo > 0 && (i.quantidade_estoque || 0) <= i.estoque_minimo;
              return (
                <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs text-slate-500">{i.codigo}</td>
                  <td className="p-3 font-medium text-slate-800 flex items-center gap-2">
                    {i.nome}
                    {alerta && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                  </td>
                  <td className={`p-3 text-right font-bold ${alerta ? 'text-rose-600' : 'text-slate-700'}`}>{i.quantidade_estoque ?? 0}</td>
                  <td className="p-3 text-right text-slate-400 text-xs">{i.estoque_minimo || '—'}</td>
                  <td className="p-3 text-right text-slate-600">{fmt(i.preco_custo)}</td>
                  <td className="p-3 text-right font-semibold text-slate-800">{fmt((i.quantidade_estoque || 0) * (i.preco_custo || 0))}</td>
                  <td className="p-3 text-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditando(i); setModal(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InsumoModal open={modal} onClose={() => setModal(false)} insumo={editando} onSaved={onRefresh} />
    </div>
  );
}

// ─── Aba: Entradas ───────────────────────────────────────────────────────────
function AbaEntradas({ insumos, onRefresh }) {
  const [modal, setModal] = useState(false);

  const { data: entradas = [] } = useQuery({
    queryKey: ['movimentacoes_entrada'],
    queryFn: () => base44.entities.MovimentacaoAlmoxarifado.filter({ tipo: 'entrada' }, '-data_movimentacao', 200),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{entradas.length} registos de entrada</p>
        <Button onClick={() => setModal(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Nova Entrada
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 text-slate-600 font-semibold">Data</th>
              <th className="text-left p-3 text-slate-600 font-semibold">Insumo</th>
              <th className="text-right p-3 text-slate-600 font-semibold">Qtd</th>
              <th className="text-left p-3 text-slate-600 font-semibold">Fornecedor</th>
              <th className="text-right p-3 text-slate-600 font-semibold">Vl. Unitário</th>
              <th className="text-right p-3 text-slate-600 font-semibold">Vl. Total</th>
            </tr>
          </thead>
          <tbody>
            {entradas.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma entrada registada.</td></tr>
            )}
            {entradas.map(e => (
              <tr key={e.id} className="border-t border-slate-100 hover:bg-emerald-50/30">
                <td className="p-3 text-slate-500">{fmtDate(e.data_movimentacao)}</td>
                <td className="p-3 font-medium text-slate-800">{e.insumo_nome}</td>
                <td className="p-3 text-right font-bold text-emerald-700">+{e.quantidade}</td>
                <td className="p-3 text-slate-500">{e.fornecedor || '—'}</td>
                <td className="p-3 text-right text-slate-600">{e.valor_unitario > 0 ? fmt(e.valor_unitario) : '—'}</td>
                <td className="p-3 text-right font-semibold text-slate-800">{e.valor_total > 0 ? fmt(e.valor_total) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EntradaModal open={modal} onClose={() => setModal(false)} insumos={insumos} onSaved={() => { onRefresh(); }} />
    </div>
  );
}

// ─── Aba: Saídas ─────────────────────────────────────────────────────────────
function AbaSaidas({ insumos, onRefresh }) {
  const [modal, setModal] = useState(false);

  const { data: saidas = [] } = useQuery({
    queryKey: ['movimentacoes_saida'],
    queryFn: () => base44.entities.MovimentacaoAlmoxarifado.filter({ tipo: 'saida' }, '-data_movimentacao', 200),
  });

  const motivoColor = {
    'Produção': 'bg-blue-100 text-blue-700',
    'Revenda': 'bg-purple-100 text-purple-700',
    'Perda': 'bg-rose-100 text-rose-700',
    'Uso Interno': 'bg-amber-100 text-amber-700',
    'Outros': 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{saidas.length} registos de saída</p>
        <Button onClick={() => setModal(true)} className="gap-2 bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4" /> Nova Saída
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 text-slate-600 font-semibold">Data</th>
              <th className="text-left p-3 text-slate-600 font-semibold">Insumo</th>
              <th className="text-right p-3 text-slate-600 font-semibold">Qtd</th>
              <th className="text-center p-3 text-slate-600 font-semibold">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {saidas.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhuma saída registada.</td></tr>
            )}
            {saidas.map(s => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-rose-50/20">
                <td className="p-3 text-slate-500">{fmtDate(s.data_movimentacao)}</td>
                <td className="p-3 font-medium text-slate-800">{s.insumo_nome}</td>
                <td className="p-3 text-right font-bold text-rose-600">-{s.quantidade}</td>
                <td className="p-3 text-center">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${motivoColor[s.motivo] || 'bg-slate-100 text-slate-600'}`}>
                    {s.motivo || '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SaidaModal open={modal} onClose={() => setModal(false)} insumos={insumos} onSaved={() => { onRefresh(); }} />
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Almoxarifado() {
  const queryClient = useQueryClient();

  const { data: insumos = [], isLoading } = useQuery({
    queryKey: ['insumos'],
    queryFn: () => base44.entities.Insumo.list('-created_date', 500),
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['insumos'] });
    queryClient.invalidateQueries({ queryKey: ['movimentacoes_entrada'] });
    queryClient.invalidateQueries({ queryKey: ['movimentacoes_saida'] });
  };

  const alertasCount = insumos.filter(i => i.estoque_minimo > 0 && (i.quantidade_estoque || 0) <= i.estoque_minimo).length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl">
            <Warehouse className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Almoxarifado</h1>
            <p className="text-sm text-slate-500">Gestão de Estoque e Insumos da Fábrica</p>
          </div>
        </div>
        {alertasCount > 0 && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-xl text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            {alertasCount} {alertasCount === 1 ? 'alerta' : 'alertas'} de estoque
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="visao-geral" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="insumos" className="gap-1.5 text-xs">
            <Package className="w-3.5 h-3.5" /> Insumos
          </TabsTrigger>
          <TabsTrigger value="entradas" className="gap-1.5 text-xs">
            <ArrowDownCircle className="w-3.5 h-3.5" /> Entradas
          </TabsTrigger>
          <TabsTrigger value="saidas" className="gap-1.5 text-xs">
            <ArrowUpCircle className="w-3.5 h-3.5" /> Saídas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <AbaVisaoGeral insumos={insumos} />
        </TabsContent>
        <TabsContent value="insumos">
          <AbaInsumos insumos={insumos} onRefresh={handleRefresh} />
        </TabsContent>
        <TabsContent value="entradas">
          <AbaEntradas insumos={insumos} onRefresh={handleRefresh} />
        </TabsContent>
        <TabsContent value="saidas">
          <AbaSaidas insumos={insumos} onRefresh={handleRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}