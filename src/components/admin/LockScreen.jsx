import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/providers/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Unlock, AlertCircle, Loader2, LogOut } from 'lucide-react';

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + '_jc_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function LockScreen({ onUnlock }) {
  const { user, signOut } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const inputRef = useRef(null);

  const preferred_name = user?.preferred_name || user?.full_name?.split(' ')[0] || 'Admin';
  const avatar_url = user?.avatar_url || '';
  const initials = (user?.preferred_name || user?.full_name || 'A').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Countdown para bloqueio temporário
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (left <= 0) {
        setLockedUntil(null);
        setTimeLeft(0);
        setAttempts(0);
        setError('');
        inputRef.current?.focus();
      } else {
        setTimeLeft(left);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleUnlock = async () => {
    if (lockedUntil) return;
    if (!pin || pin.length < 4) {
      setError('Digite seu PIN.');
      return;
    }
    setIsChecking(true);
    setError('');
    try {
      const pinHash = await hashPin(pin);
      if (pinHash === user?.security_pin_hash) {
        setPin('');
        setAttempts(0);
        onUnlock();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');
        if (newAttempts >= 5) {
          const until = Date.now() + 60 * 1000; // 1 minuto de bloqueio
          setLockedUntil(until);
          setError('Muitas tentativas. Aguarde 60 segundos.');
        } else {
          setError(`PIN incorreto. ${5 - newAttempts} tentativa(s) restante(s).`);
        }
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleUnlock();
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4">
      {/* Background blur pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-500 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm text-center space-y-6">
        {/* Lock Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        {/* Avatar & Name */}
        <div className="space-y-3">
          <Avatar className="w-24 h-24 mx-auto border-4 border-white/20 shadow-2xl">
            {avatar_url && <img src={avatar_url} alt="" className="w-full h-full object-cover rounded-full" />}
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-white">{preferred_name}</h2>
            <p className="text-slate-400 text-sm">{user?.email}</p>
          </div>
          <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-medium px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
            Sessão Bloqueada
          </div>
        </div>

        {/* PIN Input */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
          <p className="text-slate-300 text-sm">Digite seu PIN para desbloquear</p>
          
          <Input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="••••"
            disabled={!!lockedUntil || isChecking}
            className="text-center text-2xl tracking-[0.75em] font-bold bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-blue-500 h-14"
          />

          {error && (
            <div className="flex items-center gap-2 text-red-300 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
              {lockedUntil && timeLeft > 0 && <span className="ml-auto font-bold tabular-nums">{timeLeft}s</span>}
            </div>
          )}

          <Button
            className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11 font-semibold"
            onClick={handleUnlock}
            disabled={!!lockedUntil || isChecking || pin.length < 4}
          >
            {isChecking ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...</>
            ) : (
              <><Unlock className="w-4 h-4 mr-2" /> Desbloquear</>
            )}
          </Button>
        </div>

        {/* Sair */}
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 text-slate-500 hover:text-red-400 text-xs mx-auto transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Não é você? Sair do sistema
        </button>
      </div>
    </div>
  );
}