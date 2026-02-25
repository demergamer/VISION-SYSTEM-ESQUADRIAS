import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, TrendingUp } from 'lucide-react';

export default function ClientesAtivosWidget() {
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes_widget'],
    queryFn: () => base44.entities.Cliente.list('-created_date', 200),
  });

  const total = clientes.length;
  const comLimite = clientes.filter(c => c.limite_credito > 0).length;
  const bloqueados = clientes.filter(c => c.bloqueado_manual).length;
  const ativos = total - bloqueados;

  // Top regiões
  const regioesCont = clientes.reduce((acc, c) => {
    if (c.regiao) acc[c.regiao] = (acc[c.regiao] || 0) + 1;
    return acc;
  }, {});
  const topRegioes = Object.entries(regioesCont)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (isLoading) return (
    <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Carregando...</div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-violet-600" />
        <span className="font-bold text-slate-700 text-sm">Clientes Ativos</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total', value: total, color: 'text-slate-700' },
          { label: 'Ativos', value: ativos, color: 'text-emerald-600' },
          { label: 'Bloqueados', value: bloqueados, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center p-2 rounded-lg bg-slate-50">
            <span className={`text-xl font-extrabold ${s.color}`}>{s.value}</span>
            <span className="text-[10px] text-slate-400 font-medium">{s.label}</span>
          </div>
        ))}
      </div>
      {topRegioes.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Top Regiões</p>
          <div className="space-y-1.5">
            {topRegioes.map(([regiao, count]) => (
              <div key={regiao} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 flex-1 truncate">{regiao}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[80px]">
                  <div
                    className="bg-violet-500 h-1.5 rounded-full"
                    style={{ width: `${Math.round((count / total) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-500 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}