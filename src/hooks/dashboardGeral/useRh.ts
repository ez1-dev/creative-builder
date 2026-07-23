import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import {
  fetchResumoFolhaDashboard, fetchTurnoverDashboard, fetchAbsenteismoDashboard, fetchQuadroColaboradores,
} from '@/lib/rh/api';
import { fetchQuadroDashboard } from '@/lib/rh/quadroDashboardApi';
import { rangeFor, num, anomesToDate, labelAnomes, statusFrom, type Periodo, type ModStatus } from './shared';
import {
  TurnoverResponseSchema, EMPTY_TURNOVER,
  AbsenteismoResponseSchema, EMPTY_ABS,
  FolhaResponseSchema, EMPTY_FOLHA,
  QuadroColaboradoresSchema, EMPTY_QUADRO,
} from '@/lib/dashboardGeral/schemas/rh';
import { parseOrEmpty } from '@/lib/dashboardGeral/schemas/_utils';

export interface RhData {
  kpis: {
    headcount: number;
    admissoes: number;
    demissoes: number;
    turnover_pct: number;
    absenteismo_pct: number;
    custo_folha: number;
  };
  series: {
    headcount: Array<{ label: string; valor: number }>;
    turnover_mes: Array<{ label: string; valor: number }>;
  };
  breakdowns: {
    absenteismo_motivo: Array<{ label: string; valor: number }>;
    setor: Array<{ label: string; valor: number }>;
  };
  status: ModStatus;
}

const EMPTY: RhData = {
  kpis: { headcount: 0, admissoes: 0, demissoes: 0, turnover_pct: 0, absenteismo_pct: 0, custo_folha: 0 },
  series: { headcount: [], turnover_mes: [] },
  breakdowns: { absenteismo_motivo: [], setor: [] },
  status: 'idle',
};

export function useRh(periodo: Periodo, enabled: boolean, codemp = 1) {
  const range = useMemo(() => rangeFor(periodo), [periodo]);
  const range12m = useMemo(() => rangeFor('ult_12m'), []);
  const dataRef = useMemo(() => anomesToDate(range.fim, true), [range.fim]);

  const queries = useQueries({
    queries: [
      { queryKey: ['dg-rh', 'folha', range.ini, range.fim, codemp], queryFn: () => fetchResumoFolhaDashboard({ anomes_ini: range.ini, anomes_fim: range.fim, codemp }), enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false },
      { queryKey: ['dg-rh', 'turn', range.ini, range.fim, codemp], queryFn: () => fetchTurnoverDashboard({ anomes_ini: range.ini, anomes_fim: range.fim, codemp }), enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false },
      { queryKey: ['dg-rh', 'turn12m', range12m.ini, range12m.fim, codemp], queryFn: () => fetchTurnoverDashboard({ anomes_ini: range12m.ini, anomes_fim: range12m.fim, codemp }), enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false },
      { queryKey: ['dg-rh', 'abs', range.ini, range.fim, codemp], queryFn: () => fetchAbsenteismoDashboard({ anomes_ini: range.ini, anomes_fim: range.fim, codemp }), enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false },
      { queryKey: ['dg-rh', 'quadroDash', dataRef], queryFn: () => fetchQuadroDashboard(dataRef), enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false },
      { queryKey: ['dg-rh', 'quadro'], queryFn: () => fetchQuadroColaboradores(), enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false },
    ],
  });
  const [qFolha, qTurn, qTurn12m, qAbs, qQuadroDash, qQuadro] = queries;

  const data: RhData = useMemo(() => {
    const folhaP = parseOrEmpty(FolhaResponseSchema, qFolha.data, EMPTY_FOLHA, 'rh/folha');
    const turnP = parseOrEmpty(TurnoverResponseSchema, qTurn.data, EMPTY_TURNOVER, 'rh/turnover');
    const turn12mP = parseOrEmpty(TurnoverResponseSchema, qTurn12m.data, EMPTY_TURNOVER, 'rh/turnover12m');
    const absP = parseOrEmpty(AbsenteismoResponseSchema, qAbs.data, EMPTY_ABS, 'rh/absenteismo');
    const quadroP = parseOrEmpty(QuadroColaboradoresSchema, qQuadro.data, EMPTY_QUADRO, 'rh/quadro');
    const quadro = quadroP.data;

    // Headcount: usar KPI oficial do endpoint de dashboard (evita cap 1000 da lista).
    const dashKpis: any = (qQuadroDash.data as any)?.kpis ?? {};
    const headcountKpi = Number(
      dashKpis.total ?? dashKpis.colaboradores ?? dashKpis.total_colaboradores ?? 0,
    ) || 0;
    if (quadro.length >= 1000) {
      // eslint-disable-next-line no-console
      console.warn('[DashboardGeral/RH] Lista quadro-colaboradores truncada em 1000 — breakdown por setor pode estar incompleto.');
    }

    const headcount = turn12mP.data.por_mes.slice(-12).map((r) => ({
      label: labelAnomes(String(r.anomes).replace(/\D/g, '').slice(0, 6)),
      valor: r.headcount_fim,
    }));
    const turnover_mes = turn12mP.data.por_mes.slice(-12).map((r) => ({
      label: labelAnomes(String(r.anomes).replace(/\D/g, '').slice(0, 6)),
      valor: r.taxa_rotatividade_pct,
    }));
    const absenteismo_motivo = absP.data.por_motivo
      .map((r) => ({ label: r.motivo || '—', valor: r.dias_perdidos }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8);

    const setorMap: Record<string, number> = {};
    quadro.forEach((c) => {
      const s = c.setor || '—';
      setorMap[s] = (setorMap[s] || 0) + 1;
    });
    const setor = Object.entries(setorMap).map(([label, valor]) => ({ label, valor: valor as number }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8);

    const anyPartial = folhaP.partial || turnP.partial || absP.partial || quadroP.partial;

    return {
      kpis: {
        headcount: headcountKpi,
        admissoes: turnP.data.kpis.admitidos,
        demissoes: turnP.data.kpis.demitidos,
        turnover_pct: turnP.data.kpis.taxa_rotatividade_pct,
        absenteismo_pct: absP.data.kpis.taxa_absenteismo_pct,
        custo_folha: folhaP.data.kpis.custo_total,
      },
      series: { headcount, turnover_mes },
      breakdowns: { absenteismo_motivo, setor },
      status: statusFrom(qFolha, enabled, anyPartial),
    };
  }, [qFolha.data, qTurn.data, qTurn12m.data, qAbs.data, qQuadroDash.data, qQuadro.data, qFolha.isLoading, qFolha.isFetching, qFolha.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && queries.some((q) => q.isLoading), refetch: () => Promise.all(queries.map((q) => q.refetch())), range };
}
