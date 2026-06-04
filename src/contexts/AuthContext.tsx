import React, { createContext, useContext, useState, useRef, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { api, setApiBaseUrl } from '@/lib/api';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  displayName: string | null;
  erpUser: string | null;
  erpConnected: boolean;
  approved: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEV = import.meta.env.DEV;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [erpUser, setErpUser] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [erpConnected, setErpConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Refs para evitar reload de profile/ERP em todo refresh de token
  const loadedForUserIdRef = useRef<string | null>(null);
  const loadingProfileRef = useRef(false);

  // fetchProfile estável via ref — não entra em deps de useEffect
  const fetchProfileRef = useRef<(userId: string) => Promise<void>>();
  fetchProfileRef.current = async (userId: string) => {
    if (loadingProfileRef.current) return;
    loadingProfileRef.current = true;

    const withTimeout = <T,>(p: PromiseLike<T>, ms: number, label: string): Promise<T> =>
      new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`[Auth] timeout: ${label}`)), ms);
        Promise.resolve(p).then(
          (v) => { clearTimeout(t); resolve(v); },
          (e) => { clearTimeout(t); reject(e); },
        );
      });

    try {
      let profileData: { display_name: string | null; erp_user: string | null; approved: boolean | null } | null = null;
      try {
        const { data } = await withTimeout(
          supabase.from('profiles').select('display_name, erp_user, approved').eq('id', userId).maybeSingle(),
          8000,
          'profiles',
        );
        profileData = data ?? null;
      } catch (e) {
        console.warn('[Auth] profile fetch failed:', e);
      }

      if (!profileData) {
        console.warn('[Auth] no profile row for user', userId);
        setDisplayName(null);
        setErpUser(null);
        setApproved(false);
        return;
      }

      setDisplayName((prev) => prev === profileData!.display_name ? prev : profileData!.display_name);
      setErpUser((prev) => prev === profileData!.erp_user ? prev : profileData!.erp_user);
      setApproved((prev) => prev === (profileData!.approved ?? false) ? prev : (profileData!.approved ?? false));
      if (DEV) console.log('[Auth] profile loaded', { erp_user: profileData.erp_user, approved: profileData.approved });

      if (profileData.erp_user) {
        try {
          const { data: settings } = await withTimeout(
            supabase.from('app_settings').select('key, value').in('key', ['erp_api_user', 'erp_api_pass', 'erp_api_url']),
            8000,
            'app_settings',
          );
          const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]));
          const apiUrl = settingsMap['erp_api_url'];
          if (apiUrl) setApiBaseUrl(apiUrl);
          const apiUser = settingsMap['erp_api_user'];
          const apiPass = settingsMap['erp_api_pass'];
          if (apiUser && apiPass) {
            await withTimeout(api.login(apiUser, apiPass), 10000, 'erp.login');
            setErpConnected((prev) => prev === true ? prev : true);
            if (DEV) console.log('[Auth] erp api ok');
          } else {
            console.warn('[Auth] credenciais da API ERP não configuradas no banco');
            setErpConnected(false);
          }
        } catch (e) {
          console.warn('[Auth] login automático na API ERP falhou (não fatal):', e);
          setErpConnected(false);
        }

        try {
          const { data: accesses } = await withTimeout(
            supabase
              .from('user_access')
              .select('profile_id, access_profiles!inner(name)')
              .ilike('user_login', profileData.erp_user),
            8000,
            'user_access',
          );
          const isAdmin = (accesses ?? []).some(
            (a: any) => a.access_profiles?.name === 'Administrador',
          );
          if (isAdmin) localStorage.setItem('erp_is_admin', 'true');
          else localStorage.removeItem('erp_is_admin');
        } catch (e) {
          console.warn('[Auth] check admin falhou (não fatal):', e);
        }
      }
    } catch (e) {
      console.error('[Auth] fetchProfile erro inesperado:', e);
    } finally {
      setLoading(false);
      loadingProfileRef.current = false;
    }
  };

  useEffect(() => {
    try {
      const tok = localStorage.getItem('erp_token');
      if (tok && (tok.length < 10 || tok === 'undefined' || tok === 'null')) {
        localStorage.removeItem('erp_token');
      }
    } catch {}

    const handleSession = (nextSession: Session | null, eventName?: string) => {
      const nextUserId = nextSession?.user?.id ?? null;
      const sameUser = nextUserId === loadedForUserIdRef.current;

      // Atualiza session/user só se o id mudar — evita re-render em refresh de token
      setSession((prev) => (prev?.user?.id === nextUserId ? prev : nextSession));
      setUser((prev) => (prev?.id === nextUserId ? prev : nextSession?.user ?? null));

      if (!nextSession?.user) {
        loadedForUserIdRef.current = null;
        setDisplayName(null);
        setErpUser(null);
        setErpConnected(false);
        setApproved(false);
        setLoading(false);
        return;
      }

      // Ignora TOKEN_REFRESHED / USER_UPDATED se já carregou esse usuário
      if (sameUser && (eventName === 'TOKEN_REFRESHED' || eventName === 'USER_UPDATED')) {
        return;
      }

      if (sameUser) {
        // Mesma sessão já carregada — não recarregar profile
        setLoading(false);
        return;
      }

      loadedForUserIdRef.current = nextUserId;
      fetchProfileRef.current?.(nextUserId!);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      handleSession(nextSession, event);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      handleSession(s, 'INITIAL');
      if (!s) setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useMemo(() => async () => {
    localStorage.removeItem('erp_is_admin');
    loadedForUserIdRef.current = null;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setDisplayName(null);
    setErpUser(null);
    setErpConnected(false);
    setApproved(false);
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated: !!session,
    user,
    session,
    displayName,
    erpUser,
    erpConnected,
    approved,
    loading,
    logout,
  }), [session, user, displayName, erpUser, erpConnected, approved, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    if (import.meta.env.DEV) {
      console.warn('useAuth called outside AuthProvider — returning fallback');
    }
    return {
      isAuthenticated: false,
      user: null,
      session: null,
      displayName: null,
      erpUser: null,
      erpConnected: false,
      approved: false,
      loading: true,
      logout: async () => {},
    } as AuthContextType;
  }
  return context;
};
