import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { cargaApi } from '@/lib/producao/cargaApi';
import { num, statusFrom, type Periodo, type ModStatus } from './shared';
import { CargaCentrosResponseSchema, EMPTY_CENTROS, CargaRecursosResponseSchema, EMPTY_RECURSOS } from '@/lib/dashboardGeral/schemas/producao';
import { parseOrEmpty } from '@/lib/dashboardGeral/schemas/_utils';

export interface ProducaoData {
  kpis: {
    ops_total: number;
    recursos: number;
    carga_horas: number;
    linhas_operacao: number;
    sem_mapeamento: number;
  };
  breakdowns: {
    carga_centro: Array<{ label: string; valor: number }>;
    por_unidade: Array<{ label: string; valor: number }>;
  };
  status: ModStatus;
}

const EMPTY: ProducaoData = {
  kpis: { ops_total: 0, recursos: 0, carga_horas: 0, linhas_operacao: 0, sem_mapeamento: 0 },
  breakdowns: { carga_centro: [], por_unidade: [] },
  status: 'idle',
};

export function useProducao(_periodo: Periodo, enabled: boolean) {
  const queries = useQueries({
    queries: [
      {
        queryKey: ['dg-prod', 'centros'],
        queryFn: () => cargaApi.centros({}),
        enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false,
      },
      {
        queryKey: ['dg-prod', 'recursos'],
        queryFn: () => cargaApi.recursos({}),
        enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false,
      },
    ],
  });
  const [qCentros, qRecursos] = queries;

  const data: ProducaoData = useMemo(() => {
    const cP = parseOrEmpty(CargaCentrosResponseSchema, qCentros.data, EMPTY_CENTROS, 'producao/centros');
    const rP = parseOrEmpty(CargaRecursosResponseSchema, qRecursos.data, EMPTY_RECURSOS, 'producao/recursos');
    const resumo = cP.data.resumo;

    const centroMap: Record<string, number> = {};
    cP.data.dados.forEach((r) => {
      const label = (r.descre || '—').slice(0, 24);
      centroMap[label] = (centroMap[label] || 0) + r.carga_prevista_horas;
    });
    const carga_centro = Object.entries(centroMap)
      .map(([label, valor]) => ({ label, valor }))
      .filter((r) => r.valor > 0)
      .sort((a, b) => b.valor - a.valor).slice(0, 10);

    const unidadeMap: Record<string, number> = {};
    rP.data.dados.forEach((r) => {
      const label = r.unidade_negocio || '—';
      unidadeMap[label] = (unidadeMap[label] || 0) + r.carga_prevista_horas;
    });
    const por_unidade = Object.entries(unidadeMap)
      .map(([label, valor]) => ({ label, valor }))
      .filter((r) => r.valor > 0)
      .sort((a, b) => b.valor - a.valor);

    return {
      kpis: {
        ops_total: resumo.qtd_ops,
        recursos: resumo.qtd_recursos,
        carga_horas: resumo.carga_prevista_horas,
        linhas_operacao: resumo.qtd_linhas_operacao,
        sem_mapeamento: resumo.linhas_sem_mapeamento,
      },
      breakdowns: { carga_centro, por_unidade },
      status: statusFrom(qCentros, enabled, cP.partial || rP.partial),
    };
  }, [qCentros.data, qRecursos.data, qCentros.isLoading, qCentros.isFetching, qCentros.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && queries.some((q) => q.isLoading), refetch: () => Promise.all(queries.map((q) => q.refetch())) };
}
