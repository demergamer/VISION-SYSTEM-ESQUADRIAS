import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from 'date-fns';

export default function MetricasVendasWidget() {
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos_metricas_widget'],
    queryFn: () => base44.entities.Pedido.list('-created_date', 500),
  });

  const now = new Date();

  // Últimos 5 meses
  const months = Array.from({ length: 5 }, (_, i) => {
    const d = subMonths(now, 4 - i);
    return {
      label: format(d, 'MMM'),
      start: startOfMonth(d),
      end: endOfMonth(d),
    };
  });

  const chartData = months.map(m => {
    const pMes = pedidos.filter(p => {
      const date = p.data_pagamento ? parseISO(p.data_pagamento) : null;
      if (!date) return false;
      return isWithinInterval(date, { start: m.start, end: m.end });
    });
    const total = pMes.reduce((s, p) => s + (p.valor_pedido || 0), 0);
    return { name: m.label, valor: total };
  });

  const mesAtual = chartData[chartData.length - 1]?.valor || 0;
  const mesAnterior = chartData[chartData.length - 2]?.valor || 0;
  const variacao = mesAnterior > 0 ? ((mesAtual - mesAnterior) / mesAnterior) * 100 : 0;
  const crescendo = variacao >= 0;

  const totalGeral = pedidos.reduce((s, p) => s + (p.valor_pedido || 0), 0);
  const pagos = pedidos.filter(p => p.status === 'pago').length;

  if (isLoading) return (
    <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Carregando...</div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-4 h-4 text-emerald-600" />
        <span className="font-bold text-slate-700 text-sm">Métricas de Vendas</span>
        <span className={`ml-auto flex items-center gap-1 text-xs font-bold ${crescendo ? 'text-emerald-600' : 'text-red-500'}`}>
          {crescendo ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {Math.abs(variacao).toFixed(1)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-emerald-50">
          <p className="text-[10px] text-emerald-600 font-bold uppercase">Mês Atual</p>
          <p className="text-base font-extrabold text-emerald-700">
            {mesAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-slate-50">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Pagos ({pedidos.length})</p>
          <p className="text-base font-extrabold text-slate-700">{pagos}</p>
        </div>
      </div>

      <div className="h-[90px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}