import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Package, MapPin, Calendar, Loader2, LogOut, Search, Shield, Unlock, AlertCircle, ChevronRight, CheckCircle2, Lock } from "lucide-react";
import { format, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + '_jc_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function gerarMeses() {
  const meses = [];
  const hoje = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }) });
  }
  return meses;
}

// STEP 1: Busca e seleciona motorista por código/nome
// STEP 2: Digita PIN para confirmar
// STEP 3: Onboarding para criar PIN (primeiro acesso)
// LOGGED: Portal principal

export default function PortalDoMotorista() {
  const meses = gerarMeses();
  const [mesSelecionado, setMesSelecionado] = useState(meses[0].value);
  const [motorista, setMotorista] = useState(null); // motorista autenticado
  const [step, setStep] = useState('select'); // 'select' | 'pin' | 'onboarding'
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Seleção
  const [busca, setBusca] = useState('');
  const [todosMotoristas, setTodosMotoristas] = useState([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [motoristaSelecionado, setMotoristaSelecionado] = useState(null);

  // PIN
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const pinInputRef = useRef(null);

  // Onboarding PIN
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  // Verifica sessão salva
  useEffect(() => {
    const saved = sessionStorage.getItem('motorista_logado');
    if (saved) { try { setMotorista(JSON.parse(saved)); } catch {} }
    setLoadingAuth(false);
  }, []);

  // Carrega lista de motoristas ativos
  useEffect(() => {
    if (step === 'select' && !motorista) {
      setLoadingLista(true);
      base44.entities.Motorista.list().then(lista => {
        setTodosMotoristas(lista.filter(m => m.ativo !== false));
        setLoadingLista(false);
      }).catch(() => setLoadingLista(false));
    }
  }, [step, motorista]);

  // Countdown bloqueio
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (left <= 0) { setLockedUntil(null); setTimeLeft(0); setPinAttempts(0); setPinError(''); }
      else setTimeLeft(left);
    }, 500);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  useEffect(() => {
    if (step === 'pin') setTimeout(() => pinInputRef.current?.focus(), 100);
  }, [step]);

  const motoristasFiltrados = todosMotoristas.filter(m => {
    const q = busca.toLowerCase();
    return !q || (m.nome || '').toLowerCase().includes(q) || (m.nome_social || '').toLowerCase().includes(q) || (m.codigo || '').toLowerCase().includes(q);
  });

  const handleSelecionarMotorista = (m) => {
    setMotoristaSelecionado(m);
    setPin('');
    setPinError('');
    setStep('pin');
  };

  const handleVerificarPin = async () => {
    if (lockedUntil) return;
    if (!pin || pin.length < 4) { setPinError('Digite seu PIN.'); return; }
    setIsCheckingPin(true);
    setPinError('');
    try {
      // Primeiro acesso: sem PIN cadastrado
      if (!motoristaSelecionado.pin) {
        setNewPin('');
        setNewPinConfirm('');
        setOnboardingError('');
        setStep('onboarding');
        setIsCheckingPin(false);
        return;
      }
      const pinHash = await hashPin(pin);
      if (pinHash === motoristaSelecionado.pin) {
        sessionStorage.setItem('motorista_logado', JSON.stringify(motoristaSelecionado));
        setMotorista(motoristaSelecionado);
      } else {
        const newAttempts = pinAttempts + 1;
        setPinAttempts(newAttempts);
        setPin('');
        if (newAttempts >= 5) {
          setLockedUntil(Date.now() + 60 * 1000);
          setPinError('Muitas tentativas. Aguarde 60 segundos.');
        } else {
          setPinError(`PIN incorreto. ${5 - newAttempts} tentativa(s) restante(s).`);
        }
      }
    } finally {
      setIsCheckingPin(false);
    }
  };

  const handleSalvarPin = async () => {
    if (!newPin || newPin.length < 4) { setOnboardingError('PIN deve ter no mínimo 4 dígitos.'); return; }
    if (newPin !== newPinConfirm) { setOnboardingError('Os PINs não conferem.'); return; }
    setIsSavingPin(true);
    setOnboardingError('');
    try {
      const pinHash = await hashPin(newPin);
      const updated = await base44.entities.Motorista.update(motoristaSelecionado.id, { pin: pinHash });
      const motoristaAtualizado = { ...motoristaSelecionado, pin: pinHash };
      sessionStorage.setItem('motorista_logado', JSON.stringify(motoristaAtualizado));
      setMotorista(motoristaAtualizado);
    } catch { setOnboardingError('Erro ao salvar PIN. Tente novamente.'); }
    setIsSavingPin(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('motorista_logado');
    setMotorista(null);
    setMotoristaSelecionado(null);
    setBusca('');
    setPin('');
    setStep('select');
  };

  // Datas do mês selecionado
  const [anoStr, mesStr] = mesSelecionado.split('-');
  const dataInicio = `${anoStr}-${mesStr}-01`;
  const dataFim = format(endOfMonth(new Date(parseInt(anoStr), parseInt(mesStr) - 1, 1)), 'yyyy-MM-dd');

  // Busca rotas do motorista
  const { data: rotas = [], isLoading: loadingRotas } = useQuery({
    queryKey: ['rotas_motorista', motorista?.id, mesSelecionado],
    queryFn: () => base44.entities.RotaImportada.list(),
    enabled: !!motorista,
    select: (all) => all.filter(r => {
      const codigoMatch = r.motorista_codigo === motorista?.codigo || r.motorista_codigo === motorista?.id;
      const dataRota = r.data_entrega || r.created_date;
      const noMes = dataRota && dataRota >= dataInicio && dataRota <= dataFim;
      return codigoMatch && noMes;
    })
  });

  // Busca pedidos do motorista
  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos_motorista', motorista?.id, mesSelecionado],
    queryFn: () => base44.entities.Pedido.list(),
    enabled: !!motorista,
    select: (all) => all.filter(p => {
      const codigoMatch = p.motorista_codigo === motorista?.codigo || p.motorista_codigo === motorista?.id;
      const data = p.data_entrega || p.data_pagamento;
      const noMes = data && data >= dataInicio && data <= dataFim;
      return codigoMatch && noMes;
    })
  });

  // --- TELA DE LOGIN ---
  if (loadingAuth && !motorista) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>;
  }

  if (!motorista) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-sm shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Portal do Motorista</CardTitle>
            <p className="text-slate-500 text-sm">Digite seu e-mail e PIN para acessar</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {authError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{authError}</div>}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••"
                maxLength={6}
              />
            </div>
            <Button onClick={handleLogin} disabled={loadingAuth} className="w-full bg-blue-600 hover:bg-blue-700">
              {loadingAuth ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPedidos = pedidos.length;
  const totalValor = pedidos.reduce((a, p) => a + (p.valor_pedido || 0), 0);
  const pedidosEntregues = pedidos.filter(p => p.confirmado_entrega).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-blue-100">
              <AvatarImage src={motorista.foto_url} />
              <AvatarFallback className="bg-blue-600 text-white font-bold">{(motorista.nome_social || motorista.nome || 'M').slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-slate-800">{motorista.nome_social || motorista.nome}</p>
              <p className="text-xs text-slate-500">Portal do Motorista</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map(m => (
                  <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center bg-blue-50 border-blue-100">
            <p className="text-2xl font-bold text-blue-700">{totalPedidos}</p>
            <p className="text-xs text-blue-600 font-medium mt-1">Pedidos no Mês</p>
          </Card>
          <Card className="p-4 text-center bg-emerald-50 border-emerald-100">
            <p className="text-2xl font-bold text-emerald-700">{pedidosEntregues}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Entregas Confirmadas</p>
          </Card>
          <Card className="p-4 text-center bg-amber-50 border-amber-100">
            <p className="text-lg font-bold text-amber-700">{formatCurrency(totalValor)}</p>
            <p className="text-xs text-amber-600 font-medium mt-1">Volume Faturado</p>
          </Card>
        </div>

        {/* Rotas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" /> Rotas do Mês ({rotas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRotas ? (
              <div className="flex justify-center py-6"><Loader2 className="animate-spin w-6 h-6 text-slate-400" /></div>
            ) : rotas.length === 0 ? (
              <p className="text-center text-slate-400 py-6">Nenhuma rota neste mês.</p>
            ) : (
              <div className="space-y-2">
                {rotas.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{r.nome_rota || r.codigo_rota || 'Rota sem nome'}</p>
                      {r.data_entrega && <p className="text-xs text-slate-400 mt-0.5"><Calendar className="w-3 h-3 inline mr-1" />{r.data_entrega}</p>}
                    </div>
                    <Badge className={r.status === 'concluida' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>
                      {r.status || 'Em andamento'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pedidos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" /> Pedidos do Mês ({pedidos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPedidos ? (
              <div className="flex justify-center py-6"><Loader2 className="animate-spin w-6 h-6 text-slate-400" /></div>
            ) : pedidos.length === 0 ? (
              <p className="text-center text-slate-400 py-6">Nenhum pedido encontrado neste mês.</p>
            ) : (
              <div className="space-y-2">
                {pedidos.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-500">#{p.numero_pedido}</span>
                        <span className="font-medium text-slate-700 text-sm truncate">{p.cliente_nome}</span>
                      </div>
                      {p.data_entrega && <p className="text-xs text-slate-400 mt-0.5"><Calendar className="w-3 h-3 inline mr-1" />{p.data_entrega}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-slate-700">{formatCurrency(p.valor_pedido)}</span>
                      <Badge className={p.confirmado_entrega ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                        {p.confirmado_entrega ? 'Entregue' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}