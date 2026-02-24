/**
 * PinGateway - Componente universal de identificação + PIN para portais externos
 * Usado por: Motorista, Cliente, Representante
 *
 * Props:
 *  - perfil: 'motorista' | 'cliente' | 'representante'
 *  - onIdentificado(registro): chamado após PIN correto
 *  - onVoltar(): botão voltar
 */
import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Shield, Unlock, AlertCircle, Loader2, ChevronLeft, Lock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OnboardingModalStandalone from '@/components/admin/OnboardingModalStandalone';

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + '_jc_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const ENTIDADE_MAP = {
  motorista: { entidade: 'Motorista', campo_busca: 'nome', campo_codigo: 'codigo', campo_email: 'email', label: 'Motorista', foto: 'foto_url', nome_display: (r) => r.nome_social || r.nome },
  cliente: { entidade: 'Cliente', campo_busca: 'nome', campo_codigo: 'codigo', campo_email: 'email', label: 'Cliente', foto: 'logo_url', nome_display: (r) => r.nome },
  representante: { entidade: 'Representante', campo_busca: 'nome', campo_codigo: 'codigo', campo_email: 'email', label: 'Representante', foto: 'foto_url', nome_display: (r) => r.nome_social || r.nome },
};

// Etapa 1: Busca e seleção do registro
function EtapaIdentificacao({ config, onSelecionado, onVoltar }) {
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const todos = await base44.entities[config.entidade].list();
        setLista(todos.filter(r => r.ativo !== false));
      } catch {}
      setCarregando(false);
    }
    carregar();
  }, [config.entidade]);

  const filtrados = lista.filter(r => {
    const nome = config.nome_display(r)?.toLowerCase() || '';
    const codigo = (r[config.campo_codigo] || '').toLowerCase();
    const q = busca.toLowerCase();
    return nome.includes(q) || codigo.includes(q);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-200">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Identificação</h2>
        <p className="text-slate-500 text-sm mt-1">Busque seu nome ou código para continuar</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={`Buscar ${config.label}...`}
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-10"
          autoFocus
        />
      </div>

      {carregando ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin w-6 h-6 text-blue-500" /></div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filtrados.slice(0, 10).map(r => (
            <button
              key={r.id}
              onClick={() => setSelecionado(r)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selecionado?.id === r.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <Avatar className="w-10 h-10 shrink-0">
                {r[config.foto] && <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-sm">{config.nome_display(r)?.slice(0,2).toUpperCase()}</AvatarFallback>}
                <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-sm">{config.nome_display(r)?.slice(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{config.nome_display(r)}</p>
                {r[config.campo_codigo] && <p className="text-xs text-slate-400 font-mono">Cód: {r[config.campo_codigo]}</p>}
              </div>
              {selecionado?.id === r.id && <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />}
            </button>
          ))}
          {!carregando && busca && filtrados.length === 0 && (
            <p className="text-center text-slate-400 py-4 text-sm">Nenhum resultado encontrado.</p>
          )}
        </div>
      )}

      <Button
        className="w-full bg-blue-600 hover:bg-blue-700 h-11"
        disabled={!selecionado}
        onClick={() => onSelecionado(selecionado)}
      >
        Continuar <ChevronLeft className="w-4 h-4 ml-2 rotate-180" />
      </Button>
    </motion.div>
  );
}

// Etapa 2: Criar PIN (primeiro acesso)
function EtapaCriarPin({ registro, config, onCriado }) {
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSalvar = async () => {
    if (pin.length < 4) { setErro('PIN deve ter mínimo 4 dígitos.'); return; }
    if (pin !== pinConfirm) { setErro('PINs não conferem.'); return; }
    setSalvando(true);
    setErro('');
    try {
      const pinHash = await hashPin(pin);
      await base44.entities[config.entidade].update(registro.id, { pin_hash: pinHash });
      onCriado({ ...registro, pin_hash: pinHash });
    } catch { setErro('Erro ao salvar PIN. Tente novamente.'); }
    setSalvando(false);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-200">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Criar PIN de Acesso</h2>
        <p className="text-slate-500 text-sm mt-1">
          Olá, <strong>{config.nome_display(registro)}</strong>! Defina seu PIN de segurança para continuar.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg">
        Primeiro acesso detectado. Crie um PIN de 4 a 6 dígitos para proteger sua conta.
      </div>

      <div className="space-y-3">
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setErro(''); }}
          placeholder="Digite seu PIN (4-6 dígitos)"
          className="text-center text-xl tracking-[0.5em] font-bold h-12"
          autoFocus
        />
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pinConfirm}
          onChange={e => { setPinConfirm(e.target.value.replace(/\D/g, '')); setErro(''); }}
          placeholder="Confirme o PIN"
          className="text-center text-xl tracking-[0.5em] font-bold h-12"
          onKeyDown={e => e.key === 'Enter' && handleSalvar()}
        />
        {pinConfirm && pin === pinConfirm && pin.length >= 4 && (
          <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> PINs conferem</p>
        )}
        {erro && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {erro}</p>}
      </div>

      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-11" onClick={handleSalvar} disabled={salvando || pin.length < 4}>
        {salvando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Lock className="w-4 h-4 mr-2" /> Definir PIN e Entrar</>}
      </Button>
    </motion.div>
  );
}

// Etapa 3: Verificar PIN existente
function EtapaVerificarPin({ registro, config, onDesbloqueado }) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const [bloqueadoAte, setBloqueadoAte] = useState(null);
  const [tempoRestante, setTempoRestante] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  useEffect(() => {
    if (!bloqueadoAte) return;
    const iv = setInterval(() => {
      const left = Math.ceil((bloqueadoAte - Date.now()) / 1000);
      if (left <= 0) { setBloqueadoAte(null); setTempoRestante(0); setTentativas(0); setErro(''); inputRef.current?.focus(); }
      else setTempoRestante(left);
    }, 500);
    return () => clearInterval(iv);
  }, [bloqueadoAte]);

  const handleVerificar = async () => {
    if (bloqueadoAte) return;
    if (pin.length < 4) { setErro('Digite seu PIN.'); return; }
    setVerificando(true);
    setErro('');
    try {
      const pinHash = await hashPin(pin);
      if (pinHash === registro.pin_hash) {
        setPin('');
        onDesbloqueado(registro);
      } else {
        const novasTentativas = tentativas + 1;
        setTentativas(novasTentativas);
        setPin('');
        if (novasTentativas >= 5) {
          setBloqueadoAte(Date.now() + 60000);
          setErro('Muitas tentativas. Aguarde 60 segundos.');
        } else {
          setErro(`PIN incorreto. ${5 - novasTentativas} tentativa(s) restante(s).`);
        }
      }
    } finally { setVerificando(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <div className="text-center">
        <Avatar className="w-20 h-20 mx-auto mb-3 border-4 border-white shadow-lg">
          {registro[config.foto] && <img src={registro[config.foto]} className="w-full h-full object-cover rounded-full" alt="" />}
          <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
            {config.nome_display(registro)?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold text-slate-800">{config.nome_display(registro)}</h2>
        <p className="text-slate-500 text-sm mt-1">Digite seu PIN para acessar o portal</p>
      </div>

      <div className="space-y-3">
        <Input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setErro(''); }}
          onKeyDown={e => e.key === 'Enter' && handleVerificar()}
          placeholder="••••"
          disabled={!!bloqueadoAte || verificando}
          className="text-center text-2xl tracking-[0.75em] font-bold h-14"
          autoFocus
        />
        {erro && (
          <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {erro}
            {bloqueadoAte && tempoRestante > 0 && <span className="ml-auto font-bold tabular-nums">{tempoRestante}s</span>}
          </div>
        )}
      </div>

      <Button
        className="w-full bg-blue-600 hover:bg-blue-700 h-11"
        onClick={handleVerificar}
        disabled={!!bloqueadoAte || verificando || pin.length < 4}
      >
        {verificando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...</> : <><Unlock className="w-4 h-4 mr-2" /> Entrar</>}
      </Button>
    </motion.div>
  );
}

// Componente principal
// registroPreIdentificado: se passado, pula a etapa de seleção e vai direto para PIN
export default function PinGateway({ perfil, onIdentificado, onVoltar, registroPreIdentificado }) {
  const config = ENTIDADE_MAP[perfil];

  // Sem PIN = onboarding completo (Perfil + PIN). Com PIN = só verificar PIN.
  const etapaInicial = registroPreIdentificado
    ? (registroPreIdentificado.pin_hash ? 'verificar_pin' : 'onboarding')
    : 'identificacao';

  const [etapa, setEtapa] = useState(etapaInicial);
  const [registroSelecionado, setRegistroSelecionado] = useState(registroPreIdentificado || null);

  const handleSelecionado = (registro) => {
    setRegistroSelecionado(registro);
    if (registro.pin_hash) {
      setEtapa('verificar_pin');
    } else {
      setEtapa('onboarding'); // Primeiro acesso → modal rico (Perfil + PIN)
    }
  };

  const handleVoltar = () => {
    if (registroPreIdentificado) {
      onVoltar?.();
    } else {
      setEtapa('identificacao');
    }
  };

  // Primeiro acesso: renderiza o OnboardingModal completo (fora do card pequeno)
  if (etapa === 'onboarding' && registroSelecionado) {
    return (
      <OnboardingModalStandalone
        registro={registroSelecionado}
        perfil={perfil}
        onComplete={(registroAtualizado) => onIdentificado(registroAtualizado)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 relative">
        {/* Botão Voltar */}
        {onVoltar && (
          <button
            onClick={etapa === 'identificacao' ? onVoltar : handleVoltar}
            className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {etapa === 'identificacao' && (
            <EtapaIdentificacao key="id" config={config} onSelecionado={handleSelecionado} onVoltar={onVoltar} />
          )}
          {etapa === 'verificar_pin' && registroSelecionado && (
            <EtapaVerificarPin key="verificar" registro={registroSelecionado} config={config} onDesbloqueado={onIdentificado} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}