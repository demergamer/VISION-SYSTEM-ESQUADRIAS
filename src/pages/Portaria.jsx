import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, ClipboardList, Shield, ArrowRight, Truck } from 'lucide-react';

export default function Portaria() {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Estacionamento Virtual',
      description: 'Veja quais veículos estão na empresa ou na rua. Registre saídas e retornos rapidamente.',
      icon: Car,
      path: '/estacionamentovirtual',
      color: 'from-blue-600 to-blue-700',
      iconBg: 'bg-blue-500/30',
    },
    {
      title: 'Controle de Circulação',
      description: 'Histórico completo de todas as movimentações. Busque por placa ou motorista.',
      icon: ClipboardList,
      path: '/controlecirculacao',
      color: 'from-emerald-600 to-emerald-700',
      iconBg: 'bg-emerald-500/30',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800 rounded-2xl mb-6 shadow-lg border border-slate-700">
            <Shield className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Portaria</h1>
          <p className="text-slate-400 mt-2 text-lg">Controle de Frota & Circulação</p>
        </div>

        {/* Cards de Navegação */}
        <div className="grid grid-cols-1 gap-5">
          {cards.map((card) => (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className={`w-full bg-gradient-to-r ${card.color} rounded-2xl p-7 flex items-center gap-6 text-left shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group`}
            >
              <div className={`shrink-0 w-16 h-16 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                <card.icon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{card.title}</h2>
                <p className="text-white/70 text-sm mt-1 leading-relaxed">{card.description}</p>
              </div>
              <ArrowRight className="w-6 h-6 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          ))}
        </div>

        <p className="text-center text-slate-600 text-xs mt-10">J&C Vision · Módulo de Portaria</p>
      </div>
    </div>
  );
}