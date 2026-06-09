import { useQuery } from '@tanstack/react-query';
import {
  fetchComercialKpis, fetchComercialMensal,
  fetchComercialEstado, fetchComercialRevenda, fetchComercialObras,
  fetchComercialDetalhes,
  type ComercialKpis, type ComercialMensalRow,
  type ComercialEstadoRow, type ComercialRevendaRow, type ComercialObrasRow,
  type ComercialDetalheRow,
} from '@/lib/bi/comercialApi';
import type { BiComercialFilters } from '@/lib/bi/comercialFilters';
import { listMetas, type MetaFaturamento } from '@/lib/bi/metasFaturamentoApi';

export type BlocoKey =
  | 'kpis'
  | 'evolucao'
  | 'rankings'
  | 'margem'
  | 'comentariosIa'
  | 'tabela';

export interface BlocosSelecionados {
  kpis: boolean;
  evolucao: boolean;
  rankings: boolean;
  margem: boolean;
  comentariosIa: boolean;
  tabela: boolean;
}

export const BLOCOS_PADRAO: BlocosSelecionados = {
  kpis: true, evolucao: true, rankings: true, margem: true, comentariosIa: true, tabela: true,
};

export const BLOCOS_CURTO: BlocosSelecionados = {
  kpis: true, evolucao: true, rankings: true, margem: false, comentariosIa: true, tabela: false,
};

export interface RelatorioDados {
  kpis: ComercialKpis | null;
  mensal: ComercialMensalRow[];
  rankings: {
    revenda: ComercialRevendaRow[];
    estado: ComercialEstadoRow[];
    obras: ComercialObrasRow[];
  };
  detalhes: ComercialDetalheRow[];
  metas: MetaFaturamento[];
}

export function useRelatorioExecutivoFaturamento(
  filtros: BiComercialFilters,
  blocos: BlocosSelecionados,
  enabled: boolean,
) {
  const qKpis = useQuery({
    queryKey: ['rel-exec', 'kpis', filtros],
    queryFn: () => fetchComercialKpis(filtros),
    enabled: enabled && blocos.kpis,
  });

  const qMensal = useQuery({
    queryKey: ['rel-exec', 'mensal', filtros],
    queryFn: () => fetchComercialMensal(filtros),
    enabled: enabled && (blocos.evolucao || blocos.comentariosIa),
  });

  const qRevenda = useQuery({
    queryKey: ['rel-exec', 'revenda', filtros],
    queryFn: () => fetchComercialRevenda(filtros),
    enabled: enabled && blocos.rankings,
  });

  const qEstado = useQuery({
    queryKey: ['rel-exec', 'estado', filtros],
    queryFn: () => fetchComercialEstado(filtros),
    enabled: enabled && blocos.rankings,
  });

  const qObras = useQuery({
    queryKey: ['rel-exec', 'obras', filtros],
    queryFn: () => fetchComercialObras(filtros),
    enabled: enabled && blocos.rankings,
  });

  const qDetalhes = useQuery({
    queryKey: ['rel-exec', 'detalhes', filtros],
    queryFn: () => fetchComercialDetalhes(filtros, { escopo: 'todas', maxRows: 500, page_size: 500 }),
    enabled: enabled && blocos.tabela,
  });

  const qMetas = useQuery({
    queryKey: ['rel-exec', 'metas', filtros.anomes_ini, filtros.anomes_fim],
    queryFn: () => listMetas(filtros.anomes_ini, filtros.anomes_fim),
    enabled: enabled && (blocos.evolucao || blocos.kpis),
  });

  const dados: RelatorioDados = {
    kpis: qKpis.data ?? null,
    mensal: qMensal.data ?? [],
    rankings: {
      revenda: qRevenda.data ?? [],
      estado: qEstado.data ?? [],
      obras: qObras.data ?? [],
    },
    detalhes: qDetalhes.data ?? [],
    metas: qMetas.data ?? [],
  };

  const isLoading = [qKpis, qMensal, qRevenda, qEstado, qObras, qDetalhes, qMetas]
    .some((q) => q.fetchStatus === 'fetching');

  const error = [qKpis, qMensal, qRevenda, qEstado, qObras, qDetalhes, qMetas]
    .map((q) => q.error).find(Boolean) as Error | undefined;

  return { dados, isLoading, error };
}
