import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import type { ImpressaoOpFiltros, OpImpressao } from '@/lib/producao/opImpressao';

export function useImpressaoOrdemProducao() {
  const [data, setData] = useState<OpImpressao | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFilters, setLastFilters] = useState<ImpressaoOpFiltros | null>(null);

  const fetchData = useCallback(async (filters: ImpressaoOpFiltros) => {
    setLoading(true);
    setError(null);
    setLastFilters(filters);
    try {
      const payload: Record<string, any> = {
        cod_emp: Number(filters.cod_emp),
        cod_ori: filters.cod_ori,
        num_orp: Number(filters.num_orp),
        listar_componentes: filters.listar_componentes || 'S',
        listar_desenho: filters.listar_desenho || 'N',
      };
      if (filters.cod_etg) payload.cod_etg = filters.cod_etg;
      if (filters.cod_cre) payload.cod_cre = filters.cod_cre;
      if (filters.incluir_desenhos === 'S') {
        payload.incluir_desenhos = 'S';
        if (filters.pasta_desenhos) payload.pasta_desenhos = filters.pasta_desenhos;
      }
      const res = await api.get<OpImpressao>('/api/producao/ordem-producao/impressao', payload);
      setData(res ?? null);
    } catch (err: any) {
      setError(err?.message || 'Falha ao consultar ordem de produção');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLastFilters(null);
  }, []);

  const retry = useCallback(() => {
    if (lastFilters) void fetchData(lastFilters);
  }, [lastFilters, fetchData]);

  return { data, loading, error, fetchData, reset, retry };
}
