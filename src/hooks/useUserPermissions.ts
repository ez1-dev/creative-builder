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
  const { usuario } = useAuth();
  const [permissions, setPermissions] = useState<ScreenPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!usuario) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      // Get user's profile
      const { data: access } = await supabase
        .from('user_access')
        .select('profile_id')
        .eq('user_login', usuario)
        .maybeSingle();

      if (!access) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Get screens for that profile
      const { data: screens } = await supabase
        .from('profile_screens')
        .select('screen_path, screen_name, can_view, can_edit')
        .eq('profile_id', access.profile_id);

      setPermissions(screens ?? []);
      setLoading(false);
    };

    fetch();
  }, [usuario]);

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
