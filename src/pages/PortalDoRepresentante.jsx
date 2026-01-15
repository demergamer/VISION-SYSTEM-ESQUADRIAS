import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, ShoppingCart, CreditCard, DollarSign, TrendingUp, AlertCircle, 
  Search, Briefcase, Calendar, CheckCircle, ArrowRight, Wallet
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";

// --- Componente Widget de Estatística ---
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
  const [user, setUser] = useState(null);
  const [representante, setRepresentante] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('clientes');

  // --- Buscas de Dados (Lógica Original Mantida) ---
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: todosRepresentantes = [] } = useQuery({
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

  // --- Filtros e Cálculos ---
  const meusClientes = useMemo(() => {
    if (!representante) return [];
    return todosClientes.filter(c => c.representante_codigo === representante.codigo);
  }, [todosClientes, representante]);

  const meusPedidosAbertos = useMemo(() => {
    if (!representante) return [];
    return todosPedidos.filter(p => p.representante_codigo === representante.codigo && p.status !== 'pago' && p.status !== 'cancelado');
  }, [todosPedidos, representante]);

  const meusCheques = useMemo(() => {
    if (!representante) return [];
    const codigosClientes = meusClientes.map(c => c.codigo);
    return todosCheques.filter(ch => codigosClientes.includes(ch.cliente_codigo));
  }, [todosCheques, meusClientes]);

  const stats = useMemo(() => {
    const totalClientes = meusClientes.length;
    const totalPedidosAbertos = meusPedidosAbertos.length;
    const valorPedidosAbertos = meusPedidosAbertos.reduce((sum, p) => sum + (p.saldo_restante || 0), 0);
    
    const chequesAVencer = meusCheques.filter(ch => ch.status === 'normal').length;
    const valorChequesAVencer = meusCheques.filter(ch => ch.status === 'normal').reduce((sum, ch) => sum + (ch.valor || 0), 0);

    const now = new Date();
    const pedidosAtrasados = meusPedidosAbertos.filter(p => {
      const dataEntrega = new Date(p.data_entrega);
      return differenceInDays(now, dataEntrega) > 20;
    }).length;

    const valorAtrasado = meusPedidosAbertos
      .filter(p => differenceInDays(now, new Date(p.data_entrega)) > 20)
      .reduce((sum, p) => sum + (p.saldo_restante || 0), 0);

    return {
      totalClientes,
      totalPedidosAbertos,
      valorPedidosAbertos,
      chequesAVencer,
      valorChequesAVencer,
      pedidosAtrasados,
      valorAtrasado
    };
  }, [meusClientes, meusPedidosAbertos, meusCheques]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const filteredClientes = meusClientes.filter(c => c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.codigo?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredPedidos = meusPedidosAbertos.filter(p => p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) || p.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredCheques = meusCheques.filter(ch => ch.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) || ch.numero_cheque?.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- Renderização ---

  if (!user || !representante) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center border-amber-200 bg-amber-50">
          <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
             <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
          <p className="text-slate-600">Este portal é exclusivo para representantes cadastrados. Se você é um representante, verifique seu login.</p>
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
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Olá, <span className="text-blue-600">{representante.nome}</span>
            </h1>
            <p className="text-slate-500 text-lg">Aqui está o resumo da sua carteira de clientes</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Representante Oficial</span>
          </div>
        </div>

        {/* Stats Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatWidget 
            title="Carteira de Clientes" 
            value={stats.totalClientes} 
            subtitle="Clientes cadastrados"
            icon={Users} 
            color="blue" 
          />
          <StatWidget 
            title="Vendas em Aberto" 
            value={formatCurrency(stats.valorPedidosAbertos)} 
            subtitle={`${stats.totalPedidosAbertos} pedidos ativos`}
            icon={ShoppingCart} 
            color="amber" 
          />
          <StatWidget 
            title="Cheques a Vencer" 
            value={formatCurrency(stats.valorChequesAVencer)} 
            subtitle={`${stats.chequesAVencer} folhas em custódia`}
            icon={CreditCard} 
            color="purple" 
          />
          <StatWidget 
            title="Em Atraso (+20 dias)" 
            value={formatCurrency(stats.valorAtrasado)} 
            subtitle={`${stats.pedidosAtrasados} pedidos críticos`}
            icon={AlertCircle} 
            color="red" 
          />
        </div>

        {/* Main Content Area */}
        <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              
              {/* Toolbar: Tabs + Search */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                <TabsList className="bg-slate-100 p-1 rounded-xl h-auto w-full md:w-auto grid grid-cols-3 md:flex">
                  <TabsTrigger value="clientes" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all gap-2">
                    <Users className="w-4 h-4" /> 
                    <span className="hidden sm:inline">Clientes</span>
                  </TabsTrigger>
                  <TabsTrigger value="pedidos" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all gap-2">
                    <ShoppingCart className="w-4 h-4" /> 
                    <span className="hidden sm:inline">Pedidos</span>
                  </TabsTrigger>
                  <TabsTrigger value="cheques" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all gap-2">
                    <Wallet className="w-4 h-4" /> 
                    <span className="hidden sm:inline">Cheques</span>
                  </TabsTrigger>
                </TabsList>

                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Filtrar resultados..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                  />
                </div>
              </div>

              {/* Tabela de Clientes */}
              <TabsContent value="clientes" className="mt-0">
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="w-[100px]">Código</TableHead>
                        <TableHead>Nome do Cliente</TableHead>
                        <TableHead>Região</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-right">Limite de Crédito</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientes.map((cliente) => (
                        <TableRow key={cliente.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-mono text-slate-500">{cliente.codigo}</TableCell>
                          <TableCell className="font-bold text-slate-700">{cliente.nome}</TableCell>
                          <TableCell>{cliente.regiao || <span className="text-slate-300">-</span>}</TableCell>
                          <TableCell>{cliente.telefone || <span className="text-slate-300">-</span>}</TableCell>
                          <TableCell className="text-center">
                            {cliente.score ? (
                              <Badge variant="outline" className="bg-slate-50">{cliente.score}</Badge>
                            ) : <span className="text-slate-300">-</span>}
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">
                            {formatCurrency(cliente.limite_credito)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredClientes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                            Nenhum cliente encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Tabela de Pedidos */}
              <TabsContent value="pedidos" className="mt-0">
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Entrega</TableHead>
                        <TableHead className="text-right">Valor Original</TableHead>
                        <TableHead className="text-right">Já Pago</TableHead>
                        <TableHead className="text-right">Saldo Devedor</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPedidos.map((pedido) => {
                        const now = new Date();
                        const dataEntrega = pedido.data_entrega ? new Date(pedido.data_entrega) : null;
                        const diasAtraso = dataEntrega ? differenceInDays(now, dataEntrega) : 0;
                        const isAtrasado = diasAtraso > 20;

                        return (
                          <TableRow key={pedido.id} className={`hover:bg-slate-50/50 transition-colors ${isAtrasado ? 'bg-red-50/30' : ''}`}>
                            <TableCell className="font-mono font-medium text-slate-700">#{pedido.numero_pedido}</TableCell>
                            <TableCell className="font-medium">{pedido.cliente_nome}</TableCell>
                            <TableCell>
                              {dataEntrega ? format(dataEntrega, 'dd/MM/yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-right text-slate-500">{formatCurrency(pedido.valor_pedido)}</TableCell>
                            <TableCell className="text-right text-emerald-600">{formatCurrency(pedido.total_pago)}</TableCell>
                            <TableCell className="text-right font-bold text-slate-800">{formatCurrency(pedido.saldo_restante)}</TableCell>
                            <TableCell className="text-center">
                              {isAtrasado ? (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                                  Atrasado ({diasAtraso}d)
                                </Badge>
                              ) : pedido.status === 'parcial' ? (
                                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">
                                  Parcial
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">
                                  Aberto
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredPedidos.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                            Nenhum pedido em aberto encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Tabela de Cheques */}
              <TabsContent value="cheques" className="mt-0">
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead>Nº Cheque</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead>Emitente</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-center">Situação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCheques.map((cheque) => (
                        <TableRow key={cheque.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-mono text-slate-600">{cheque.numero_cheque}</TableCell>
                          <TableCell className="font-medium">{cheque.cliente_nome}</TableCell>
                          <TableCell><Badge variant="outline" className="font-normal bg-white">{cheque.banco || '-'}</Badge></TableCell>
                          <TableCell className="text-sm text-slate-500 max-w-[150px] truncate" title={cheque.emitente}>{cheque.emitente || '-'}</TableCell>
                          <TableCell className="text-right font-bold text-slate-700">{formatCurrency(cheque.valor)}</TableCell>
                          <TableCell className="text-sm">
                            {cheque.data_vencimento ? format(new Date(cheque.data_vencimento), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {cheque.status === 'normal' && <Badge className="bg-blue-100 text-blue-700 border-blue-200">Em Carteira</Badge>}
                            {cheque.status === 'devolvido' && <Badge className="bg-red-100 text-red-700 border-red-200">Devolvido</Badge>}
                            {cheque.status === 'pago' && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Compensado</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredCheques.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                            Nenhum cheque encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
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