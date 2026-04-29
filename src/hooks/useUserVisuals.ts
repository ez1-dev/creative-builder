import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook que retorna quais gráficos/mapas o usuário atual pode visualizar,
 * baseado no perfil de acesso vinculado ao seu erp_user.
 *
 * Regra padrão: ausência de registro = pode ver (compatível, não esconde nada
 * até que um admin desmarque explicitamente).
 *
 * Admins veem tudo (bypass).
 */
export function useUserVisuals() {
  const { erpUser, user } = useAuth();
  const [denied, setDenied] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setDenied(new Set());
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Verifica se é admin
    const { data: adminCheck } = await supabase.rpc('is_admin', { _uid: user.id });
    if (adminCheck) {
      setIsAdmin(true);
      setDenied(new Set());
      setLoading(false);
      return;
    }

    if (!erpUser) {
      setDenied(new Set());
      setLoading(false);
      return;
    }

    // Descobre profile_id
    const { data: access } = await supabase
      .from('user_access')
      .select('profile_id')
      .ilike('user_login', erpUser)
      .maybeSingle();

    if (!access) {
      setDenied(new Set());
      setLoading(false);
      return;
    }

    const { data: rows } = await supabase
      .from('profile_visuals')
      .select('visual_key, can_view')
      .eq('profile_id', access.profile_id);

    const deniedSet = new Set<string>();
    for (const r of rows ?? []) {
      if (r.can_view === false) deniedSet.add(r.visual_key);
    }
    setDenied(deniedSet);
    setLoading(false);
  }, [user?.id, erpUser]);

  useEffect(() => {
    load();
  }, [load]);

  const canSeeVisual = useCallback(
    (key: string): boolean => {
      if (isAdmin) return true;
      return !denied.has(key);
    },
    [isAdmin, denied],
  );

  return { canSeeVisual, isAdmin, loading };
}
