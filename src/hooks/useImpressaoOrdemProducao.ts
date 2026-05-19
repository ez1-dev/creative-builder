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
      const res = await api.get<OpImpressao>('/api/producao/ordem-producao/impressao', filters as any);
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
