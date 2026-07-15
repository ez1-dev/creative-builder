import { useQuery } from '@tanstack/react-query';
import {
  fetchDrillLancamentos,
  type DrillLancamentosParams,
} from '@/lib/contabil/drillLancamentosApi';

export function useDrillLancamentos(
  params: DrillLancamentosParams | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ['contabil', 'drill-lancamentos', params],
    queryFn: () => fetchDrillLancamentos(params as DrillLancamentosParams),
    enabled:
      !!params &&
      enabled &&
      !!params.modelo_id &&
      !!params.linha_id,
    staleTime: 30_000,
    retry: 1,
  });
}
