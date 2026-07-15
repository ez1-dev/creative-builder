import { useQuery } from '@tanstack/react-query';
import { fetchDrillDre, type DrillDreParams } from '@/lib/contabil/drillDreApi';

export function useDrillDre(params: DrillDreParams | null, enabled = true) {
  return useQuery({
    queryKey: ['contabil', 'drill-dre', params],
    queryFn: () => fetchDrillDre(params as DrillDreParams),
    enabled: !!params && enabled && !!params.modelo_id && !!params.linha_id,
    staleTime: 30_000,
    retry: 1,
  });
}
