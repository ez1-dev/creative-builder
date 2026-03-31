import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  displayName: string | null;
  erpUser: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [erpUser, setErpUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, erp_user')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setDisplayName(data.display_name);
      setErpUser(data.erp_user);

      // Check if user is admin
      if (data.erp_user) {
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
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setDisplayName(null);
        setErpUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setDisplayName(null);
    setErpUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!session, user, session, displayName, erpUser, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
