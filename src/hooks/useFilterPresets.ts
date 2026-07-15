import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FilterPreset<T = any> {
  id: string;
  page_key: string;
  nome: string;
  filtros: T;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

function lastKey(pageKey: string, userId: string | null) {
  return `filters:last:${pageKey}:${userId ?? 'anon'}`;
}

export function useFilterPresets<T = any>(pageKey: string) {
  const [presets, setPresets] = useState<FilterPreset<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastFilters, setLastFiltersState] = useState<T | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setUserId(uid);
      // last from localStorage
      try {
        const raw = localStorage.getItem(lastKey(pageKey, uid));
        setLastFiltersState(raw ? JSON.parse(raw) : null);
      } catch { setLastFiltersState(null); }

      if (!uid) { setPresets([]); return; }
      const { data, error } = await supabase
        .from('bi_user_filter_presets')
        .select('*')
        .eq('user_id', uid)
        .eq('page_key', pageKey)
        .order('is_default', { ascending: false })
        .order('nome', { ascending: true });
      if (error) throw error;
      setPresets((data ?? []) as any);
    } finally { setLoading(false); }
  }, [pageKey]);

  useEffect(() => { load(); }, [load]);

  const defaultPreset = presets.find((p) => p.is_default) ?? null;

  const savePreset = useCallback(async (nome: string, filtros: T, opts?: { asDefault?: boolean }) => {
    if (!userId) throw new Error('Não autenticado');
    const { data, error } = await supabase
      .from('bi_user_filter_presets')
      .upsert(
        { user_id: userId, page_key: pageKey, nome, filtros: filtros as any, is_default: !!opts?.asDefault },
        { onConflict: 'user_id,page_key,nome' },
      )
      .select()
      .single();
    if (error) throw error;
    await load();
    return data as any as FilterPreset<T>;
  }, [userId, pageKey, load]);

  const updatePreset = useCallback(async (id: string, patch: Partial<Pick<FilterPreset<T>, 'nome' | 'filtros' | 'is_default'>>) => {
    const { error } = await supabase
      .from('bi_user_filter_presets')
      .update(patch as any)
      .eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  const deletePreset = useCallback(async (id: string) => {
    const { error } = await supabase.from('bi_user_filter_presets').delete().eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  const setDefault = useCallback(async (id: string | null) => {
    if (!userId) return;
    if (id === null) {
      await supabase.from('bi_user_filter_presets')
        .update({ is_default: false })
        .eq('user_id', userId).eq('page_key', pageKey).eq('is_default', true);
    } else {
      await supabase.from('bi_user_filter_presets')
        .update({ is_default: true })
        .eq('id', id);
    }
    await load();
  }, [userId, pageKey, load]);

  const saveLastFilters = useCallback((filtros: T) => {
    try {
      localStorage.setItem(lastKey(pageKey, userId), JSON.stringify(filtros));
      setLastFiltersState(filtros);
    } catch { /* noop */ }
  }, [pageKey, userId]);

  return {
    presets, loading, defaultPreset, lastFilters,
    savePreset, updatePreset, deletePreset, setDefault, saveLastFilters,
    reload: load,
  };
}
