import { supabase } from "@/integrations/supabase/client";

/**
 * Cache persistente para dashboards do RH usando a tabela `dashboard_cache`
 * (Lovable Cloud). Hit: retorno < 100 ms. Miss: executa o fetcher e grava.
 *
 * O cache é best-effort — qualquer erro de leitura/escrita é engolido e não
 * quebra a resposta do fetcher subjacente.
 */

export const RH_CACHE_PREFIX = "rh:";
export const RH_CACHE_DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export async function withRhCache<T>(
  cacheKey: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const { data: cached } = await supabase
      .from("dashboard_cache")
      .select("payload, valid_until")
      .eq("cache_key", cacheKey)
      .gt("valid_until", new Date().toISOString())
      .maybeSingle();
    if (cached?.payload && (cached.payload as any).__rh_cache__) {
      return (cached.payload as any).value as T;
    }
  } catch {
    // ignora — segue para o fetcher
  }

  const value = await fetcher();

  try {
    const validUntil = new Date(Date.now() + ttlMs).toISOString();
    await supabase.from("dashboard_cache").upsert(
      {
        cache_key: cacheKey,
        payload: { __rh_cache__: true, value } as any,
        filtros_hash: cacheKey,
        valid_until: validUntil,
      },
      { onConflict: "cache_key" },
    );
  } catch {
    // best-effort
  }

  return value;
}

/**
 * Invalida entradas do cache do RH.
 * - Sem argumento: apaga tudo com prefixo `rh:`.
 * - Com escopos: apaga cada `LIKE '${scope}%'`.
 */
export async function invalidateRhCache(scopes?: string[]): Promise<void> {
  const prefixes = scopes && scopes.length > 0 ? scopes : [RH_CACHE_PREFIX];
  for (const p of prefixes) {
    try {
      await supabase.from("dashboard_cache").delete().like("cache_key", `${p}%`);
    } catch {
      // best-effort
    }
  }
}
