import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getEstoqueAnalise, type EstoqueAnaliseParams, type EstoqueAnaliseResponse } from '@/lib/estoque/analiseApi';

export function useEstoqueAnalise(params: EstoqueAnaliseParams, enabled: boolean) {
  return useQuery<EstoqueAnaliseResponse>({
    queryKey: [
      'estoque-analise',
      params.codemp ?? null,
      params.codfil ?? null,
      params.criterio_abc,
      params.meses_consumo,
      params.corte_a,
      params.corte_b,
      params.codpro ?? '',
      params.coddep ?? '',
      params.codfam ?? '',
      params.situacao ?? '',
    ],
    queryFn: ({ signal }) => getEstoqueAnalise(params, signal),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: 0,
  });
}
