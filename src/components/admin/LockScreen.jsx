import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/providers/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Unlock, AlertCircle, Loader2, LogOut, Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

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

  // --- Recuperação de PIN ---
  const [mode, setMode] = useState('pin'); // 'pin' | 'send_code' | 'verify_code'
  const [otp, setOtp] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

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

  const handleSendCode = async () => {
    setIsSendingCode(true);
    try {
      // Gerar código OTP de 6 dígitos
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // Salvar no user metadata
      await base44.auth.updateMe({ pin_recovery_code: code, pin_recovery_expires: expiresAt });

      // Enviar e-mail
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: '🔐 Código de Recuperação de PIN — J&C Gestão',
        body: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
            <h2 style="color:#1e3a5f;margin-bottom:8px">Recuperação de PIN</h2>
            <p style="color:#64748b;margin-bottom:24px">Você solicitou a recuperação do seu PIN de acesso ao J&C Gestão.</p>
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
              <p style="color:#0369a1;font-size:14px;margin:0 0 8px">Seu código de verificação:</p>
              <p style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#0c4a6e;margin:0">${code}</p>
            </div>
            <p style="color:#94a3b8;font-size:12px">Este código expira em <strong>15 minutos</strong>. Se você não solicitou esta recuperação, ignore este e-mail.</p>
          </div>
        `
      });

      toast.success('Código enviado para ' + user.email);
      setMode('verify_code');
    } catch (err) {
      toast.error('Erro ao enviar código. Tente novamente.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (otp.length !== 6) return;
    setIsVerifyingCode(true);
    try {
      const freshUser = await base44.auth.me();
      const savedCode = freshUser?.pin_recovery_code;
      const expiresAt = freshUser?.pin_recovery_expires;

      if (!savedCode || !expiresAt) {
        toast.error('Código inválido ou expirado.');
        return;
      }
      if (new Date() > new Date(expiresAt)) {
        toast.error('Código expirado. Solicite um novo.');
        setMode('send_code');
        return;
      }
      if (otp !== savedCode) {
        toast.error('Código incorreto. Verifique o e-mail e tente novamente.');
        return;
      }

      // Limpar PIN e código de recuperação
      await base44.auth.updateMe({ security_pin_hash: null, pin_recovery_code: null, pin_recovery_expires: null });
      toast.success('Código verificado! Defina um novo PIN.');
      // onUnlock aciona o SecurityProvider que detectará ausência de PIN e abrirá o Onboarding
      onUnlock();
    } catch (err) {
      toast.error('Erro ao verificar código. Tente novamente.');
    } finally {
      setIsVerifyingCode(false);
    }
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