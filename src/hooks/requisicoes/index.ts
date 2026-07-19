import { useQuery } from '@tanstack/react-query';
import { requisicoesApi } from '@/services/requisicoesApi';
import type { RequisicaoFiltros } from '@/types/requisicoes';

const KEY = 'requisicoes';

export function useRequisicoes(filtros: RequisicaoFiltros = {}) {
  return useQuery({
    queryKey: [KEY, 'lista', filtros],
    queryFn: () => requisicoesApi.listar(filtros),
    staleTime: 30_000,
  });
}

export function useRequisicoesKpis(filtros: RequisicaoFiltros = {}) {
  return useQuery({
    queryKey: [KEY, 'kpis', filtros],
    queryFn: () => requisicoesApi.kpis(filtros),
    staleTime: 30_000,
  });
}

export function useRequisicao(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'detalhe', id],
    queryFn: () => requisicoesApi.detalhe(id!),
    enabled: !!id,
  });
}

export function useOpConsulta(codori: string | undefined, numorp: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'op', codori, numorp],
    queryFn: () => requisicoesApi.consultarOp(codori!, numorp!),
    enabled: !!codori && !!numorp,
  });
}

export function useHistoricoRequisicao(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'historico', id],
    queryFn: () => requisicoesApi.historico(id!),
    enabled: !!id,
  });
}

export function useFilaAlmox(filtros: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: [KEY, 'fila-almox', filtros],
    queryFn: () => requisicoesApi.filaAlmox(filtros),
    staleTime: 15_000,
  });
}

export function useConfigRequisicoes() {
  return useQuery({
    queryKey: [KEY, 'config'],
    queryFn: () => requisicoesApi.configuracoes(),
    staleTime: 300_000,
  });
}
