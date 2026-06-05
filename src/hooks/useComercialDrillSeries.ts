/**
 * Hook lazy para buscar dados de séries do BI Comercial baseadas no drill API.
 *
 * Recebe a lista de chaves de série referenciadas pelos widgets visíveis e
 * dispara um fetch por (drill_type) usando React Query — agnóstico de métrica
 * (a mesma resposta serve para todas as métricas daquela dimensão).
 *
 * Retorna `{ [drillKey: string]: DrillResponse | undefined }` indexado por
 * `por_<dim>` para o ComercialPage montar as séries via `buildSerieFromDrill`.
 */
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  fetchComercialDrill,
  type DrillContexto,
  type DrillResponse,
  type DrillType,
} from '@/lib/bi/comercialDrillApi';
import { parseSeriesKey, dimToDrillType } from '@/lib/bi/comercialSeriesBuilder';

interface Params {
  seriesKeys: string[];
  anomes_ini: string;
  anomes_fim: string;
  unidade_negocio: 'GENIUS' | 'ESTRUTURAL ZORTEA' | 'CONSOLIDADO';
  contexto?: DrillContexto;
}

export function useComercialDrillSeries(p: Params): {
  byDim: Record<string, DrillResponse | undefined>;
  isFetching: boolean;
  isError: boolean;
} {
  // Coleta dims únicas que precisam de drill (apenas as não derivadas localmente).
  const dims = useMemo(() => {
    const set = new Set<string>();
    p.seriesKeys.forEach((k) => {
      const parsed = parseSeriesKey(k);
      if (parsed.kind === 'por' && dimToDrillType(parsed.dim)) {
        set.add(parsed.dim);
      }
    });
    return Array.from(set).sort();
  }, [p.seriesKeys]);

  const ctx = p.contexto ?? {};

  const queries = useQueries({
    queries: dims.map((dim) => {
      const drillType = dimToDrillType(dim) as DrillType;
      return {
        queryKey: [
          'bi-comercial-serie-drill',
          dim, drillType,
          p.anomes_ini, p.anomes_fim, p.unidade_negocio,
          ctx,
        ],
        queryFn: () => fetchComercialDrill({
          drill_type: drillType,
          anomes_ini: p.anomes_ini,
          anomes_fim: p.anomes_fim,
          unidade_negocio: p.unidade_negocio,
          contexto: ctx,
          page: 1,
          page_size: 100,
        }),
        enabled: Boolean(p.anomes_ini && p.anomes_fim),
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 60_000,
      };
    }),
  });

  return useMemo(() => {
    const byDim: Record<string, DrillResponse | undefined> = {};
    dims.forEach((dim, i) => { byDim[`por_${dim}`] = queries[i]?.data; });
    return {
      byDim,
      isFetching: queries.some((q) => q.isFetching),
      isError: queries.some((q) => q.isError),
    };
  }, [dims, queries]);
}
