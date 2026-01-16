import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; 
import { 
  Users, ShoppingCart, CreditCard, AlertCircle, 
  Search, Briefcase, Wallet, LogOut, Loader2 
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";

// --- FUNÇÃO GLOBAL (FORA DO COMPONENTE) ---
// Ao colocar aqui fora, é IMPOSSÍVEL dar erro de inicialização
const realizarLogout = () => {
  localStorage.clear(); 
  window.location.href = '/'; 
};

// --- Componente Widget ---
const StatWidget = ({ title, value, subtitle, icon: Icon, color }) => {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    red: "bg-red-50 text-red-600 border-red-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
  const currentStyle = colorStyles[color] || colorStyles.blue;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-md transition-all duration-300 group">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-extrabold text-slate-800">{value}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl border ${currentStyle} group-hover:scale-110 transition-transform`}>
        <Icon size={22} />
      </div>
    </div>
  );
};

export default function PortalDoRepresentante() {
  // --- ESTADOS ---
  const [user, setUser] = useState(null);
  const [representante, setRepresentante] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('clientes');
  const [loadingAuth, setLoadingAuth] = useState(true);

  // --- BUSCA DE USUÁRIO ---
  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const userData = await base44.auth.me();
        if (isMounted) setUser(userData);
      } catch (error) {
        console.error("Erro auth:", error);
      } finally {
        if (isMounted) setLoadingAuth(false);
      }
    };
    fetchUser();
    return () => { isMounted = false; };
  }, []);

  const { data: todosRepresentantes = [], isLoading: loadingReps } = useQuery({
    queryKey: ['representantes'],
    queryFn: () => base44.entities.Representante.list(),
    enabled: !!user
  });

  useEffect(() => {
    if (user && todosRepresentantes.length > 0) {
      const rep = todosRepresentantes.find(r => r.email === user.email);
      setRepresentante(rep);
    }
  }, [user, todosRepresentantes]);

  const { data: todosClientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list(), enabled: !!representante });
  const { data: todosPedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list(), enabled: !!representante });
  const { data: todosCheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list(), enabled: !!representante });

  // --- CÁLCULOS ---
  const meusClientes = useMemo(() => representante ? todosClientes.filter(c => c.representante_codigo === representante.codigo) : [], [todosClientes, representante]);
  const meusPedidosAbertos = useMemo(() => representante ? todosPedidos.filter(p => p.representante_codigo === representante.codigo && p.status !== 'pago' && p.status !== 'cancelado') : [], [todosPedidos, representante]);
  const meusCheques = useMemo(() => {
    if (!representante) return [];
    const codigos = meusClientes.map(c => c.codigo);
    return todosCheques.filter(ch => codigos.includes(ch.cliente_codigo));
  }, [todosCheques, meusClientes, representante]);

  const stats = useMemo(() => {
    const now = new Date();
    const valorAtrasado = meusPedidosAbertos
      .filter(p => differenceInDays(now, new Date(p.data_entrega)) > 20)
      .reduce((sum, p) => sum + (p.saldo_restante || 0), 0);

    return {
      totalClientes: meusClientes.length,
      totalPedidosAbertos: meusPedidosAbertos.length,
      valorPedidosAbertos: meusPedidosAbertos.reduce((sum, p) => sum + (p.saldo_restante || 0), 0),
      chequesAVencer: meusCheques.filter(ch => ch.status === 'normal').length,
      valorChequesAVencer: meusCheques.filter(ch => ch.status === 'normal').reduce((sum, ch) => sum + (ch.valor || 0), 0),
      pedidosAtrasados: meusPedidosAbertos.filter(p => differenceInDays(now, new Date(p.data_entrega)) > 20).length,
      valorAtrasado
    };
  }, [meusClientes, meusPedidosAbertos, meusCheques]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  // Filtros de busca simples
  const filteredClientes = meusClientes.filter(c => JSON.stringify(c).toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredPedidos = meusPedidosAbertos.filter(p => JSON.stringify(p).toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredCheques = meusCheques.filter(ch => JSON.stringify(ch).toLowerCase().includes(searchTerm.toLowerCase()));

  // --- RENDERIZAÇÃO ---

  if (loadingAuth || (user && loadingReps)) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Carregando...</p>
      </div>
    );
  }

  if (!user || !representante) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center border-amber-200 bg-amber-50">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
          <p className="text-slate-600 mb-6">Conta não vinculada a um representante.</p>
          <div className="flex justify-center gap-3">
             <Button onClick={() => window.location.reload()} variant="outline" className="bg-white">Recarregar</Button>
             <Button onClick={realizarLogout} variant="destructive">Sair</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Olá, <span className="text-blue-600">{representante.nome}</span></h1>
            <p className="text-slate-500 text-lg">Resumo da sua carteira</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Rep. Oficial</span>
            </div>
            <Button onClick={realizarLogout} variant="ghost" className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl">
              <LogOut className="w-5 h-5 mr-2" /> Sair
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatWidget title="Clientes" value={stats.totalClientes} icon={Users} color="blue" />
          <StatWidget title="Vendas Abertas" value={formatCurrency(stats.valorPedidosAbertos)} subtitle={`${stats.totalPedidosAbertos} pedidos`} icon={ShoppingCart} color="amber" />
          <StatWidget title="Cheques Carteira" value={formatCurrency(stats.valorChequesAVencer)} icon={CreditCard} color="purple" />
          <StatWidget title="Atrasado (+20d)" value={formatCurrency(stats.valorAtrasado)} icon={AlertCircle} color="red" />
        </div>

        {/* Tabelas */}
        <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                <TabsList className="bg-slate-100 p-1 rounded-xl h-auto">
                  <TabsTrigger value="clientes" className="rounded-lg px-4 py-2">Clientes</TabsTrigger>
                  <TabsTrigger value="pedidos" className="rounded-lg px-4 py-2">Pedidos</TabsTrigger>
                  <TabsTrigger value="cheques" className="rounded-lg px-4 py-2">Cheques</TabsTrigger>
                </TabsList>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="Filtrar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-xl" />
                </div>
              </div>

              {/* Conteúdo das Abas */}
              <TabsContent value="clientes">
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50"><TableRow><TableHead>Nome</TableHead><TableHead>Cidade</TableHead><TableHead className="text-right">Limite</TableHead></TableRow></TableHeader>
                    <TableBody>{filteredClientes.map(c => (
                      <TableRow key={c.id}><TableCell className="font-bold">{c.nome}</TableCell><TableCell>{c.regiao}</TableCell><TableCell className="text-right text-emerald-600">{formatCurrency(c.limite_credito)}</TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="pedidos">
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50"><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
                    <TableBody>{filteredPedidos.map(p => (
                      <TableRow key={p.id}><TableCell>#{p.numero_pedido}</TableCell><TableCell>{p.cliente_nome}</TableCell><TableCell>{p.data_entrega ? format(new Date(p.data_entrega), 'dd/MM/yyyy') : '-'}</TableCell><TableCell className="text-right font-bold">{formatCurrency(p.saldo_restante)}</TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="cheques">
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50"><TableRow><TableHead>Cheque</TableHead><TableHead>Cliente</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                    <TableBody>{filteredCheques.map(c => (
                      <TableRow key={c.id}><TableCell>{c.numero_cheque}</TableCell><TableCell>{c.cliente_nome}</TableCell><TableCell>{c.data_vencimento ? format(new Date(c.data_vencimento), 'dd/MM/yyyy') : '-'}</TableCell><TableCell className="text-right font-bold">{formatCurrency(c.valor)}</TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>
    </div>
  );
}