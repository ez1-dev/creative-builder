import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DEV = import.meta.env.DEV;


interface ScreenPermission {
  screen_path: string;
  screen_name: string;
  can_view: boolean;
  can_edit: boolean;
}

const QUERY_TIMEOUT_MS = 8000;

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[useUserPermissions] timeout: ${label}`)), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export function useUserPermissions() {
  const { erpUser } = useAuth();
  const [permissions, setPermissions] = useState<ScreenPermission[]>([]);
  const [canUseAi, setCanUseAi] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!erpUser) {
      loadedForUserRef.current = null;
      setPermissions([]);
      setCanUseAi(false);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    if (loadedForUserRef.current === erpUser) {
      return;
    }
    loadedForUserRef.current = erpUser;



    let cancelled = false;
    const fetchPerms = async () => {
      setLoading(true);
      try {
        const { data: accesses } = await withTimeout(
          supabase.from('user_access').select('profile_id').ilike('user_login', erpUser),
          QUERY_TIMEOUT_MS,
          'user_access',
        );
        if (cancelled) return;

        const profileIds = (accesses ?? []).map((a) => a.profile_id);
        if (profileIds.length === 0) {
          setPermissions([]);
          setCanUseAi(false);
          setIsAdmin(false);
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
        setPermissions(Array.from(merged.values()));
        setCanUseAi(profiles.some((p: any) => p.ai_enabled));
        setIsAdmin(profiles.some((p: any) => p.name === 'Administrador'));
        if (DEV) {
          // eslint-disable-next-line no-console
          console.log('[useUserPermissions] ready', {
            erpUser,
            screens: merged.size,
            isAdmin: profiles.some((p: any) => p.name === 'Administrador'),
          });
        }

      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[useUserPermissions] fetch failed, liberando UI mesmo assim:', e);
        if (!cancelled) {
          setPermissions([]);
          setCanUseAi(false);
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPerms();
    return () => { cancelled = true; };
  }, [erpUser]);

  const canView = (path: string) => {
    if (isAdmin) return true;
    const p = permissions.find((s) => s.screen_path === path);
    return p?.can_view ?? false;
  };

  const canEdit = (path: string) => {
    if (isAdmin) return true;
    const p = permissions.find((s) => s.screen_path === path);
    return p?.can_edit ?? false;
  };

  const hasPermissions = isAdmin || permissions.length > 0;

  // Ordem de prioridade para landing page pós-login.
  const PRIORITY_PATHS = [
    '/painel-compras',
    '/compras-produto',
    '/notas-recebimento',
    '/estoque',
    '/passagens-aereas',
    '/faturamento-genius',
  ];
  const viewablePaths = permissions.filter((p) => p.can_view).map((p) => p.screen_path);
  const firstAllowedPath =
    PRIORITY_PATHS.find((p) => viewablePaths.includes(p)) ??
    [...viewablePaths].sort()[0] ??
    (isAdmin ? '/estoque' : null);

  return { permissions, loading, canView, canEdit, canUseAi, isAdmin, hasPermissions, firstAllowedPath };
}
