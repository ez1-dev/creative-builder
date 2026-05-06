import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ScreenPermission {
  screen_path: string;
  screen_name: string;
  can_view: boolean;
  can_edit: boolean;
}

export function useUserPermissions() {
  const { erpUser } = useAuth();
  const [permissions, setPermissions] = useState<ScreenPermission[]>([]);
  const [canUseAi, setCanUseAi] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!erpUser) {
      setPermissions([]);
      setCanUseAi(false);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const fetchPerms = async () => {
      setLoading(true);
      const { data: accesses } = await supabase
        .from('user_access')
        .select('profile_id')
        .ilike('user_login', erpUser);

      const profileIds = (accesses ?? []).map((a) => a.profile_id);
      if (profileIds.length === 0) {
        setPermissions([]);
        setCanUseAi(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const [{ data: screens }, { data: profiles }] = await Promise.all([
        supabase
          .from('profile_screens')
          .select('screen_path, screen_name, can_view, can_edit')
          .in('profile_id', profileIds),
        supabase
          .from('access_profiles')
          .select('ai_enabled, name')
          .in('id', profileIds),
      ]);

      // Une permissões de múltiplos perfis: OR em can_view/can_edit por screen_path
      const merged = new Map<string, ScreenPermission>();
      for (const s of screens ?? []) {
        const cur = merged.get(s.screen_path);
        if (cur) {
          cur.can_view = cur.can_view || s.can_view;
          cur.can_edit = cur.can_edit || s.can_edit;
        } else {
          merged.set(s.screen_path, { ...s });
        }
      }
      setPermissions(Array.from(merged.values()));
      setCanUseAi((profiles ?? []).some((p) => p.ai_enabled));
      setIsAdmin((profiles ?? []).some((p) => (p as any).name === 'Administrador'));
      setLoading(false);
    };

    fetchPerms();
  }, [erpUser]);

  const canView = (path: string) => {
    const p = permissions.find((s) => s.screen_path === path);
    return p?.can_view ?? false;
  };

  const canEdit = (path: string) => {
    const p = permissions.find((s) => s.screen_path === path);
    return p?.can_edit ?? false;
  };

  const hasPermissions = permissions.length > 0;

  return { permissions, loading, canView, canEdit, canUseAi, isAdmin, hasPermissions };
}
