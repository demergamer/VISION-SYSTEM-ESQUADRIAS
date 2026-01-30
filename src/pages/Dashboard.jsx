import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, Package, ShoppingCart, Wallet, FileText, BarChart3, 
  Briefcase, Banknote, ScrollText, CreditCard, ShieldCheck, 
  ArrowRight, Calendar as CalendarIcon, Settings2
} from "lucide-react";
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from "@/components/UserNotRegisteredError";
import { cn } from "@/lib/utils";
import PS2Background from '@/components/dashboard/PS2Background'; // <--- IMPORTANTE

// --- COMPONENTE: RELÓGIO ANALÓGICO (Estilo Clean) ---
const AnalogClock = ({ time }) => {
  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secondDeg = (seconds / 60) * 360;
  const minuteDeg = ((minutes * 60 + seconds) / 3600) * 360;
  const hourDeg = ((hours * 60 + minutes) / 720) * 360;

  return (
    <div className="relative w-48 h-48 rounded-full border-4 border-slate-200/50 bg-white/50 backdrop-blur-sm shadow-inner flex items-center justify-center mx-auto">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="absolute w-1 h-3 bg-slate-400 origin-bottom" 
             style={{ 
               transform: `rotate(${i * 30}deg) translate(0, -88px)`, 
               top: '50%', left: '50%', marginTop: '-1.5px', marginLeft: '-0.5px' 
             }} 
        />
      ))}
      <div className="absolute w-1.5 h-12 bg-slate-800 rounded-full origin-bottom"
           style={{ transform: `rotate(${hourDeg}deg)`, bottom: '50%', left: 'calc(50% - 0.75px)' }} />
      <div className="absolute w-1 h-16 bg-slate-600 rounded-full origin-bottom"
           style={{ transform: `rotate(${minuteDeg}deg)`, bottom: '50%', left: 'calc(50% - 0.5px)' }} />
      <div className="absolute w-0.5 h-20 bg-blue-500 rounded-full origin-bottom"
           style={{ transform: `rotate(${secondDeg}deg)`, bottom: '50%', left: 'calc(50% - 0.25px)' }} />
      <div className="absolute w-3 h-3 bg-slate-800 rounded-full border-2 border-white z-10" />
    </div>
  );
};

const DigitalClock = ({ time }) => {
  return (
    <div className="flex flex-col items-center justify-center h-48">
      <div className="text-6xl font-bold text-slate-800 font-mono tracking-tighter drop-shadow-sm">
        {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-xl text-slate-500 font-medium mt-2">
        {time.toLocaleTimeString('pt-BR', { second: '2-digit' })}
      </div>
    </div>
  );
};

const MiniCalendar = () => {
  const today = new Date();
  const currentDay = today.getDate();
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const days = [];
  for (let i = 0; i < firstDayIndex; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <span className="font-bold text-slate-700 capitalize">
          {today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekDays.map((d, i) => (
          <span key={i} className="text-xs font-bold text-slate-400">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day, i) => (
          <div key={i} className={cn(
            "text-sm p-1.5 rounded-md transition-all",
            !day && "invisible",
            day === currentDay 
              ? "bg-blue-600 text-white font-bold shadow-md scale-110" 
              : "text-slate-600 hover:bg-white hover:shadow-sm"
          )}>
            {day}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const { canDo } = usePermissions();
  const [time, setTime] = useState(new Date());
  const [clockType, setClockType] = useState(() => localStorage.getItem('jc_clock_pref') || 'digital');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleClock = () => {
    const newType = clockType === 'digital' ? 'analog' : 'digital';
    setClockType(newType);
    localStorage.setItem('jc_clock_pref', newType);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const menuGroups = [
    {
      title: "Cadastros Gerais",
      color: "bg-blue-600",
      lightColor: "bg-blue-50/50 text-blue-700", // Mais transparência no ícone
      items: [
        { name: "Clientes", label: "Clientes", icon: Users, desc: "Gestão de carteira" },
        { name: "Produtos", label: "Produtos", icon: Package, desc: "Catálogo e estoque" },
        { name: "Fornecedores", label: "Fornecedores", icon: Briefcase, desc: "Parceiros e compras" },
        { name: "Representantes", label: "Representantes", icon: Users, desc: "Equipe de vendas" },
        { name: "Usuarios", label: "Usuários", icon: ShieldCheck, desc: "Acesso ao sistema" },
      ]
    },
    {
      title: "Vendas & Comercial",
      color: "bg-amber-500",
      lightColor: "bg-amber-50/50 text-amber-700",
      items: [
        { name: "Pedidos", label: "Pedidos", icon: ShoppingCart, desc: "Emissão e tracking" },
        { name: "Orcamentos", label: "Orçamentos", icon: FileText, desc: "Propostas comerciais" },
        { name: "Comissoes", label: "Comissões", icon: Banknote, desc: "Pagamentos" },
      ]
    },
    {
      title: "Financeiro",
      color: "bg-emerald-600",
      lightColor: "bg-emerald-50/50 text-emerald-700",
      items: [
        { name: "CaixaDiario", label: "Caixa", icon: Wallet, desc: "Movimentação diária" },
        { name: "Pagamentos", label: "A Pagar", icon: Banknote, desc: "Despesas e boletos" },
        { name: "Cheques", label: "Cheques", icon: ScrollText, desc: "Custódia" },
        { name: "Creditos", label: "Créditos", icon: CreditCard, desc: "Haveres" },
        { name: "EntradaCaucao", label: "Caução", icon: Wallet, desc: "Adiantamentos" },
        { name: "Balanco", label: "Balanço", icon: BarChart3, desc: "Resumo" },
      ]
    },
    {
      title: "Sistema",
      color: "bg-slate-600",
      lightColor: "bg-slate-50/50 text-slate-700",
      items: [
        { name: "Relatorios", label: "Relatórios", icon: BarChart3, desc: "Análise de dados" },
        { name: "Logs", label: "Auditoria", icon: ScrollText, desc: "Histórico" },
        { name: "FormasPagamento", label: "Config.", icon: CreditCard, desc: "Pagamentos" },
      ]
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      
      {/* 1. FUNDO PS2 3D */}
      <PS2Background theme="light" /> 

      {/* Conteúdo Principal (z-index maior para ficar sobre o fundo) */}
      <div className="relative z-10 p-6 md:p-8 max-w-[1800px] mx-auto animate-in fade-in zoom-in-95 duration-700">
        
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* --- COLUNA ESQUERDA: Módulos --- */}
          <div className="xl:col-span-3 space-y-10">
            {/* Header com sombra no texto para ler sobre qualquer fundo */}
            <div className="flex flex-col gap-1 pb-4 border-b border-slate-200/50">
              <h1 className="text-4xl font-bold text-slate-800 tracking-tight drop-shadow-sm">
                {getGreeting()}, <span className="text-blue-600">{user?.displayName?.split(' ')[0] || 'Usuário'}</span>
              </h1>
              <p className="text-slate-600 text-lg font-medium">Selecione um módulo para começar a trabalhar.</p>
            </div>

            {/* Grid de Módulos */}
            <div className="space-y-12">
              {menuGroups.map((group, idx) => {
                const allowedItems = group.items.filter(item => canDo(item.name, 'visualizar') || item.name === 'Relatorios');
                if (allowedItems.length === 0) return null;

                return (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-6 rounded-full shadow-sm ${group.color}`}></div>
                      <h2 className="text-xl font-bold text-slate-700 drop-shadow-sm">{group.title}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allowedItems.map((item) => (
                        <Link key={item.name} to={`/${item.name}`} className="group h-full">
                          {/* CARD COM EFEITO GLASSMORPHISM */}
                          <Card className="h-full border-white/40 bg-white/60 backdrop-blur-md shadow-sm hover:shadow-xl hover:bg-white/80 transition-all duration-300 group-hover:-translate-y-1 overflow-hidden ring-1 ring-white/50">
                            <CardHeader className="p-5 pb-2">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${group.lightColor} group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md`}>
                                <item.icon className="w-6 h-6" />
                              </div>
                              <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                {item.label}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 pt-0">
                              <p className="text-sm text-slate-600 line-clamp-2 mb-3 font-medium">
                                {item.desc}
                              </p>
                              <div className="flex items-center text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                                Acessar <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- COLUNA DIREITA: Widgets Glassmorphism --- */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Relógio Glass */}
            <Card className="border-white/40 bg-white/60 backdrop-blur-md shadow-sm overflow-hidden relative ring-1 ring-white/50">
              <div className="absolute top-3 right-3 z-10">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-white/50" 
                  onClick={toggleClock}
                  title="Trocar estilo"
                >
                  <Settings2 className="w-4 h-4" />
                </Button>
              </div>
              <CardContent className="p-6 flex flex-col items-center justify-center">
                {clockType === 'digital' ? <DigitalClock time={time} /> : <AnalogClock time={time} />}
                <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-600 bg-white/50 px-4 py-1.5 rounded-full shadow-sm">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </CardContent>
            </Card>

            {/* Calendário Glass */}
            <Card className="border-white/40 bg-white/60 backdrop-blur-md shadow-sm ring-1 ring-white/50">
              <CardContent className="p-6">
                <MiniCalendar />
              </CardContent>
            </Card>

            {/* Dica Glass */}
            <div className="bg-gradient-to-br from-blue-600/90 to-indigo-700/90 backdrop-blur-md rounded-2xl p-6 text-white shadow-lg shadow-blue-900/20 ring-1 ring-white/20">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-200" />
                Dica do Dia
              </h3>
              <p className="text-blue-50 text-sm leading-relaxed font-medium">
                Utilize o botão direito do mouse na listagem de clientes para acessar o histórico de pedidos rapidamente sem abrir o cadastro.
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}