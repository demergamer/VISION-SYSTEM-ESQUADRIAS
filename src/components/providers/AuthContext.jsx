import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext(null);

export const DEFAULT_PREFS = {
  theme: 'light',
  density: 'default',
  language: 'pt-BR',
  privacy_mode: false,
};

export function applyPreferences(prefs) {
  const p = { ...DEFAULT_PREFS, ...prefs };
  const root = document.documentElement;

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = p.theme === 'dark' || (p.theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
  root.classList.toggle('density-compact', p.density === 'compact');
  document.documentElement.lang = p.language === 'en-US' ? 'en' : 'pt-BR';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser?.preferences) applyPreferences(currentUser.preferences);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const updatePreferences = useCallback(async (newPrefs) => {
    const merged = { ...DEFAULT_PREFS, ...(user?.preferences || {}), ...newPrefs };
    const updated = await base44.auth.updateMe({ preferences: merged });
    setUser(updated);
    applyPreferences(merged);
    return updated;
  }, [user]);

  const signOut = useCallback(() => base44.auth.logout('/'), []);

  const preferences = { ...DEFAULT_PREFS, ...(user?.preferences || {}) };

  return (
    <AuthContext.Provider value={{ user, loading, loadUser, updatePreferences, signOut, preferences }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};