import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ComentariosIa = { destaques: string[]; alertas: string[]; recomendacoes: string[] };

export type ModuloIa = 'faturamento' | 'passagens' | 'frota' | 'maquinas';

export function useRelatorioIa(
  modulo: ModuloIa,
  enabled: boolean,
  payload: Record<string, unknown>,
  depsKey: string,
) {
  const [data, setData] = useState<ComentariosIa | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const { data: res, error: err } = await supabase.functions.invoke('relatorio-executivo-ia', {
          body: { modulo, ...payload },
        });
        if (cancelled) return;
        if (err) throw err;
        if (res?.error) throw new Error(res.error);
        setData({
          destaques: res?.destaques ?? [],
          alertas: res?.alertas ?? [],
          recomendacoes: res?.recomendacoes ?? [],
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Falha ao gerar comentários');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, depsKey, modulo]);

  return { data, loading, error };
}
