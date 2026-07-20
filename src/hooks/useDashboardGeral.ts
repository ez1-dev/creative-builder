/**
 * Hook orquestrador do Dashboard Geral — dispara em paralelo as chamadas
 * dos dashboards existentes de cada módulo e devolve um objeto consolidado
 * com {kpis, series, breakdowns} e status por bloco.
 *
 * Cada consulta é isolada: se um endpoint retornar 404/500 o bloco fica
 * indisponível mas o resto do dashboard continua funcional.
 */
import { useQueries, keepPreviousData } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import type { PainelComprasDashboardResponse } from '@/lib/api';
import {
  fetchResumoFolhaDashboard,
  fetchTurnoverDashboard,
  fetchAbsenteismoDashboard,
  fetchQuadroColaboradores,
} from '@/lib/rh/api';
import { rangeFor, num, delta, labelAnomes, type Periodo } from '@/lib/dashboardGeral/aggregator';

const DEFAULTS = {
  retry: 0 as const,
  staleTime: 10 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  placeholderData: keepPreviousData,
  refetchOnWindowFocus: false as const,
};

export interface DashboardGeralData {
  kpis: {
    faturamento_mes: number;
    faturamento_delta: number;
    faturamento_meta_pct: number;
    ticket_medio: number;
    compras_mes: number;
    valor_pendente: number;
    total_ocs: number;
    fornecedores_ativos: number;
    headcount_ativo: number;
    turnover_pct: number;
    absenteismo_pct: number;
    custo_folha: number;
  };
  series: {
    faturamento_meta: Array<{ label: string; valor: number; meta?: number }>;
    compras_mes: Array<{ label: string; valor: number }>;
    headcount: Array<{ label: string; valor: number }>;
    turnover_mes: Array<{ label: string; valor: number }>;
  };
  breakdowns: {
    faturamento_revenda: Array<{ label: string; valor: number }>;
    compras_tipo: Array<{ label: string; valor: number }>;
    absenteismo_motivo: Array<{ label: string; valor: number }>;
  };
  status: {
    faturamento: 'ok' | 'erro' | 'carregando';
    compras: 'ok' | 'erro' | 'carregando';
    rh_folha: 'ok' | 'erro' | 'carregando';
    rh_turnover: 'ok' | 'erro' | 'carregando';
    rh_absenteismo: 'ok' | 'erro' | 'carregando';
    rh_quadro: 'ok' | 'erro' | 'carregando';
  };
}

const EMPTY: DashboardGeralData = {
  kpis: {
    faturamento_mes: 0, faturamento_delta: 0, faturamento_meta_pct: 0, ticket_medio: 0,
    compras_mes: 0, valor_pendente: 0, total_ocs: 0, fornecedores_ativos: 0,
    headcount_ativo: 0, turnover_pct: 0, absenteismo_pct: 0, custo_folha: 0,
  },
  series: { faturamento_meta: [], compras_mes: [], headcount: [], turnover_mes: [] },
  breakdowns: { faturamento_revenda: [], compras_tipo: [], absenteismo_motivo: [] },
  status: {
    faturamento: 'carregando', compras: 'carregando', rh_folha: 'carregando',
    rh_turnover: 'carregando', rh_absenteismo: 'carregando', rh_quadro: 'carregando',
  },
};

function status(query: { isLoading: boolean; isError: boolean; data: unknown }): 'ok' | 'erro' | 'carregando' {
  if (query.isLoading) return 'carregando';
  if (query.isError || !query.data) return 'erro';
  return 'ok';
}

export function useDashboardGeral(periodo: Periodo = 'ytd', codemp: number = 1) {
  const range = useMemo(() => rangeFor(periodo), [periodo]);
  const rangeAnterior = useMemo(() => rangeFor('mes_anterior'), []);

  const queries = useQueries({
    queries: [
      {
        queryKey: ['dg', 'fat', range.ini, range.fim, codemp],
        queryFn: () => api.get<any>('/api/faturamento-genius-dashboard', {
          anomes_ini: range.ini, anomes_fim: range.fim, codemp,
        }),
        ...DEFAULTS,
      },
      {
        queryKey: ['dg', 'fat-ant', rangeAnterior.ini, codemp],
        queryFn: () => api.get<any>('/api/faturamento-genius-dashboard', {
          anomes_ini: rangeAnterior.ini, anomes_fim: rangeAnterior.fim, codemp,
        }),
        ...DEFAULTS,
      },
      {
        queryKey: ['dg', 'compras', range.ini, range.fim],
        queryFn: () => {
          const yIni = Number(range.ini.slice(0, 4));
          const mIni = Number(range.ini.slice(4, 6));
          const yFim = Number(range.fim.slice(0, 4));
          const mFim = Number(range.fim.slice(4, 6));
          const lastDay = new Date(yFim, mFim, 0).getDate();
          return api.get<PainelComprasDashboardResponse>('/api/painel-compras-dashboard', {
            data_ini: `${yIni}-${String(mIni).padStart(2, '0')}-01`,
            data_fim: `${yFim}-${String(mFim).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
          });
        },
        ...DEFAULTS,
      },
      {
        queryKey: ['dg', 'folha', range.ini, range.fim, codemp],
        queryFn: () => fetchResumoFolhaDashboard({ anomes_ini: range.ini, anomes_fim: range.fim, codemp }),
        ...DEFAULTS,
      },
      {
        queryKey: ['dg', 'turnover', range.ini, range.fim, codemp],
        queryFn: () => fetchTurnoverDashboard({ anomes_ini: range.ini, anomes_fim: range.fim, codemp }),
        ...DEFAULTS,
      },
      {
        queryKey: ['dg', 'abs', range.ini, range.fim, codemp],
        queryFn: () => fetchAbsenteismoDashboard({ anomes_ini: range.ini, anomes_fim: range.fim, codemp }),
        ...DEFAULTS,
      },
      {
        queryKey: ['dg', 'quadro'],
        queryFn: () => fetchQuadroColaboradores(),
        ...DEFAULTS,
      },
    ],
  });

  const [qFat, qFatAnt, qCompras, qFolha, qTurn, qAbs, qQuadro] = queries;

  const data: DashboardGeralData = useMemo(() => {
    const fat: any = qFat.data ?? {};
    const fatAnt: any = qFatAnt.data ?? {};
    const compras: any = qCompras.data ?? {};
    const folha: any = qFolha.data ?? {};
    const turn: any = qTurn.data ?? {};
    const abs: any = qAbs.data ?? {};
    const quadro: any[] = Array.isArray(qQuadro.data) ? qQuadro.data : [];

    const fatKpis = fat?.kpis ?? {};
    const fatAntKpis = fatAnt?.kpis ?? {};
    const faturamentoMes = num(fatKpis.valor_total ?? fatKpis.fat_liquido ?? fatKpis.faturamento);
    const faturamentoAnt = num(fatAntKpis.valor_total ?? fatAntKpis.fat_liquido ?? fatAntKpis.faturamento);
    const meta = num(fatKpis.meta_faturamento ?? fatKpis.meta ?? fatKpis.meta_total);

    // Faturamento por mês (série)
    const fatSerie: any[] = fat?.por_mes ?? fat?.graficos?.por_mes ?? [];
    const faturamentoMeta = fatSerie.slice(-12).map((row: any) => ({
      label: labelAnomes(String(row.anomes ?? row.mes ?? row.periodo ?? '').replace(/\D/g, '').slice(0, 6)),
      valor: num(row.valor_total ?? row.valor ?? row.fat_liquido),
      meta: num(row.meta ?? row.meta_faturamento),
    }));

    // Faturamento por revenda (breakdown)
    const revendas: any[] = fat?.por_revenda ?? fat?.graficos?.por_revenda ?? [];
    const faturamentoRevenda = revendas
      .filter((r: any) => {
        const nome = String(r.revenda ?? r.nome ?? '').toUpperCase();
        return nome && nome !== 'OUTROS' && nome !== 'LANCTO MANUAL';
      })
      .map((r: any) => ({
        label: String(r.revenda ?? r.nome ?? '—').slice(0, 24),
        valor: num(r.valor_total ?? r.valor ?? r.fat_liquido),
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);

    // Compras
    const comprasKpis = compras?.kpis ?? {};
    const comprasSerie: any[] = compras?.graficos?.por_mes ?? [];
    const comprasMes = comprasSerie.slice(-12).map((r: any) => ({
      label: labelAnomes(String(r.mes ?? r.anomes ?? '').replace(/\D/g, '').slice(0, 6)),
      valor: num(r.valor ?? r.valor_total),
    }));
    const comprasTipo = (compras?.graficos?.por_tipo_despesa ?? [])
      .map((r: any) => ({
        label: String(r.tipo_despesa ?? r.tipo ?? r.label ?? '—').slice(0, 20),
        valor: num(r.valor ?? r.valor_total),
      }))
      .sort((a: any, b: any) => b.valor - a.valor)
      .slice(0, 8);

    // RH — folha
    const folhaKpis = folha?.kpis ?? {};

    // RH — quadro (headcount ativo)
    const ativos = quadro.filter((c: any) => {
      const sit = String(c.situacao ?? c.status ?? c.ds_situacao ?? '').toLowerCase();
      return sit.includes('ativ') || sit === '' || sit === 't' || sit === 'a';
    }).length;
    const headcountAtivo = ativos || quadro.length;

    // Série mensal do headcount (usar turnover.por_mes se existir)
    const headcount = ((turn?.por_mes ?? []) as any[]).slice(-12).map((r: any) => ({
      label: labelAnomes(String(r.anomes ?? r.mes ?? '').replace(/\D/g, '').slice(0, 6)),
      valor: num(r.headcount_fim ?? r.headcount ?? r.headcount_medio),
    }));

    // Turnover série
    const turnoverMes = ((turn?.por_mes ?? []) as any[]).slice(-12).map((r: any) => ({
      label: labelAnomes(String(r.anomes ?? r.mes ?? '').replace(/\D/g, '').slice(0, 6)),
      valor: num(r.taxa_rotatividade_pct ?? r.turnover_pct ?? r.taxa),
    }));

    // Absenteísmo motivo
    const absenteismoMotivo = ((abs?.por_motivo ?? []) as any[])
      .map((r: any) => ({
        label: String(r.motivo ?? r.descricao ?? r.categoria ?? '—').slice(0, 24),
        valor: num(r.dias_perdidos ?? r.dias ?? r.qtd ?? r.quantidade),
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);

    // Debug: expor no console para diagnóstico rápido de campos ausentes
    // eslint-disable-next-line no-console
    console.log('[DashboardGeral] payloads recebidos', {
      periodo_range: range,
      faturamento_kpis: fatKpis,
      faturamento_por_mes_len: fatSerie.length,
      faturamento_por_revenda_len: revendas.length,
      compras_kpis: comprasKpis,
      compras_graficos_keys: Object.keys(compras?.graficos ?? {}),
      folha_kpis: folhaKpis,
      turnover_kpis: turn?.kpis,
      turnover_por_mes_len: (turn?.por_mes ?? []).length,
      absenteismo_kpis: abs?.kpis,
      quadro_len: quadro.length,
    });

    return {
      kpis: {
        faturamento_mes: faturamentoMes,
        faturamento_delta: delta(faturamentoMes, faturamentoAnt),
        faturamento_meta_pct: meta ? faturamentoMes / meta : 0,
        ticket_medio: num(fatKpis.ticket_medio ?? (faturamentoMes && num(fatKpis.quantidade_notas) ? faturamentoMes / num(fatKpis.quantidade_notas) : 0)),
        compras_mes: num(comprasKpis.valor_comprado),
        valor_pendente: num(comprasKpis.valor_pendente),
        total_ocs: num(comprasKpis.quantidade_ocs),
        fornecedores_ativos: num(comprasKpis.quantidade_fornecedores),
        headcount_ativo: headcountAtivo,
        turnover_pct: num(turn?.kpis?.taxa_rotatividade_pct) / 100,
        absenteismo_pct: num(abs?.kpis?.taxa_absenteismo_pct) / 100,
        custo_folha: num(folhaKpis.custo_total),
      },
      series: { faturamento_meta: faturamentoMeta, compras_mes: comprasMes, headcount, turnover_mes: turnoverMes },
      breakdowns: { faturamento_revenda: faturamentoRevenda, compras_tipo: comprasTipo, absenteismo_motivo: absenteismoMotivo },
      status: {
        faturamento: status(qFat),
        compras: status(qCompras),
        rh_folha: status(qFolha),
        rh_turnover: status(qTurn),
        rh_absenteismo: status(qAbs),
        rh_quadro: status(qQuadro),
      },
    };
  }, [qFat.data, qFatAnt.data, qCompras.data, qFolha.data, qTurn.data, qAbs.data, qQuadro.data]);

  const loading = queries.some((q) => q.isLoading);
  const refetch = () => Promise.all(queries.map((q) => q.refetch()));

  return { data: data ?? EMPTY, loading, refetch, range };
}
