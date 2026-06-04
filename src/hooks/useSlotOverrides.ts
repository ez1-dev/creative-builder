/**
 * Carrega e gerencia overrides de slots (escolha de gráfico por usuário)
 * para uma página BI. Persistido em bi_user_slot_overrides.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SlotOverrideRow {
  id: string;
  user_id: string;
  page_key: string;
  slot_key: string;
  mode: 'builtin' | 'library';
  variant: string | null;
  component_id: string | null;
  mapping: Record<string, any>;
  options: Record<string, any>;
}

export type SlotOverridePayload =
  | { mode: 'builtin'; variant: string; options?: Record<string, any> }
  | { mode: 'library'; component_id: string; mapping?: Record<string, any>; options?: Record<string, any>; title?: string };

export function useSlotOverrides(pageKey: string) {
  const [rows, setRows] = useState<SlotOverrideRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bi_user_slot_overrides')
      .select('*')
      .eq('page_key', pageKey);
    setRows((data ?? []) as SlotOverrideRow[]);
    setLoading(false);
  }, [pageKey]);

  useEffect(() => { refresh(); }, [refresh]);

  const getOverride = useCallback(
    (slotKey: string) => rows.find((r) => r.slot_key === slotKey),
    [rows],
  );

  const setOverride = useCallback(
    async (slotKey: string, payload: SlotOverridePayload) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Sessão expirada — entre novamente.');
      const base = {
        user_id: auth.user.id,
        page_key: pageKey,
        slot_key: slotKey,
        mode: payload.mode,
        variant: payload.mode === 'builtin' ? payload.variant : null,
        component_id: payload.mode === 'library' ? payload.component_id : null,
        mapping: payload.mode === 'library' ? (payload.mapping ?? {}) : {},
        options: payload.options ?? {},
      };
      const { error } = await supabase
        .from('bi_user_slot_overrides')
        .upsert(base, { onConflict: 'user_id,page_key,slot_key' });
      if (error) throw new Error(error.message);
      await refresh();
    },
    [pageKey, refresh],
  );

  const clearOverride = useCallback(
    async (slotKey: string) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      await supabase
        .from('bi_user_slot_overrides')
        .delete()
        .eq('user_id', auth.user.id)
        .eq('page_key', pageKey)
        .eq('slot_key', slotKey);
      await refresh();
    },
    [pageKey, refresh],
  );

  const clearAll = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase
      .from('bi_user_slot_overrides')
      .delete()
      .eq('user_id', auth.user.id)
      .eq('page_key', pageKey);
    await refresh();
  }, [pageKey, refresh]);

  return { rows, loading, getOverride, setOverride, clearOverride, clearAll, refresh, hasAny: rows.length > 0 };
}
