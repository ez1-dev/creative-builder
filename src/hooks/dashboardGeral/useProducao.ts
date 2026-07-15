import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { rangeFor, num, anomesToDate, statusFrom, type Periodo, type ModStatus } from './shared';

export interface ProducaoData {
  kpis: {
    ops_abertas: number;
    ops_atrasadas: number;
    carga_horas: number;
    lead_time_medio: number;
    pct_no_prazo: number;
  };
  breakdowns: {
    carga_centro: Array<{ label: string; valor: number }>;
    status_ops: Array<{ label: string; valor: number }>;
  };
  status: ModStatus;
}

const EMPTY: ProducaoData = {
  kpis: { ops_abertas: 0, ops_atrasadas: 0, carga_horas: 0, lead_time_medio: 0, pct_no_prazo: 0 },
  breakdowns: { carga_centro: [], status_ops: [] },
  status: 'idle',
};

export function useProducao(periodo: Periodo, enabled: boolean) {
  const range = useMemo(() => rangeFor(periodo), [periodo]);

  const queries = useQueries({
    queries: [
      {
        queryKey: ['dg-prod', 'dash', range.ini, range.fim],
        queryFn: () => api.get<any>('/api/producao/dashboard', {
          data_ini: anomesToDate(range.ini), data_fim: anomesToDate(range.fim, true),
        }),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dg-prod', 'carga'],
        queryFn: () => api.get<any>('/api/producao/carga/centros', {}),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
    ],
  });
  const [qDash, qCarga] = queries;

  const data: ProducaoData = useMemo(() => {
    const d: any = qDash.data ?? {};
    const k = d.kpis ?? {};
    const c: any = qCarga.data ?? {};
    const centros: any[] = c.centros ?? c.dados ?? [];
    const carga_centro = centros
      .map((r) => ({ label: String(r.descre ?? r.codcre ?? '—').slice(0, 22), valor: num(r.horas ?? r.total_horas ?? r.carga_horas) }))
      .filter((r) => r.valor > 0)
      .sort((a, b) => b.valor - a.valor).slice(0, 10);

    const status_ops = ((d.graficos?.por_status ?? d.por_status ?? []) as any[])
      .map((r) => ({ label: String(r.status ?? r.situacao ?? '—'), valor: num(r.quantidade ?? r.qtd ?? r.valor) }));

    const cargaTotal = num(c.resumo?.total_horas ?? centros.reduce((s, r) => s + num(r.horas ?? r.total_horas), 0));

    return {
      kpis: {
        ops_abertas: num(k.ops_abertas ?? k.total_abertas ?? k.total_ops),
        ops_atrasadas: num(k.ops_atrasadas ?? k.atrasadas),
        carga_horas: cargaTotal,
        lead_time_medio: num(k.lead_time_medio ?? k.leadtime),
        pct_no_prazo: num(k.pct_no_prazo ?? k.perc_no_prazo),
      },
      breakdowns: { carga_centro, status_ops },
      status: statusFrom(qDash, enabled),
    };
  }, [qDash.data, qCarga.data, qDash.isLoading, qDash.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && queries.some((q) => q.isLoading), refetch: () => Promise.all(queries.map((q) => q.refetch())), range };
}
