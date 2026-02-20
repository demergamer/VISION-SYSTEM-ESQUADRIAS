import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

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

  // Privacy mode: store on window so ProtectedValue can read it
  window.__privacyMode = p.privacy_mode;
  window.dispatchEvent(new CustomEvent('privacyModeChange', { detail: p.privacy_mode }));
}

export function usePreferences() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(user => {
        const prefs = { ...DEFAULT_PREFS, ...(user?.preferences || {}) };
        setPreferences(prefs);
        applyPreferences(prefs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updatePreferences = useCallback(async (newPrefs) => {
    const merged = { ...preferences, ...newPrefs };
    setPreferences(merged);
    applyPreferences(merged);
    await base44.auth.updateMe({ preferences: merged });
  }, [preferences]);

  return { preferences, updatePreferences, loading };
}