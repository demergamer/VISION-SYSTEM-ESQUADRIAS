import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, Package, ShoppingCart, Wallet, FileText, BarChart3, 
  Briefcase, Banknote, ScrollText, CreditCard, ShieldCheck, 
  Calendar as CalendarIcon, Settings2, ShieldAlert, LogOut, User as UserIcon
} from "lucide-react";
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from "@/components/hooks/usePermissions";
import { cn } from "@/lib/utils";

// --- NOVOS IMPORTS DO AVATAR E DROPDOWN ---
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Componentes Importados
import PS2Background from '@/components/dashboard/PS2Background';
import NavigationCard from '@/components/dashboard/NavigationCard';

// --- WIDGETS AUXILIARES (Relógio/Calendário) ---
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
             style={{ transform: `rotate(${i * 30}deg) translate(0, -88px)`, top: '50%', left: '50%', marginTop: '-1.5px', marginLeft: '-0.5px' }} />
      ))}
      <div className="absolute w-1.5 h-12 bg-slate-800 rounded-full origin-bottom" style={{ transform: `rotate(${hourDeg}deg)`, bottom: '50%', left: 'calc(50% - 0.75px)' }} />
      <div className="absolute w-1 h-16 bg-slate-600 rounded-full origin-bottom" style={{ transform: `rotate(${minuteDeg}deg)`, bottom: '50%', left: 'calc(50% - 0.5px)' }} />
      <div className="absolute w-0.5 h-20 bg-blue-500 rounded-full origin-bottom" style={{ transform: `rotate(${secondDeg}deg)`, bottom: '50%', left: 'calc(50% - 0.25px)' }} />
      <div className="absolute w-3 h-3 bg-slate-800 rounded-full border-2 border-white z-10" />
    </div>
  );
};

const DigitalClock = ({ time }) => (
  <div className="flex flex-col items-center justify-center h-48">
    <div className="text-6xl font-bold text-slate-800 font-mono tracking-tighter drop-shadow-sm">
      {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </div>
    <div className="text-xl text-slate-500 font-medium mt-2">
      {time.toLocaleTimeString('pt-BR', { second: '2-digit' })}
    </div>
  </div>
);

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
        {weekDays.map((d, i) => <span key={i} className="text-xs font-bold text-slate-400">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day, i) => (
          <div key={i} className={cn("text-sm p-1.5 rounded-md transition-all", !day && "invisible", day === currentDay ? "bg-blue-600 text-white font-bold shadow-md scale-110" : "text-slate-600 hover:bg-white hover:shadow-sm")}>{day}</div>
        ))}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user, logout } = useAuth(); // Incluindo logout caso exista no seu AuthContext
  const { canDo } = usePermissions();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [clockType, setClockType] = useState(() => localStorage.getItem('jc_clock_pref') || 'digital');

  // --- DADOS DO PERFIL DO USUÁRIO ---
  const metadata = user?.user_metadata || {};
  const avatarUrl = metadata.avatar_url;
  const preferredName = metadata.preferred_name || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Administrador';
  const initials = preferredName.substring(0, 2).toUpperCase();

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

  const handleLogout = () => {
    if (logout) {
      logout();
    } else {
      console.warn("Função de logout não encontrada no useAuth.");
    }
  };

  const menuGroups = [
    {
      title: "Cadastros Gerais",
      color: "blue", 
      items: [
        { name: "Clientes", label: "Clientes", icon: Users, desc: "Gestão de carteira de clientes" },
        { name: "Produtos", label: "Produtos", icon: Package, desc: "Catálogo, preços e estoque" },
        { name: "Fornecedores", label: "Fornecedores", icon: Briefcase, desc: "Parceiros e compras" },
        { name: "Representantes", label: "Representantes", icon: Users, desc: "Equipe de vendas" },
        { name: "Usuarios", label: "Usuários", icon: ShieldCheck, desc: "Controle de acesso" },
      ]
    },
    {
      title: "Vendas & Comercial",
      color: "amber",
      items: [
        { name: "Pedidos", label: "Pedidos", icon: ShoppingCart, desc: "Emissão e acompanhamento" },
        { name: "Orcamentos", label: "Orçamentos", icon: FileText, desc: "Propostas comerciais" },
        { name: "Comissoes", label: "Comissões", icon: Banknote, desc: "Pagamentos de comissão" },
      ]
    },
    {
      title: "Financeiro",
      color: "green",
      items: [
        { name: "CaixaDiario", label: "Caixa", icon: Wallet, desc: "Movimentação diária" },
        { name: "Pagamentos", label: "A Pagar", icon: Banknote, desc: "Despesas e boletos" },
        { name: "Cheques", label: "Cheques", icon: ScrollText, desc: "Controle de custódia" },
        { name: "Creditos", label: "Créditos", icon: CreditCard, desc: "Haveres de clientes" },
        { name: "EntradaCaucao", label: "Caução", icon: Wallet, desc: "Adiantamentos" },
        { name: "Balanco", label: "Balanço", icon: BarChart3, desc: "Resumo financeiro" },
      ]
    },
    {
      title: "Sistema",
      color: "slate",
      items: [
        { name: "Relatorios", label: "Relatórios", icon: BarChart3, desc: "Análise de dados" },
        { name: "Logs", label: "Auditoria", icon: ScrollText, desc: "Histórico de ações" },
        { name: "FormasPagamento", label: "Config.", icon: CreditCard, desc: "Meios de pagamento" },
      ]
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <PS2Background theme="light" /> 

      <div className="relative z-10 p-6 md:p-8 max-w-[1800px] mx-auto animate-in fade-in zoom-in-95 duration-700">
        
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* ESQUERDA: MÓDULOS */}
          <div className="xl:col-span-3 space-y-10">
            
            {/* CABEÇALHO ATUALIZADO COM PERFIL E DROPDOWN */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/50">
              <div className="flex flex-col gap-1">
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight drop-shadow-sm">
                  {getGreeting()}, <span className="text-blue-600">{preferredName}</span>
                </h1>
                <p className="text-slate-600 text-lg font-medium">Selecione um módulo para começar a trabalhar.</p>
              </div>

              {/* MENU DE PERFIL DO ADMINISTRADOR */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100/50 p-2 pr-4 rounded-full transition-all border border-transparent hover:border-slate-200">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-slate-800">{preferredName}</p>
                      <p className="text-xs text-slate-500 font-medium tracking-wide">Administrador</p>
                    </div>
                    <Avatar className="w-14 h-14 border-2 border-white shadow-md">
                      <AvatarImage src={avatarUrl} className="object-cover" />
                      <AvatarFallback className="bg-blue-600 text-white font-bold text-lg">{initials}</AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2">
                  <DropdownMenuLabel className="font-bold text-slate-800">Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/usuarios')}>
                    <UserIcon className="mr-2 h-4 w-4 text-slate-500" />
                    <span className="font-medium">Gerenciar Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="font-medium">Sair do Sistema</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-12">
              {menuGroups.map((group, idx) => {
                const allowedItems = group.items.filter(item => canDo(item.name, 'visualizar') || item.name === 'Relatorios');
                if (allowedItems.length === 0) return null;

                return (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-1.5 h-6 rounded-full shadow-sm", 
                        group.color === 'blue' ? 'bg-blue-600' : 
                        group.color === 'amber' ? 'bg-amber-500' : 
                        group.color === 'green' ? 'bg-emerald-600' : 'bg-slate-600'
                      )}></div>
                      <h2 className="text-xl font-bold text-slate-700 drop-shadow-sm">{group.title}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allowedItems.map((item) => (
                        <NavigationCard
                          key={item.name}
                          title={item.label}
                          description={item.desc}
                          icon={item.icon}
                          color={group.color}
                          onClick={() => navigate(`/${item.name}`)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DIREITA: WIDGETS */}
          <div className="xl:col-span-1 space-y-6">
            <Card className="border-white/40 bg-white/60 backdrop-blur-md shadow-sm overflow-hidden relative ring-1 ring-white/50">
              <div className="absolute top-3 right-3 z-10">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-white/50" onClick={toggleClock} title="Trocar estilo">
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

            <Card className="border-white/40 bg-white/60 backdrop-blur-md shadow-sm ring-1 ring-white/50">
              <CardContent className="p-6">
                <MiniCalendar />
              </CardContent>
            </Card>

            <div className="bg-gradient-to-br from-blue-600/90 to-indigo-700/90 backdrop-blur-md rounded-2xl p-6 text-white shadow-lg shadow-blue-900/20 ring-1 ring-white/20">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-200" />
                Dica do Dia
              </h3>
              <p className="text-blue-50 text-sm leading-relaxed font-medium">
                Utilize o botão direito do mouse na listagem de clientes para acessar o histórico de pedidos rapidamente.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}