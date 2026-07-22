import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { FEATURES_BY_KEY } from '@/config/featureCatalog';

interface FlagsMap {
  /** Valor efetivo por key (após override do usuário). */
  effective: Record<string, boolean>;
  /** Valor definido pelo(s) perfil(s) do usuário. */
  profile: Record<string, boolean>;
  /** Override individual, se existir. */
  override: Record<string, boolean>;
}

/** Carrega, para o usuário logado, o mapa de features (perfil + override). */
export function useFeatureFlags() {
  const { user, erpUser } = useAuth();
  const { isAdmin } = usePermissionsContext();
  const uid = user?.id ?? null;

  const q = useQuery<FlagsMap>({
    queryKey: ['feature-flags', uid, erpUser],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const empty: FlagsMap = { effective: {}, profile: {}, override: {} };
      if (!uid) return empty;

      const [{ data: accesses }, { data: overridesData }] = await Promise.all([
        supabase.from('user_access').select('profile_id').ilike('user_login', erpUser ?? ''),
        supabase.from('user_feature_overrides').select('feature_key, enabled').eq('user_id', uid),
      ]);

      const profileIds = (accesses ?? []).map((a: any) => a.profile_id);
      const profileMap: Record<string, boolean> = {};

      if (profileIds.length > 0) {
        const { data: pfeats } = await supabase
          .from('profile_features')
          .select('feature_key, enabled')
          .in('profile_id', profileIds);
        for (const row of pfeats ?? []) {
          // OR entre perfis (mais permissivo)
          profileMap[row.feature_key] = profileMap[row.feature_key] || !!row.enabled;
        }
      }

      const override: Record<string, boolean> = {};
      for (const row of overridesData ?? []) override[row.feature_key] = !!row.enabled;

      const effective: Record<string, boolean> = {};
      for (const [key, def] of Object.entries(FEATURES_BY_KEY)) {
        effective[key] =
          override[key] ??
          (key in profileMap ? profileMap[key] : def.default);
      }

      return { effective, profile: profileMap, override };
    },
  });

  const isEnabled = useCallback(
    (key: string): boolean => {
      if (isAdmin) return true;
      const def = FEATURES_BY_KEY[key];
      if (!def) return true; // key desconhecida => não bloqueia
      const map = q.data?.effective;
      if (!map) return def.default;
      return map[key] ?? def.default;
    },
    [q.data, isAdmin],
  );

  return { ...q, isEnabled };
}

/** Atalho: retorna apenas o boolean de uma feature. */
export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}
