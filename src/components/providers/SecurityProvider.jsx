import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import OnboardingModal from '@/components/admin/OnboardingModal';
import LockScreen from '@/components/admin/LockScreen';
import { Button } from '@/components/ui/button';
import { LogOut, ShieldOff } from 'lucide-react';

const SecurityContext = createContext(null);

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const SESSION_TIMEOUT_MS = 5 * 60 * 60 * 1000;
const SESSION_KEY = 'jc_session_unlocked';

// Modal de bloqueio absoluto para usuários inativos
function InativoBlockScreen({ signOut }) {
  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <ShieldOff className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Acesso Negado</h2>
          <p className="text-slate-500 mt-2">Seu cadastro está bloqueado no sistema. Entre em contato com o administrador.</p>
        </div>
        <Button className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-base font-semibold" onClick={() => signOut()}>
          <LogOut className="w-5 h-5 mr-2" /> Sair do Sistema
        </Button>
      </div>
    </div>
  );
}

export function SecurityProvider({ children }) {
  const { user, loading, signOut } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLocked, setIsLocked] = useState(() => {
    // Se não há flag de sessão → começa bloqueado (exige PIN ao recarregar)
    return !sessionStorage.getItem(SESSION_KEY);
  });
  const idleTimerRef = useRef(null);
  const sessionTimerRef = useRef(null);

  const hasUser = !!user;
  const isInativo = hasUser && user.ativo === false;

  // --- Verificação inicial de onboarding ---
  useEffect(() => {
    if (!loading && hasUser && !isInativo) {
      const hasPinSet = !!user.security_pin_hash;
      if (!hasPinSet) {
        setShowOnboarding(true);
        setIsLocked(false); // Onboarding tem prioridade
      }
    }
  }, [loading, hasUser, user, isInativo]);

  // --- Reinicia timers de inatividade ---
  const resetIdleTimer = useCallback(() => {
    if (!hasUser || showOnboarding) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      sessionStorage.removeItem(SESSION_KEY);
      setIsLocked(true);
    }, IDLE_TIMEOUT_MS);
  }, [hasUser, showOnboarding]);

  // --- Timer de sessão absoluta ---
  useEffect(() => {
    if (!hasUser || !user) return;
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    sessionTimerRef.current = setTimeout(() => {
      sessionStorage.removeItem(SESSION_KEY);
      setIsLocked(true);
    }, SESSION_TIMEOUT_MS);
    return () => { if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current); };
  }, [user]);

  // --- Monitoramento de eventos de inatividade ---
  useEffect(() => {
    if (!hasUser || !user || showOnboarding || isInativo) return;
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    const handleActivity = () => resetIdleTimer();
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    if (!isLocked) resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [hasUser, user, showOnboarding, isLocked, isInativo, resetIdleTimer]);

  const unlock = useCallback(async () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setIsLocked(false);
    resetIdleTimer();
    // Re-fetch user para detectar se PIN foi zerado (fluxo de recuperação)
    try {
      const freshUser = await base44.auth.me();
      if (freshUser && !freshUser.security_pin_hash) {
        setShowOnboarding(true);
        setIsLocked(false);
      }
    } catch { /* silencioso */ }
  }, [resetIdleTimer]);

  const lockScreen = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsLocked(true);
  }, []);

  const completeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    unlock();
  }, [unlock]);

  // --- Renderização Condicional Estrita (children NUNCA vazam para o DOM bloqueado) ---

  // 1. Carregando autenticação → nada no DOM
  if (loading || !hasUser) {
    return <SecurityContext.Provider value={{ isLocked, showOnboarding, unlock, lockScreen, completeOnboarding }}></SecurityContext.Provider>;
  }

  // 2. Usuário inativo/bloqueado → apenas a tela de bloqueio absoluto, sem children
  if (isInativo) {
    return <InativoBlockScreen signOut={signOut} />;
  }

  // 3. Precisa de onboarding (sem PIN) → apenas o modal de onboarding, sem children
  if (showOnboarding) {
    return (
      <SecurityContext.Provider value={{ isLocked, showOnboarding, unlock, lockScreen, completeOnboarding }}>
        <OnboardingModal onComplete={completeOnboarding} />
      </SecurityContext.Provider>
    );
  }

  // 4. Tela bloqueada (PIN) → apenas o LockScreen, sem children
  if (isLocked) {
    return (
      <SecurityContext.Provider value={{ isLocked, showOnboarding, unlock, lockScreen, completeOnboarding }}>
        <LockScreen onUnlock={unlock} />
      </SecurityContext.Provider>
    );
  }

  // 5. Sessão válida → renderiza a aplicação normalmente
  return (
    <SecurityContext.Provider value={{ isLocked, showOnboarding, unlock, lockScreen, completeOnboarding }}>
      {children}
    </SecurityContext.Provider>
  );
}

export const useSecurity = () => {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error('useSecurity must be used within SecurityProvider');
  return ctx;
};