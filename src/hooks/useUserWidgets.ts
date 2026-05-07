/**
 * Hook utilitário: carrega widgets injetados pelo usuário para uma página.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserWidgetRow {
  id: string;
  user_id: string;
  page_key: string;
  section: string;
  component_id: string;
  title: string | null;
  span: number;
  ordem: number;
  mapping: Record<string, any>;
  options: Record<string, any>;
}

export function useUserWidgets(pageKey: string) {
  const [widgets, setWidgets] = useState<UserWidgetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bi_user_widgets')
      .select('*')
      .eq('page_key', pageKey)
      .order('section', { ascending: true })
      .order('ordem', { ascending: true });
    setWidgets((data ?? []) as UserWidgetRow[]);
    setLoading(false);
  }, [pageKey]);

  useEffect(() => { refresh(); }, [refresh]);

  return { widgets, loading, refresh };
}

export async function deleteUserWidget(id: string) {
  return supabase.from('bi_user_widgets').delete().eq('id', id);
}

export async function createUserWidget(payload: {
  page_key: string; section: string; component_id: string;
  title?: string | null; span?: number; ordem?: number;
  mapping?: Record<string, any>; options?: Record<string, any>;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada — entre novamente para aplicar componentes.');
  return supabase.from('bi_user_widgets').insert({
    user_id: auth.user.id,
    span: 1, ordem: 0, mapping: {}, options: {}, ...payload,
  }).select().single();
}
