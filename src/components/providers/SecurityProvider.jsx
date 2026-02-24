import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import OnboardingModal from '@/components/admin/OnboardingModal';
import LockScreen from '@/components/admin/LockScreen';

const SecurityContext = createContext(null);

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;       // 10 minutos
const SESSION_TIMEOUT_MS = 5 * 60 * 60 * 1000; // 5 horas

export function SecurityProvider({ children }) {
  const { user, loading } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const idleTimerRef = useRef(null);
  const sessionTimerRef = useRef(null);

  // Todos os usuários autenticados usam o sistema de segurança
  const isAdmin = user?.role === 'admin';
  const hasUser = !!user;

  // --- Verificação inicial de onboarding ---
  useEffect(() => {
    if (!loading && hasUser) {
      const hasPinSet = !!user.security_pin_hash;
      if (!hasPinSet) {
        setShowOnboarding(true);
      }
    }
  }, [loading, hasUser, user]);

  // --- Reinicia timers de inatividade ---
  const resetIdleTimer = useCallback(() => {
    if (!hasUser || showOnboarding) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, IDLE_TIMEOUT_MS);
  }, [isAdmin, showOnboarding]);

  // --- Timer de sessão absoluta ---
  useEffect(() => {
    if (!hasUser || !user) return;
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    sessionTimerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, SESSION_TIMEOUT_MS);
    return () => {
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    };
  }, [isAdmin, user]);

  // --- Monitoramento de eventos de inatividade ---
  useEffect(() => {
    if (!isAdmin || !user || showOnboarding) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleActivity = () => resetIdleTimer();

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    resetIdleTimer(); // inicia o timer pela primeira vez

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isAdmin, user, showOnboarding, resetIdleTimer]);

  const unlock = useCallback(() => {
    setIsLocked(false);
    resetIdleTimer();
  }, [resetIdleTimer]);

  const completeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    resetIdleTimer();
  }, [resetIdleTimer]);

  return (
    <SecurityContext.Provider value={{ isLocked, showOnboarding, unlock, completeOnboarding }}>
      {children}
      {isAdmin && showOnboarding && !loading && (
        <OnboardingModal onComplete={completeOnboarding} />
      )}
      {isAdmin && isLocked && !showOnboarding && !loading && (
        <LockScreen onUnlock={unlock} />
      )}
    </SecurityContext.Provider>
  );
}

export const useSecurity = () => {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error('useSecurity must be used within SecurityProvider');
  return ctx;
};