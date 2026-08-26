'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { memberSession } from '@/lib/auth';
import type { AuthResponse, SessionUser } from '@/lib/types';

type AuthContextValue = {
  user: SessionUser | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  register: (name: string, email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = memberSession.get();
    if (!stored) {
      setReady(true);
      return;
    }
    api<SessionUser>('/auth/me', {}, stored)
      .then((profile) => {
        setUser(profile);
        setToken(stored);
      })
      .catch(() => memberSession.clear())
      .finally(() => setReady(true));
  }, []);

  const adopt = useCallback((session: AuthResponse) => {
    memberSession.set(session.accessToken);
    setToken(session.accessToken);
    setUser(session.user);
    return session.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      ready,
      login: async (email, password) =>
        adopt(await api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })),
      register: async (name, email, password) =>
        adopt(await api<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })),
      logout: () => {
        memberSession.clear();
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, ready, adopt],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
