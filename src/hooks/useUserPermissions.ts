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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!erpUser) {
      setPermissions([]);
      setCanUseAi(false);
      setLoading(false);
      return;
    }

    const fetchPerms = async () => {
      setLoading(true);
      const { data: access } = await supabase
        .from('user_access')
        .select('profile_id')
        .ilike('user_login', erpUser)
        .maybeSingle();

      if (!access) {
        setPermissions([]);
        setCanUseAi(false);
        setLoading(false);
        return;
      }

      const [{ data: screens }, { data: profile }] = await Promise.all([
        supabase
          .from('profile_screens')
          .select('screen_path, screen_name, can_view, can_edit')
          .eq('profile_id', access.profile_id),
        supabase
          .from('access_profiles')
          .select('ai_enabled')
          .eq('id', access.profile_id)
          .maybeSingle(),
      ]);

      setPermissions(screens ?? []);
      setCanUseAi(profile?.ai_enabled ?? false);
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

  return { permissions, loading, canView, canEdit, canUseAi, hasPermissions };
}
