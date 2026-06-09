import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type BiClienteInfo = { nm_cliente?: string; nm_fantasia?: string };

const PAGE_SIZE = 1000;

async function loadAll(): Promise<Map<string, BiClienteInfo>> {
  const map = new Map<string, BiClienteInfo>();
  let from = 0;
  // Loop até retornar menos que PAGE_SIZE
  // proteção: até 200k linhas
  for (let i = 0; i < 200; i++) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('bi_cliente')
      .select('cd_cliente,nm_cliente,nm_fantasia')
      .range(from, to);
    if (error) throw error;
    const rows = data ?? [];
    for (const r of rows) {
      const key = String((r as any).cd_cliente ?? '').trim();
      if (!key) continue;
      map.set(key, {
        nm_cliente: (r as any).nm_cliente ?? undefined,
        nm_fantasia: (r as any).nm_fantasia ?? undefined,
      });
    }
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return map;
}

export function useBiClientesMap() {
  return useQuery({
    queryKey: ['bi_cliente_map'],
    queryFn: loadAll,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
