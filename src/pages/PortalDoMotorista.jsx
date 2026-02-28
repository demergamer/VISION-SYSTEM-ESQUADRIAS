import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MapPin, Package, Loader2, LogOut, AlertCircle } from "lucide-react";
import { format, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import RotasListReadOnly from "@/components/pedidos/RotasListReadOnly";
import RotasChecklistReadOnly from "@/components/pedidos/RotasChecklistReadOnly";
import { useRealtimeSync } from "@/components/hooks/useRealtimeSync";
import { useAuth } from '@/components/providers/AuthContext';

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function gerarMeses() {
  const meses = [];
  const hoje = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }) });
  }
  return meses;
}

export default function PortalDoMotorista() {
  useRealtimeSync();
  const meses = gerarMeses();
  const [mesSelecionado, setMesSelecionado] = useState(meses[0].value);
  const [rotaSelecionada, setRotaSelecionada] = useState(null);
  const { user, loading: authLoading, signOut } = useAuth();

  // 1. Busca todos os motoristas cadastrados
  const { data: todosMotoristas = [], isLoading: motoristasLoading } = useQuery({
    queryKey: ['motoristas'],
    queryFn: () => base44.entities.Motorista.list(),
  });

  // 2. Descobre quem é o motorista logado comparando o e-mail
  const motoristaLogado = useMemo(() => {
    if (!user?.email || !todosMotoristas.length) return null;
    return todosMotoristas.find(m => m.email === user.email && m.ativo !== false);
  }, [user, todosMotoristas]);

  const [anoStr, mesStr] = mesSelecionado.split('-');
  const dataInicio = `${anoStr}-${mesStr}-01`;
  const dataFim = format(endOfMonth(new Date(parseInt(anoStr), parseInt(mesStr) - 1, 1)), 'yyyy-MM-dd');

  // Busca APENAS as rotas e pedidos deste motorista no mês selecionado
  const { data: rotas = [], isLoading: loadingRotas } = useQuery({
    queryKey: ['rotas_motorista_portal', motoristaLogado?.id, mesSelecionado],
    queryFn: () => base44.entities.RotaImportada.list(),
    enabled: !!motoristaLogado,
    select: (all) => all.filter(r => {
      const codigoMatch = r.motorista_codigo === motoristaLogado?.codigo || r.motorista_codigo === motoristaLogado?.id;
      const dataRota = r.data_entrega || r.created_date;
      return codigoMatch && dataRota >= dataInicio && dataRota <= dataFim;
    })
  });

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos_motorista_portal', motoristaLogado?.id, mesSelecionado],
    queryFn: () => base44.entities.Pedido.list(),
    enabled: !!motoristaLogado,
    select: (all) => all.filter(p => {
      const codigoMatch = p.motorista_codigo === motoristaLogado?.codigo || p.motorista_codigo === motoristaLogado?.id;
      const data = p.data_entrega || p.data_pagamento;
      return codigoMatch && data && data >= dataInicio && data <= dataFim;
    })
  });

  const pedidosDaRota = rotaSelecionada
    ? pedidos.filter(p => p.rota_importada_id === rotaSelecionada.id || p.rota_codigo === rotaSelecionada.codigo_rota)
    : [];

  // ── LOADING GLOBAL ────────────────────────────────────────────────────────
  if (authLoading || motoristasLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin w-10 h-10 text-blue-400 mb-4" />
        <p className="text-slate-400">Verificando credenciais...</p>
      </div>
    );
  }

  // ── ERRO DE ACESSO (Usuário logado, mas não é um Motorista) ────────────────
  if (!motoristaLogado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Acesso Restrito</h2>
          <p className="text-slate-500 text-sm">Este e-mail ({user?.email}) não está vinculado a um cadastro ativo de Motorista.</p>
          <Button variant="outline" className="w-full mt-4" onClick={() => signOut()}>Fazer Logout</Button>
        </div>
      </div>
    );
  }

  // ── PORTAL PRINCIPAL ──────────────────────────────────────────────────────
  const totalPedidos = pedidos.length;
  const totalValor = pedidos.reduce((a, p) => a + (p.valor_pedido || 0), 0);
  const pedidosEntregues = pedidos.filter(p => p.confirmado_entrega).length;

  return (
    <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-blue-100">
                <AvatarImage src={motoristaLogado.foto_url || user?.avatar_url} />
                <AvatarFallback className="bg-blue-600 text-white font-bold text-sm">
                  {(motoristaLogado.nome_social || motoristaLogado.nome || user?.preferred_name || 'M').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-tight">{motoristaLogado.nome_social || motoristaLogado.nome}</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-widest">Portal do Motorista</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                <SelectTrigger className="w-40 h-9 text-sm rounded-full bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map(m => <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center bg-blue-50 border-blue-100 shadow-sm">
              <p className="text-2xl font-bold text-blue-700">{totalPedidos}</p>
              <p className="text-xs text-blue-600 font-medium mt-1 uppercase tracking-wide">Pedidos</p>
            </Card>
            <Card className="p-4 text-center bg-emerald-50 border-emerald-100 shadow-sm">
              <p className="text-2xl font-bold text-emerald-700">{pedidosEntregues}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1 uppercase tracking-wide">Entregues</p>
            </Card>
            <Card className="p-4 text-center bg-amber-50 border-amber-100 shadow-sm">
              <p className="text-base font-bold text-amber-700 mt-1">{formatCurrency(totalValor)}</p>
              <p className="text-xs text-amber-600 font-medium mt-1 uppercase tracking-wide">Volume</p>
            </Card>
          </div>

          {/* Tabs: Rotas / Pedidos */}
          <Tabs defaultValue="rotas">
            <TabsList className="w-full bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
              <TabsTrigger value="rotas" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-slate-100">
                <MapPin className="w-4 h-4" /> Rotas ({rotas.length})
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-slate-100">
                <Package className="w-4 h-4" /> Pedidos ({pedidos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rotas" className="mt-4 animate-in fade-in slide-in-from-bottom-2">
              {rotaSelecionada ? (
                <RotasChecklistReadOnly
                  rota={rotaSelecionada}
                  pedidos={pedidosDaRota}
                  onBack={() => setRotaSelecionada(null)}
                />
              ) : (
                <RotasListReadOnly
                  rotas={rotas}
                  isLoading={loadingRotas}
                  onSelectRota={setRotaSelecionada}
                />
              )}
            </TabsContent>

            <TabsContent value="pedidos" className="mt-4 animate-in fade-in slide-in-from-bottom-2">
              {loadingPedidos ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>
              ) : pedidos.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-500">Nenhum pedido encontrado neste mês.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pedidos.map(p => (
                    <Card key={p.id} className="p-4 flex items-center justify-between gap-4 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">#{p.numero_pedido}</span>
                          <span className="font-bold text-slate-800 text-sm truncate">{p.cliente_nome}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {p.data_entrega && <p className="text-[11px] text-slate-400 font-medium">📅 {format(new Date(p.data_entrega), 'dd/MM/yyyy')}</p>}
                          {p.rota_entrega && <p className="text-[11px] text-slate-400 font-medium">📍 {p.rota_entrega}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-sm font-black text-slate-700">{formatCurrency(p.valor_pedido)}</span>
                        <Badge className={p.confirmado_entrega ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                          {p.confirmado_entrega ? '✓ Entregue' : '⏳ Pendente'}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
    </div>
  );
}