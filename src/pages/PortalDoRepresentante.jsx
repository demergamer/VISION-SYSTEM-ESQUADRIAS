import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  ShoppingCart, 
  CreditCard, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  Search
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";

export default function PortalDoRepresentante() {
  const [user, setUser] = useState(null);
  const [representante, setRepresentante] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const { data: todosClientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
    enabled: !!representante
  });

  const { data: todosPedidos = [] } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list(),
    enabled: !!representante
  });

  const { data: todosCheques = [] } = useQuery({
    queryKey: ['cheques'],
    queryFn: () => base44.entities.Cheque.list(),
    enabled: !!representante
  });

  const meusClientes = useMemo(() => {
    if (!representante) return [];
    return todosClientes.filter(c => c.representante_codigo === representante.codigo);
  }, [todosClientes, representante]);

  const meusPedidosAbertos = useMemo(() => {
    if (!representante) return [];
    return todosPedidos.filter(p => 
      p.representante_codigo === representante.codigo && 
      p.status !== 'pago' && 
      p.status !== 'cancelado'
    );
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
    const valorChequesAVencer = meusCheques
      .filter(ch => ch.status === 'normal')
      .reduce((sum, ch) => sum + (ch.valor || 0), 0);

    const now = new Date();
    const pedidosAtrasados = meusPedidosAbertos.filter(p => {
      const dataEntrega = new Date(p.data_entrega);
      const diasAtraso = differenceInDays(now, dataEntrega);
      return diasAtraso > 20;
    }).length;

    const valorAtrasado = meusPedidosAbertos
      .filter(p => {
        const dataEntrega = new Date(p.data_entrega);
        const diasAtraso = differenceInDays(now, dataEntrega);
        return diasAtraso > 20;
      })
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const filteredClientes = meusClientes.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPedidos = meusPedidosAbertos.filter(p =>
    p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCheques = meusCheques.filter(ch =>
    ch.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ch.numero_cheque?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user || !representante) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
          <p className="text-slate-600">
            Este portal é exclusivo para representantes cadastrados.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Portal do Representante</h1>
          <p className="text-slate-600 mt-1">Bem-vindo, {representante.nome}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Clientes
              </CardTitle>
              <Users className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.totalClientes}</div>
              <p className="text-xs text-slate-500 mt-1">Clientes ativos</p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Pedidos Abertos
              </CardTitle>
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.totalPedidosAbertos}</div>
              <p className="text-xs text-amber-600 font-medium mt-1">
                {formatCurrency(stats.valorPedidosAbertos)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Cheques a Vencer
              </CardTitle>
              <CreditCard className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.chequesAVencer}</div>
              <p className="text-xs text-purple-600 font-medium mt-1">
                {formatCurrency(stats.valorChequesAVencer)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow border-red-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Pedidos Atrasados
              </CardTitle>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.pedidosAtrasados}</div>
              <p className="text-xs text-red-600 font-medium mt-1">
                {formatCurrency(stats.valorAtrasado)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="clientes" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="clientes">Clientes ({meusClientes.length})</TabsTrigger>
                <TabsTrigger value="pedidos">Pedidos Abertos ({meusPedidosAbertos.length})</TabsTrigger>
                <TabsTrigger value="cheques">Cheques ({meusCheques.length})</TabsTrigger>
              </TabsList>

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <TabsContent value="clientes">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Código</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Região</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-right">Limite Crédito</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientes.map((cliente) => (
                        <TableRow key={cliente.id}>
                          <TableCell className="font-mono">{cliente.codigo}</TableCell>
                          <TableCell className="font-medium">{cliente.nome}</TableCell>
                          <TableCell>{cliente.regiao || '-'}</TableCell>
                          <TableCell>{cliente.telefone || '-'}</TableCell>
                          <TableCell className="text-center">{cliente.score || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(cliente.limite_credito)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="pedidos">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Nº Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data Entrega</TableHead>
                        <TableHead className="text-right">Valor Pedido</TableHead>
                        <TableHead className="text-right">Pago</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPedidos.map((pedido) => {
                        const now = new Date();
                        const dataEntrega = new Date(pedido.data_entrega);
                        const diasAtraso = differenceInDays(now, dataEntrega);
                        const isAtrasado = diasAtraso > 20;

                        return (
                          <TableRow key={pedido.id} className={isAtrasado ? 'bg-red-50' : ''}>
                            <TableCell className="font-mono">{pedido.numero_pedido}</TableCell>
                            <TableCell className="font-medium">{pedido.cliente_nome}</TableCell>
                            <TableCell>
                              {pedido.data_entrega ? format(new Date(pedido.data_entrega), 'dd/MM/yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(pedido.valor_pedido)}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-medium">
                              {formatCurrency(pedido.total_pago)}
                            </TableCell>
                            <TableCell className="text-right text-amber-600 font-medium">
                              {formatCurrency(pedido.saldo_restante)}
                            </TableCell>
                            <TableCell className="text-center">
                              {isAtrasado ? (
                                <Badge className="bg-red-100 text-red-700 border-red-200">
                                  Atrasado ({diasAtraso}d)
                                </Badge>
                              ) : pedido.status === 'parcial' ? (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                  Parcial
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                  Aberto
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="cheques">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Nº Cheque</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead>Emitente</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCheques.map((cheque) => (
                        <TableRow key={cheque.id}>
                          <TableCell className="font-mono">{cheque.numero_cheque}</TableCell>
                          <TableCell className="font-medium">{cheque.cliente_nome}</TableCell>
                          <TableCell>{cheque.banco || '-'}</TableCell>
                          <TableCell>{cheque.emitente || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(cheque.valor)}
                          </TableCell>
                          <TableCell>
                            {cheque.data_vencimento ? format(new Date(cheque.data_vencimento), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {cheque.status === 'normal' && (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200">Normal</Badge>
                            )}
                            {cheque.status === 'devolvido' && (
                              <Badge className="bg-red-100 text-red-700 border-red-200">Devolvido</Badge>
                            )}
                            {cheque.status === 'pago' && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Pago</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}