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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!erpUser) {
      setPermissions([]);
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
        setLoading(false);
        return;
      }

      const { data: screens } = await supabase
        .from('profile_screens')
        .select('screen_path, screen_name, can_view, can_edit')
        .eq('profile_id', access.profile_id);

      setPermissions(screens ?? []);
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

  return { permissions, loading, canView, canEdit, hasPermissions };
}
