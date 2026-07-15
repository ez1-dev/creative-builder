import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  fetchResumoFolhaDashboard, fetchTurnoverDashboard, fetchAbsenteismoDashboard, fetchQuadroColaboradores,
} from '@/lib/rh/api';
import { rangeFor, num, labelAnomes, statusFrom, type Periodo, type ModStatus } from './shared';

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

  const queries = useQueries({
    queries: [
      { queryKey: ['dg-rh', 'folha', range.ini, range.fim, codemp], queryFn: () => fetchResumoFolhaDashboard({ anomes_ini: range.ini, anomes_fim: range.fim, codemp }), enabled, retry: 0, staleTime: 5 * 60 * 1000 },
      { queryKey: ['dg-rh', 'turn', range.ini, range.fim, codemp], queryFn: () => fetchTurnoverDashboard({ anomes_ini: range.ini, anomes_fim: range.fim, codemp }), enabled, retry: 0, staleTime: 5 * 60 * 1000 },
      { queryKey: ['dg-rh', 'abs', range.ini, range.fim, codemp], queryFn: () => fetchAbsenteismoDashboard({ anomes_ini: range.ini, anomes_fim: range.fim, codemp }), enabled, retry: 0, staleTime: 5 * 60 * 1000 },
      { queryKey: ['dg-rh', 'quadro'], queryFn: () => fetchQuadroColaboradores(), enabled, retry: 0, staleTime: 10 * 60 * 1000 },
    ],
  });
  const [qFolha, qTurn, qAbs, qQuadro] = queries;

  const data: RhData = useMemo(() => {
    const folha: any = qFolha.data ?? {};
    const turn: any = qTurn.data ?? {};
    const abs: any = qAbs.data ?? {};
    const quadro: any[] = Array.isArray(qQuadro.data) ? qQuadro.data : [];

    const ativos = quadro.filter((c) => {
      const sit = String(c.situacao ?? c.status ?? c.ds_situacao ?? '').toLowerCase();
      return sit.includes('ativ') || sit === '' || sit === 't' || sit === 'a';
    }).length || quadro.length;

    const headcount = ((turn?.por_mes ?? []) as any[]).slice(-12).map((r) => ({
      label: labelAnomes(String(r.anomes ?? r.mes ?? '').replace(/\D/g, '').slice(0, 6)),
      valor: num(r.headcount_fim ?? r.headcount ?? r.headcount_medio),
    }));
    const turnover_mes = ((turn?.por_mes ?? []) as any[]).slice(-12).map((r) => ({
      label: labelAnomes(String(r.anomes ?? r.mes ?? '').replace(/\D/g, '').slice(0, 6)),
      valor: num(r.taxa_rotatividade_pct ?? r.turnover_pct ?? r.taxa),
    }));
    const absenteismo_motivo = ((abs?.por_motivo ?? []) as any[])
      .map((r) => ({ label: String(r.motivo ?? r.descricao ?? '—').slice(0, 24), valor: num(r.dias_perdidos ?? r.dias ?? r.qtd) }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8);

    const setorMap: Record<string, number> = {};
    quadro.forEach((c) => {
      const s = String(c.setor ?? c.departamento ?? c.ds_setor ?? '—');
      setorMap[s] = (setorMap[s] || 0) + 1;
    });
    const setor = Object.entries(setorMap).map(([label, valor]) => ({ label, valor: valor as number }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8);

    return {
      kpis: {
        headcount: ativos,
        admissoes: num(turn?.kpis?.admissoes),
        demissoes: num(turn?.kpis?.demissoes),
        turnover_pct: num(turn?.kpis?.taxa_rotatividade_pct),
        absenteismo_pct: num(abs?.kpis?.taxa_absenteismo_pct),
        custo_folha: num(folha?.kpis?.custo_total),
      },
      series: { headcount, turnover_mes },
      breakdowns: { absenteismo_motivo, setor },
      status: statusFrom(qFolha, enabled),
    };
  }, [qFolha.data, qTurn.data, qAbs.data, qQuadro.data, qFolha.isLoading, qFolha.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && queries.some((q) => q.isLoading), refetch: () => Promise.all(queries.map((q) => q.refetch())), range };
}
