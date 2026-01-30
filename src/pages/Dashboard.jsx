import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, Package, ShoppingCart, Wallet, FileText, BarChart3, 
  Briefcase, Banknote, ScrollText, CreditCard, ShieldCheck, 
  ArrowRight, Clock, Calendar as CalendarIcon, Settings2
} from "lucide-react";
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from "@/components/UserNotRegisteredError";
import { cn } from "@/lib/utils";

// --- COMPONENTE: RELÓGIO ANALÓGICO ---
const AnalogClock = ({ time }) => {
  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secondDeg = (seconds / 60) * 360;
  const minuteDeg = ((minutes * 60 + seconds) / 3600) * 360;
  const hourDeg = ((hours * 60 + minutes) / 720) * 360;

  return (
    <div className="relative w-48 h-48 rounded-full border-4 border-slate-200 bg-white shadow-inner flex items-center justify-center mx-auto">
      {/* Marcadores */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="absolute w-1 h-3 bg-slate-300 origin-bottom" 
             style={{ 
               transform: `rotate(${i * 30}deg) translate(0, -88px)`, // Ajuste fino da posição
               top: '50%', left: '50%', marginTop: '-1.5px', marginLeft: '-0.5px' 
             }} 
        />
      ))}
      
      {/* Ponteiro Hora */}
      <div className="absolute w-1.5 h-12 bg-slate-800 rounded-full origin-bottom"
           style={{ transform: `rotate(${hourDeg}deg)`, bottom: '50%', left: 'calc(50% - 0.75px)' }} />
      {/* Ponteiro Minuto */}
      <div className="absolute w-1 h-16 bg-slate-600 rounded-full origin-bottom"
           style={{ transform: `rotate(${minuteDeg}deg)`, bottom: '50%', left: 'calc(50% - 0.5px)' }} />
      {/* Ponteiro Segundo */}
      <div className="absolute w-0.5 h-20 bg-red-500 rounded-full origin-bottom"
           style={{ transform: `rotate(${secondDeg}deg)`, bottom: '50%', left: 'calc(50% - 0.25px)' }} />
      {/* Centro */}
      <div className="absolute w-3 h-3 bg-slate-800 rounded-full border-2 border-white z-10" />
    </div>
  );
};

// --- COMPONENTE: RELÓGIO DIGITAL ---
const DigitalClock = ({ time }) => {
  return (
    <div className="flex flex-col items-center justify-center h-48">
      <div className="text-6xl font-bold text-slate-800 font-mono tracking-tighter">
        {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-xl text-slate-400 font-medium mt-2">
        {time.toLocaleTimeString('pt-BR', { second: '2-digit' })}
      </div>
    </div>
  );
};

// --- COMPONENTE: MINI CALENDÁRIO ---
const MiniCalendar = () => {
  const today = new Date();
  const currentDay = today.getDate();
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  
  // Gera dias do mês (simplificado para visualização)
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
            "text-sm p-1.5 rounded-md",
            !day && "invisible",
            day === currentDay ? "bg-blue-600 text-white font-bold shadow-md" : "text-slate-600 hover:bg-slate-100"
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
  
  // Estado do Relógio (Lê do localStorage ou padrão 'digital')
  const [clockType, setClockType] = useState(() => localStorage.getItem('jc_clock_pref') || 'digital');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Salvar preferência
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
      lightColor: "bg-blue-50 text-blue-700",
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
      lightColor: "bg-amber-50 text-amber-700",
      items: [
        { name: "Pedidos", label: "Pedidos de Venda", icon: ShoppingCart, desc: "Emissão e acompanhamento" },
        { name: "Orcamentos", label: "Orçamentos", icon: FileText, desc: "Propostas comerciais" },
        { name: "Comissoes", label: "Comissões", icon: Banknote, desc: "Pagamento de representantes" },
      ]
    },
    {
      title: "Financeiro",
      color: "bg-emerald-600",
      lightColor: "bg-emerald-50 text-emerald-700",
      items: [
        { name: "CaixaDiario", label: "Caixa Diário", icon: Wallet, desc: "Movimentação do dia" },
        { name: "Pagamentos", label: "Contas a Pagar", icon: Banknote, desc: "Despesas e boletos" },
        { name: "Cheques", label: "Controle de Cheques", icon: ScrollText, desc: "Custódia e compensação" },
        { name: "Creditos", label: "Créditos", icon: CreditCard, desc: "Haveres de clientes" },
        { name: "EntradaCaucao", label: "Entrada/Caução", icon: Wallet, desc: "Adiantamentos" },
        { name: "Balanco", label: "Balanço", icon: BarChart3, desc: "Resumo contábil" },
      ]
    },
    {
      title: "Gestão & Sistema",
      color: "bg-slate-600",
      lightColor: "bg-slate-50 text-slate-700",
      items: [
        { name: "Relatorios", label: "Relatórios & Dashboards", icon: BarChart3, desc: "Análise de dados" },
        { name: "Logs", label: "Auditoria", icon: ScrollText, desc: "Histórico de ações" },
        { name: "FormasPagamento", label: "Formas Pagto.", icon: CreditCard, desc: "Configuração financeira" },
      ]
    }
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1800px] mx-auto animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* --- COLUNA ESQUERDA: Módulos (Ocupa 3/4 da tela em telas grandes) --- */}
        <div className="xl:col-span-3 space-y-10">
          {/* Header */}
          <div className="flex flex-col gap-1 pb-4 border-b border-slate-100">
            <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
              {getGreeting()}, <span className="text-blue-600">{user?.displayName?.split(' ')[0] || 'Usuário'}</span>
            </h1>
            <p className="text-slate-500 text-lg">Selecione um módulo para começar a trabalhar.</p>
          </div>

          {/* Grid de Módulos */}
          <div className="space-y-12">
            {menuGroups.map((group, idx) => {
              const allowedItems = group.items.filter(item => canDo(item.name, 'visualizar') || item.name === 'Relatorios');
              if (allowedItems.length === 0) return null;

              return (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-6 rounded-full ${group.color}`}></div>
                    <h2 className="text-xl font-bold text-slate-700">{group.title}</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allowedItems.map((item) => (
                      <Link key={item.name} to={`/${item.name}`} className="group h-full">
                        <Card className="h-full border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 group-hover:-translate-y-1 overflow-hidden">
                          <CardHeader className="p-5 pb-2">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${group.lightColor} group-hover:bg-white group-hover:shadow-sm`}>
                              <item.icon className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                              {item.label}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-5 pt-0">
                            <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                              {item.desc}
                            </p>
                            <div className="flex items-center text-xs font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
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

        {/* --- COLUNA DIREITA: Widgets (Relógio, Calendário) --- */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Card do Relógio */}
          <Card className="border-slate-200 shadow-sm overflow-hidden relative">
            <div className="absolute top-3 right-3 z-10">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400 hover:text-slate-700" 
                onClick={toggleClock}
                title="Trocar estilo do relógio"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            </div>
            <CardContent className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white">
              {clockType === 'digital' ? <DigitalClock time={time} /> : <AnalogClock time={time} />}
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                <CalendarIcon className="w-4 h-4" />
                {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </CardContent>
          </Card>

          {/* Card do Calendário */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <MiniCalendar />
            </CardContent>
          </Card>

          {/* Dica do Sistema (Ideia para deixar mais bonito) */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
            <h3 className="font-bold text-lg mb-2">Dica do Dia</h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Mantenha os cadastros de clientes atualizados (CNPJ e Endereço) para garantir que o cálculo de impostos (ST) seja feito corretamente nos pedidos.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}