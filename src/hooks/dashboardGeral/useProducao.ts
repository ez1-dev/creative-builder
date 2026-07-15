import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { cargaApi } from '@/lib/producao/cargaApi';
import { num, statusFrom, type Periodo, type ModStatus } from './shared';

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
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dg-prod', 'recursos'],
        queryFn: () => cargaApi.recursos({}),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
    ],
  });
  const [qCentros, qRecursos] = queries;

  const data: ProducaoData = useMemo(() => {
    const cRes: any = qCentros.data ?? {};
    const rRes: any = qRecursos.data ?? {};
    const centros: any[] = cRes.dados ?? [];
    const recursos: any[] = rRes.dados ?? [];
    const resumo = cRes.resumo ?? {};

    // Agrupa por descrição do centro (soma horas de múltiplas operações)
    const centroMap: Record<string, number> = {};
    centros.forEach((r) => {
      const label = String(r.descre ?? r.codcre ?? '—').slice(0, 24);
      centroMap[label] = (centroMap[label] || 0) + num(r.carga_prevista_horas);
    });
    const carga_centro = Object.entries(centroMap)
      .map(([label, valor]) => ({ label, valor }))
      .filter((r) => r.valor > 0)
      .sort((a, b) => b.valor - a.valor).slice(0, 10);

    const unidadeMap: Record<string, number> = {};
    recursos.forEach((r) => {
      const label = String(r.unidade_negocio ?? '—');
      unidadeMap[label] = (unidadeMap[label] || 0) + num(r.carga_prevista_horas);
    });
    const por_unidade = Object.entries(unidadeMap)
      .map(([label, valor]) => ({ label, valor }))
      .filter((r) => r.valor > 0)
      .sort((a, b) => b.valor - a.valor);

    return {
      kpis: {
        ops_total: num(resumo.qtd_ops),
        recursos: num(resumo.qtd_recursos),
        carga_horas: num(resumo.carga_prevista_horas),
        linhas_operacao: num(resumo.qtd_linhas_operacao),
        sem_mapeamento: num(resumo.linhas_sem_mapeamento),
      },
      breakdowns: { carga_centro, por_unidade },
      status: statusFrom(qCentros, enabled),
    };
  }, [qCentros.data, qRecursos.data, qCentros.isLoading, qCentros.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && queries.some((q) => q.isLoading), refetch: () => Promise.all(queries.map((q) => q.refetch())) };
}
