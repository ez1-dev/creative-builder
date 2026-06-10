import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RevendaCatalogEntry {
  cd_rev_pedido: string;
  nm_revenda: string | null;
}

/**
 * Carrega o catálogo `bi_revenda` (cd_rev_pedido → nm_revenda) do Lovable Cloud.
 * Usado para enriquecer rankings/dimensoes que recebem apenas o código da revenda
 * vindos da FastAPI.
 */
export function useRevendaCatalog(enabled = true) {
  return useQuery({
    queryKey: ['bi_revenda', 'catalog'],
    enabled,
    staleTime: 1000 * 60 * 30, // 30 min
    gcTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bi_revenda')
        .select('cd_rev_pedido,nm_revenda');
      if (error) throw error;
      const map = new Map<string, string>();
      for (const row of (data ?? []) as RevendaCatalogEntry[]) {
        if (row.cd_rev_pedido) {
          map.set(String(row.cd_rev_pedido).trim(), (row.nm_revenda ?? '').trim());
        }
      }
      return map;
    },
  });
}

export function enrichRevendaRows<T extends Record<string, any>>(
  rows: T[],
  catalog: Map<string, string> | undefined,
): Array<T & { nm_revenda?: string; revenda_label?: string; cd_rev_pedido?: string }> {
  if (!rows?.length) return [];
  if (!catalog || catalog.size === 0) return rows as any;
  return rows.map((r) => {
    const code = String(r.revenda ?? r.cd_rev_pedido ?? r.cd_revenda ?? '').trim();
    const nome = code ? catalog.get(code) : undefined;
    if (!code) return r as any;
    return {
      ...r,
      cd_rev_pedido: code,
      nm_revenda: nome || (r as any).nm_revenda,
      revenda_label: nome ? `${code} - ${nome}` : code,
    };
  });
}
