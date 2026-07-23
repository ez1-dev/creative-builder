import { useQuery } from '@tanstack/react-query';
import {
  fetchIndicadores,
  fetchIndicadoresComAnalise,
  type IndicadoresParams,
  type IndicadoresPayload,
} from '@/lib/contabil/indicadoresApi';

export function useIndicadores(params: IndicadoresParams, enabled = true) {
  return useQuery<IndicadoresPayload, Error>({
    queryKey: ['contabil-indicadores', params],
    queryFn: () => fetchIndicadores(params),
    enabled: enabled && !!params.anomes_ini && !!params.anomes_fim,
    staleTime: 60_000,
    retry: 0,
  });
}

export function useIndicadoresAnalise(params: IndicadoresParams) {
  // Disabled by default — dispara sob demanda via refetch().
  return useQuery<IndicadoresPayload, Error>({
    queryKey: ['contabil-indicadores-analise', params],
    queryFn: () => fetchIndicadoresComAnalise(params),
    enabled: false,
    retry: 0,
    staleTime: 5 * 60_000,
  });
}
