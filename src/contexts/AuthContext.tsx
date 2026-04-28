import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [erpUser, setErpUser] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [erpConnected, setErpConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, erp_user, approved')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name);
        setErpUser(data.erp_user);
        setApproved(data.approved ?? false);

          if (data.erp_user) {
            // Login automático na API ERP com credenciais globais do banco
            try {
              const { data: settings } = await supabase
                .from('app_settings')
                .select('key, value')
                .in('key', ['erp_api_user', 'erp_api_pass', 'erp_api_url']);
              const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value]));
              const apiUrl = settingsMap['erp_api_url'];
              if (apiUrl) setApiBaseUrl(apiUrl);
              const apiUser = settingsMap['erp_api_user'];
              const apiPass = settingsMap['erp_api_pass'];
              if (apiUser && apiPass) {
                await api.login(apiUser, apiPass);
                setErpConnected(true);
              } else {
                console.warn('Credenciais da API ERP não configuradas no banco');
                setErpConnected(false);
              }
            } catch (e) {
              console.warn('Login automático na API ERP falhou:', e);
              setErpConnected(false);
            }

          const { data: access } = await supabase
            .from('user_access')
            .select('profile_id')
            .ilike('user_login', data.erp_user)
            .maybeSingle();
          if (access) {
            const { data: profile } = await supabase
              .from('access_profiles')
              .select('name')
              .eq('id', access.profile_id)
              .maybeSingle();
            if (profile?.name === 'Administrador') {
              localStorage.setItem('erp_is_admin', 'true');
            } else {
              localStorage.removeItem('erp_is_admin');
            }
          } else {
            localStorage.removeItem('erp_is_admin');
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setDisplayName(null);
        setErpUser(null);
        setErpConnected(false);
        setApproved(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    localStorage.removeItem('erp_is_admin');
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setDisplayName(null);
    setErpUser(null);
    setErpConnected(false);
    setApproved(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!session, user, session, displayName, erpUser, erpConnected, approved, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback seguro — evita tela branca em casos de HMR onde o módulo
    // do contexto é recarregado isoladamente do Provider.
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
