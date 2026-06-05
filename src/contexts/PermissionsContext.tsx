import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DEV = import.meta.env.DEV;

export interface ScreenPermission {
  screen_path: string;
  screen_name: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}


interface PermissionsState {
  permissions: ScreenPermission[];
  canUseAi: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsState | null>(null);

const QUERY_TIMEOUT_MS = 8000;

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[Permissions] timeout: ${label}`)), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

function shallowEqualPerms(a: ScreenPermission[], b: ScreenPermission[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.screen_path !== y.screen_path || x.can_view !== y.can_view || x.can_edit !== y.can_edit || x.can_delete !== y.can_delete || x.screen_name !== y.screen_name) {
      return false;
    }
  }
  return true;
}


export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { erpUser } = useAuth();
  const [permissions, setPermissions] = useState<ScreenPermission[]>([]);
  const [canUseAi, setCanUseAi] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadedForUserRef = useRef<string | null>(null);
  const loadingForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!erpUser) {
      if (loadedForUserRef.current !== null) {
        loadedForUserRef.current = null;
        loadingForUserRef.current = null;
        setPermissions((prev) => (prev.length === 0 ? prev : []));
        setCanUseAi((prev) => (prev === false ? prev : false));
        setIsAdmin((prev) => (prev === false ? prev : false));
      }
      setLoading((prev) => (prev === false ? prev : false));
      return;
    }

    if (loadedForUserRef.current === erpUser || loadingForUserRef.current === erpUser) return;
    loadingForUserRef.current = erpUser;

    let cancelled = false;

    (async () => {
      setLoading((prev) => (prev === true ? prev : true));
      try {
        const { data: accesses } = await withTimeout(
          supabase.from('user_access').select('profile_id').ilike('user_login', erpUser),
          QUERY_TIMEOUT_MS,
          'user_access',
        );
        if (cancelled) return;

        const profileIds = (accesses ?? []).map((a) => a.profile_id);
        if (profileIds.length === 0) {
          loadedForUserRef.current = erpUser;
          setPermissions((prev) => (prev.length === 0 ? prev : []));
          setCanUseAi((prev) => (prev === false ? prev : false));
          setIsAdmin((prev) => (prev === false ? prev : false));
          return;
        }

        const [screensRes, profilesRes] = await Promise.all([
          withTimeout(
            supabase
              .from('profile_screens')
              .select('screen_path, screen_name, can_view, can_edit')
              .in('profile_id', profileIds),
            QUERY_TIMEOUT_MS,
            'profile_screens',
          ),
          withTimeout(
            supabase
              .from('access_profiles')
              .select('ai_enabled, name')
              .in('id', profileIds),
            QUERY_TIMEOUT_MS,
            'access_profiles',
          ),
        ]);
        if (cancelled) return;

        const screens = screensRes.data ?? [];
        const profiles = profilesRes.data ?? [];

        const merged = new Map<string, ScreenPermission>();
        for (const s of screens) {
          const cur = merged.get(s.screen_path);
          if (cur) {
            cur.can_view = cur.can_view || s.can_view;
            cur.can_edit = cur.can_edit || s.can_edit;
          } else {
            merged.set(s.screen_path, { ...s });
          }
        }
        const next = Array.from(merged.values()).sort((a, b) => a.screen_path.localeCompare(b.screen_path));
        const nextAi = profiles.some((p: any) => p.ai_enabled);
        const nextAdmin = profiles.some((p: any) => p.name === 'Administrador');

        loadedForUserRef.current = erpUser;
        setPermissions((prev) => (shallowEqualPerms(prev, next) ? prev : next));
        setCanUseAi((prev) => (prev === nextAi ? prev : nextAi));
        setIsAdmin((prev) => (prev === nextAdmin ? prev : nextAdmin));

        if (DEV) {
          // eslint-disable-next-line no-console
          console.log('[Permissions] ready', { erpUser, screens: merged.size, isAdmin: nextAdmin });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Permissions] fetch failed:', e);
        if (!cancelled) {
          loadedForUserRef.current = erpUser;
          setPermissions((prev) => (prev.length === 0 ? prev : []));
          setCanUseAi((prev) => (prev === false ? prev : false));
          setIsAdmin((prev) => (prev === false ? prev : false));
        }
      } finally {
        if (!cancelled) setLoading((prev) => (prev === false ? prev : false));
        if (loadingForUserRef.current === erpUser) loadingForUserRef.current = null;
      }
    })();

    return () => { cancelled = true; };
  }, [erpUser]);

  const value = useMemo<PermissionsState>(() => ({
    permissions,
    canUseAi,
    isAdmin,
    loading,
  }), [permissions, canUseAi, isAdmin, loading]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export function usePermissionsContext(): PermissionsState {
  const ctx = useContext(PermissionsContext);
  if (ctx) return ctx;
  // Fallback seguro fora do provider (componentes públicos/teste)
  return { permissions: [], canUseAi: false, isAdmin: false, loading: false };
}
