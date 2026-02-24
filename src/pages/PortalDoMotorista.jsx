import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Truck, Package, MapPin, Calendar, DollarSign, ChevronDown, ChevronRight, LogOut, Loader2, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// Gera lista dos últimos 12 meses
const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }) });
  }
  return options;
};

// ----- LOGIN SCREEN -----
function LoginMotorista({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !pin) { toast.error('Preencha o e-mail e o PIN.'); return; }
    setLoading(true);
    try {
      const motoristas = await base44.entities.Motorista.list();
      const found = motoristas.find(m => 
        m.email?.toLowerCase().trim() === email.toLowerCase().trim() &&
        m.pin === pin &&
        m.ativo !== false
      );
      if (found) {
        onLogin(found);
      } else {
        toast.error('E-mail ou PIN inválidos. Tente novamente.');
      }
    } catch (e) {
      toast.error('Erro ao verificar credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Portal do Motorista</h1>
          <p className="text-slate-500 text-sm mt-1">Entre com seu e-mail e PIN de acesso</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••"
              inputMode="numeric"
              maxLength={6}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest text-center text-xl"
            />
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleLogin} disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Truck className="w-4 h-4 mr-2" />}
            Entrar
          </Button>
        </div>
        <p className="text-center text-xs text-slate-400">Acesso exclusivo para motoristas cadastrados.</p>
      </div>
    </div>
  );
}

// ----- PORTAL MOTORISTA -----
export default function PortalDoMotorista() {
  const [motorista, setMotorista] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [expandedRota, setExpandedRota] = useState(null);

  const monthOptions = useMemo(() => getMonthOptions(), []);

  const { data: rotas = [], isLoading: loadingRotas } = useQuery({
    queryKey: ['rotas_motorista', motorista?.id, selectedMonth],
    queryFn: () => base44.entities.RotaImportada.list(),
    enabled: !!motorista,
    select: (all) => all.filter(r => {
      const mesRota = r.data_rota?.slice(0, 7) || r.created_date?.slice(0, 7);
      const matchMes = mesRota === selectedMonth;
      const matchMotorista = r.motorista_codigo === motorista?.codigo || r.motorista_codigo === motorista?.id || r.motorista_nome === (motorista?.nome_social || motorista?.nome);
      return matchMes && matchMotorista;
    })
  });

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos_motorista', motorista?.id, selectedMonth],
    queryFn: () => base44.entities.Pedido.list(),
    enabled: !!motorista,
    select: (all) => all.filter(p => {
      const mesPedido = p.data_entrega?.slice(0, 7) || p.created_date?.slice(0, 7);
      const matchMes = mesPedido === selectedMonth;
      const matchMotorista = p.motorista_codigo === motorista?.codigo || p.motorista_codigo === motorista?.id;
      return matchMes && matchMotorista;
    })
  });

  const totalValor = useMemo(() => pedidos.reduce((acc, p) => acc + (p.valor_pedido || 0), 0), [pedidos]);
  const totalPago = useMemo(() => pedidos.reduce((acc, p) => acc + (p.total_pago || 0), 0), [pedidos]);
  const isLoading = loadingRotas || loadingPedidos;

  if (!motorista) return <LoginMotorista onLogin={setMotorista} />;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={motorista.foto_url} />
            <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">{(motorista.nome_social || motorista.nome || 'M').slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-slate-800">{motorista.nome_social || motorista.nome}</p>
            <p className="text-xs text-slate-500">Portal do Motorista</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-slate-500" onClick={() => setMotorista(null)}>
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        {/* Filtro de Mês */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-56 bg-white capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Rotas', value: rotas.length, icon: Truck, color: 'blue' },
            { label: 'Entregas', value: pedidos.length, icon: Package, color: 'amber' },
            { label: 'Faturado', value: formatCurrency(totalValor), icon: DollarSign, color: 'green' },
            { label: 'Recebido', value: formatCurrency(totalPago), icon: DollarSign, color: 'emerald' },
          ].map(card => (
            <Card key={card.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", card.color === 'blue' && 'bg-blue-100', card.color === 'amber' && 'bg-amber-100', card.color === 'green' && 'bg-green-100', card.color === 'emerald' && 'bg-emerald-100')}>
                  <card.icon className={cn("w-4 h-4", card.color === 'blue' && 'text-blue-600', card.color === 'amber' && 'text-amber-600', card.color === 'green' && 'text-green-600', card.color === 'emerald' && 'text-emerald-600')} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p className="font-bold text-slate-800 text-sm">{card.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        )}

        {!isLoading && rotas.length === 0 && pedidos.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma entrega neste mês.</p>
            <p className="text-slate-400 text-sm">Selecione outro período.</p>
          </div>
        )}

        {/* Rotas */}
        {rotas.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-bold text-slate-700 text-lg flex items-center gap-2"><Truck className="w-5 h-5 text-blue-600" /> Rotas do Mês</h2>
            {rotas.map(rota => {
              const expanded = expandedRota === rota.id;
              const pedidosRota = pedidos.filter(p => p.rota_importada_id === rota.id || p.rota_entrega === rota.nome_rota);
              return (
                <Card key={rota.id} className="overflow-hidden">
                  <button className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors" onClick={() => setExpandedRota(expanded ? null : rota.id)}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-xl"><Truck className="w-5 h-5 text-blue-600" /></div>
                      <div>
                        <p className="font-bold text-slate-800">{rota.nome_rota || rota.codigo_rota || 'Rota'}</p>
                        <p className="text-xs text-slate-400">{pedidosRota.length} entrega(s) · {rota.data_rota ? format(parseISO(rota.data_rota), 'dd/MM/yyyy') : ''}</p>
                      </div>
                    </div>
                    {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>
                  {expanded && pedidosRota.length > 0 && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      {pedidosRota.map(p => (
                        <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">#{p.numero_pedido} — {p.cliente_nome}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                              {p.confirmado_entrega && <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">Entregue</Badge>}
                            </div>
                          </div>
                          <p className="font-bold text-slate-800 text-sm">{formatCurrency(p.valor_pedido)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Pedidos sem rota específica */}
        {pedidos.filter(p => !rotas.some(r => p.rota_importada_id === r.id || p.rota_entrega === r.nome_rota)).length > 0 && (
          <div className="space-y-3">
            <h2 className="font-bold text-slate-700 text-lg flex items-center gap-2"><Package className="w-5 h-5 text-amber-600" /> Outras Entregas</h2>
            {pedidos.filter(p => !rotas.some(r => p.rota_importada_id === r.id || p.rota_entrega === r.nome_rota)).map(p => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">#{p.numero_pedido}</p>
                    <p className="text-sm text-slate-500">{p.cliente_nome}</p>
                    {p.data_entrega && <p className="text-xs text-slate-400">{format(parseISO(p.data_entrega), 'dd/MM/yyyy')}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{formatCurrency(p.valor_pedido)}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{p.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}