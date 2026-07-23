import { useQuery } from '@tanstack/react-query';
import {
  fetchAglutinadorDrill,
  fetchContaRollup,
  type AglutinadorDrillNode,
  type AglutinadorDrillParams,
  type ContaRollup,
} from '@/lib/contabil/drillAglutinadorApi';

export function useAglutinadorDrill(
  codagl: number | null | undefined,
  params: AglutinadorDrillParams | null,
  enabled = true,
) {
  return useQuery<AglutinadorDrillNode, Error>({
    queryKey: [
      'contabil',
      'aglutinador-drill',
      codagl,
      params?.anomes_ini,
      params?.anomes_fim,
      params?.codemp,
      params?.codfil,
      params?.base,
    ],
    queryFn: () => fetchAglutinadorDrill(codagl as number, params as AglutinadorDrillParams),
    enabled: enabled && !!codagl && !!params?.anomes_ini && !!params?.anomes_fim,
    staleTime: 60_000,
    retry: 0,
  });
}

export function useContaRollup(
  ctared: number | null | undefined,
  codemp: number | string = 1,
  enabled = true,
) {
  return useQuery<ContaRollup, Error>({
    queryKey: ['contabil', 'conta-rollup', ctared, codemp],
    queryFn: () => fetchContaRollup(ctared as number, codemp),
    enabled: enabled && !!ctared,
    staleTime: 5 * 60_000,
    retry: 0,
  });
}
