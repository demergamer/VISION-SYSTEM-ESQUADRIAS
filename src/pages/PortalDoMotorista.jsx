import React, { useState, useEffect } from 'react';
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
import PinGateway from "@/components/portais/PinGateway";
import RotasListReadOnly from "@/components/pedidos/RotasListReadOnly";
import RotasChecklistReadOnly from "@/components/pedidos/RotasChecklistReadOnly";
import { useRealtimeSync } from "@/components/hooks/useRealtimeSync";



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
  const meses = gerarMeses();
  const [mesSelecionado, setMesSelecionado] = useState(meses[0].value);
  const [motorista, setMotorista] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [erroAcesso, setErroAcesso] = useState('');
  const [registroMotorista, setRegistroMotorista] = useState(null);
  const [rotaSelecionada, setRotaSelecionada] = useState(null);
  useRealtimeSync();

  // Identificação automática pelo e-mail
  useEffect(() => {
    async function identificar() {
      const saved = sessionStorage.getItem('motorista_logado');
      if (saved) {
        try { setMotorista(JSON.parse(saved)); setLoadingSession(false); return; } catch {}
      }
      try {
        const user = await base44.auth.me();
        if (!user?.email) { setErroAcesso('Você precisa estar logado para acessar o portal do motorista.'); setLoadingSession(false); return; }
        const todos = await base44.entities.Motorista.filter({ email: user.email });
        const encontrado = todos.find(m => m.ativo !== false);
        if (!encontrado) { setErroAcesso('Acesso Negado: Este e-mail não está vinculado a nenhum motorista cadastrado.'); setLoadingSession(false); return; }
        setRegistroMotorista(encontrado);
      } catch { setErroAcesso('Erro ao verificar acesso. Tente novamente.'); }
      setLoadingSession(false);
    }
    identificar();
  }, []);

  const handleIdentificado = (registro) => {
    sessionStorage.setItem('motorista_logado', JSON.stringify(registro));
    setMotorista(registro);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('motorista_logado');
    setMotorista(null); setRegistroMotorista(null); setErroAcesso('');
    window.location.reload();
  };

  const [anoStr, mesStr] = mesSelecionado.split('-');
  const dataInicio = `${anoStr}-${mesStr}-01`;
  const dataFim = format(endOfMonth(new Date(parseInt(anoStr), parseInt(mesStr) - 1, 1)), 'yyyy-MM-dd');

  // Apenas rotas DO motorista logado
  const { data: rotas = [], isLoading: loadingRotas } = useQuery({
    queryKey: ['rotas_motorista_portal', motorista?.id, mesSelecionado],
    queryFn: () => base44.entities.RotaImportada.list(),
    enabled: !!motorista,
    select: (all) => all.filter(r => {
      const codigoMatch = r.motorista_codigo === motorista?.codigo || r.motorista_codigo === motorista?.id;
      const dataRota = r.data_entrega || r.created_date;
      return codigoMatch && dataRota >= dataInicio && dataRota <= dataFim;
    })
  });

  // Apenas pedidos DO motorista logado
  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos_motorista_portal', motorista?.id, mesSelecionado],
    queryFn: () => base44.entities.Pedido.list(),
    enabled: !!motorista,
    select: (all) => all.filter(p => {
      const codigoMatch = p.motorista_codigo === motorista?.codigo || p.motorista_codigo === motorista?.id;
      const data = p.data_entrega || p.data_pagamento;
      return codigoMatch && data && data >= dataInicio && data <= dataFim;
    })
  });

  // Pedidos da rota selecionada (somente do motorista logado)
  const pedidosDaRota = rotaSelecionada
    ? pedidos.filter(p => p.rota_importada_id === rotaSelecionada.id || p.rota_codigo === rotaSelecionada.codigo_rota)
    : [];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingSession) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Loader2 className="animate-spin w-8 h-8 text-blue-400" />
    </div>
  );

  // ── Erro de acesso ─────────────────────────────────────────────────────────
  if (erroAcesso) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Acesso Negado</h2>
        <p className="text-slate-500 text-sm">{erroAcesso}</p>
        <Button variant="outline" className="w-full" onClick={() => window.history.back()}>Voltar</Button>
      </div>
    </div>
  );

  // ── PIN Gateway ────────────────────────────────────────────────────────────
  if (!motorista && registroMotorista) return (
    <PinGateway
      perfil="motorista"
      registroPreIdentificado={registroMotorista}
      onIdentificado={handleIdentificado}
      onVoltar={() => window.history.back()}
    />
  );

  if (!motorista) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Loader2 className="animate-spin w-8 h-8 text-blue-400" />
    </div>
  );

  const totalPedidos = pedidos.length;
  const totalValor = pedidos.reduce((a, p) => a + (p.valor_pedido || 0), 0);
  const pedidosEntregues = pedidos.filter(p => p.confirmado_entrega).length;

  return (
    <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border-2 border-blue-100">
                <AvatarImage src={motorista.foto_url} />
                <AvatarFallback className="bg-blue-600 text-white font-bold text-sm">
                  {(motorista.nome_social || motorista.nome || 'M').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-tight">{motorista.nome_social || motorista.nome}</p>
                <p className="text-[11px] text-slate-400">Portal do Motorista</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map(m => <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleLogout} title="Sair">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center bg-blue-50 border-blue-100">
              <p className="text-2xl font-bold text-blue-700">{totalPedidos}</p>
              <p className="text-xs text-blue-600 font-medium mt-1">Pedidos no Mês</p>
            </Card>
            <Card className="p-4 text-center bg-emerald-50 border-emerald-100">
              <p className="text-2xl font-bold text-emerald-700">{pedidosEntregues}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Entregas Confirmadas</p>
            </Card>
            <Card className="p-4 text-center bg-amber-50 border-amber-100">
              <p className="text-base font-bold text-amber-700">{formatCurrency(totalValor)}</p>
              <p className="text-xs text-amber-600 font-medium mt-1">Volume Faturado</p>
            </Card>
          </div>

          {/* Tabs: Rotas / Pedidos */}
          <Tabs defaultValue="rotas">
            <TabsList className="w-full">
              <TabsTrigger value="rotas" className="flex-1 gap-2">
                <MapPin className="w-4 h-4" /> Rotas ({rotas.length})
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="flex-1 gap-2">
                <Package className="w-4 h-4" /> Pedidos ({pedidos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rotas" className="mt-4">
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

            <TabsContent value="pedidos" className="mt-4">
              {loadingPedidos ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-slate-400" /></div>
              ) : pedidos.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Nenhum pedido encontrado neste mês.
                </div>
              ) : (
                <div className="space-y-2">
                  {pedidos.map(p => (
                    <Card key={p.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-500">#{p.numero_pedido}</span>
                          <span className="font-medium text-slate-700 text-sm truncate">{p.cliente_nome}</span>
                        </div>
                        {p.data_entrega && <p className="text-xs text-slate-400 mt-0.5">{p.data_entrega}</p>}
                        {p.rota_entrega && <p className="text-xs text-slate-400">{p.rota_entrega}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-slate-700">{formatCurrency(p.valor_pedido)}</span>
                        <Badge className={p.confirmado_entrega ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                          {p.confirmado_entrega ? 'Entregue' : 'Pendente'}
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