import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { programacaoApi, type ProgramacaoFiltros, type GerarProgramacaoPayload, type CapacidadeRow } from '@/lib/producao/programacaoApi';

export function useFilaOps(filtros: ProgramacaoFiltros, enabled = true) {
  return useQuery({
    queryKey: ['programacao', 'fila', filtros],
    queryFn: () => programacaoApi.fila(filtros),
    enabled,
    staleTime: 30_000,
  });
}

export function useAgenda(filtros: ProgramacaoFiltros, enabled = true) {
  return useQuery({
    queryKey: ['programacao', 'agenda', filtros],
    queryFn: () => programacaoApi.agenda(filtros),
    enabled,
    staleTime: 30_000,
  });
}

export function useGargalos(filtros: ProgramacaoFiltros, enabled = true) {
  return useQuery({
    queryKey: ['programacao', 'gargalos', filtros],
    queryFn: () => programacaoApi.gargalos(filtros),
    enabled,
    staleTime: 30_000,
  });
}

export function useCapacidades(codemp?: number) {
  return useQuery({
    queryKey: ['programacao', 'capacidades', codemp],
    queryFn: () => programacaoApi.capacidades(codemp),
    staleTime: 60_000,
  });
}

export function useGerarProgramacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GerarProgramacaoPayload) => programacaoApi.gerar(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programacao', 'agenda'] });
      qc.invalidateQueries({ queryKey: ['programacao', 'gargalos'] });
      qc.invalidateQueries({ queryKey: ['programacao', 'fila'] });
    },
  });
}

export function useSalvarCapacidades() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: CapacidadeRow[]) => programacaoApi.salvarCapacidades(rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programacao', 'capacidades'] }),
  });
}
