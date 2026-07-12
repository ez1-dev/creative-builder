import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as dreApi from '@/lib/contabil/dreStudioApi';
import type {
  DreLinha, DreModelo, DreOrcamentoItem, TipoModelo,
} from '@/lib/contabil/dreStudioTypes';

export const dreStudioKeys = {
  health: ['dre-studio', 'health'] as const,
  modelos: (codemp?: number) => ['dre-studio', 'modelos', codemp ?? null] as const,
  modelo: (id: string) => ['dre-studio', 'modelo', id] as const,
  contas: (modeloId: string, linhaId: string) => ['dre-studio', 'contas', modeloId, linhaId] as const,
  planoContas: (codemp: number, tipo?: TipoModelo, busca?: string) =>
    ['dre-studio', 'plano-contas', codemp, tipo ?? null, busca ?? ''] as const,
  centrosCusto: (codemp: number) => ['dre-studio', 'centros-custo', codemp] as const,
  orcamento: (modeloId: string, codemp?: number, ini?: number, fim?: number) =>
    ['dre-studio', 'orcamento', modeloId, codemp ?? null, ini ?? null, fim ?? null] as const,
  resultado: (modeloId: string, codemp: number, codfil: number | undefined, ini: number, fim: number, codccu?: string | null) =>
    ['dre-studio', 'resultado', modeloId, codemp, codfil ?? null, ini, fim, codccu ?? null] as const,
};

export function useDreStudioHealth() {
  return useQuery({
    queryKey: dreStudioKeys.health,
    queryFn: dreApi.fetchDreHealth,
    staleTime: 60_000,
    retry: 0,
  });
}

export function useDreStudioModelos(codemp?: number) {
  return useQuery({
    queryKey: dreStudioKeys.modelos(codemp),
    queryFn: () => dreApi.listarModelos(codemp),
    staleTime: 30_000,
  });
}

export function useDreStudioModelo(id: string | undefined) {
  return useQuery({
    queryKey: dreStudioKeys.modelo(id ?? ''),
    queryFn: () => dreApi.obterModelo(id!),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCriarModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dreApi.criarModelo,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dre-studio', 'modelos'] }); },
  });
}

export function useAtualizarModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DreModelo> }) => dreApi.atualizarModelo(id, patch),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['dre-studio', 'modelos'] });
      qc.invalidateQueries({ queryKey: dreStudioKeys.modelo(v.id) });
    },
  });
}

export function useExcluirModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dreApi.excluirModelo,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dre-studio', 'modelos'] }); },
  });
}

export function useCriarLinha(modeloId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linha: Omit<DreLinha, 'id' | 'modelo_id'>) => dreApi.criarLinha(modeloId, linha),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dreStudioKeys.modelo(modeloId) }); },
  });
}

export function useAtualizarLinha(modeloId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DreLinha> }) =>
      dreApi.atualizarLinha(modeloId, id, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dreStudioKeys.modelo(modeloId) }); },
  });
}

export function useExcluirLinha(modeloId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dreApi.excluirLinha(modeloId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dreStudioKeys.modelo(modeloId) }); },
  });
}

export function useContasLinha(modeloId: string, linhaId: string | undefined) {
  return useQuery({
    queryKey: dreStudioKeys.contas(modeloId, linhaId ?? ''),
    queryFn: () => dreApi.listarContasLinha(modeloId, linhaId!),
    enabled: !!linhaId,
    staleTime: 10_000,
  });
}

export function useVincularConta(modeloId: string, linhaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof dreApi.vincularConta>[2]) =>
      dreApi.vincularConta(modeloId, linhaId, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dreStudioKeys.contas(modeloId, linhaId) }); },
  });
}

export function useDesvincularConta(modeloId: string, linhaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vinculoId: string) => dreApi.desvincularConta(modeloId, linhaId, vinculoId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dreStudioKeys.contas(modeloId, linhaId) }); },
  });
}

export function usePlanoContas(params: {
  codemp: number; tipo?: TipoModelo; somente_ativas?: boolean; somente_analiticas?: boolean; busca?: string;
}, enabled = true) {
  return useQuery({
    queryKey: dreStudioKeys.planoContas(params.codemp, params.tipo, params.busca),
    queryFn: () => dreApi.buscarPlanoContas(params),
    enabled,
    staleTime: 60_000,
  });
}

export function useCentrosCusto(codemp: number, enabled = true) {
  return useQuery({
    queryKey: dreStudioKeys.centrosCusto(codemp),
    queryFn: () => dreApi.listarCentrosCusto(codemp),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useOrcamento(params: {
  modelo_id: string; codemp?: number; codfil?: number; anomes_ini?: number; anomes_fim?: number;
}, enabled = true) {
  return useQuery({
    queryKey: dreStudioKeys.orcamento(params.modelo_id, params.codemp, params.anomes_ini, params.anomes_fim),
    queryFn: () => dreApi.listarOrcamento(params),
    enabled,
    staleTime: 30_000,
  });
}

export function useGravarOrcamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: DreOrcamentoItem) => dreApi.gravarOrcamento(p),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['dre-studio', 'orcamento', v.modelo_id] });
    },
  });
}

export function useResultadoCache(params: {
  modelo_id: string; codemp: number; codfil?: number; anomes_ini: number; anomes_fim: number; codccu?: string | null;
}, enabled = true) {
  return useQuery({
    queryKey: dreStudioKeys.resultado(
      params.modelo_id, params.codemp, params.codfil, params.anomes_ini, params.anomes_fim, params.codccu,
    ),
    queryFn: () => dreApi.obterResultadoCache(params),
    enabled,
    staleTime: 15_000,
  });
}
