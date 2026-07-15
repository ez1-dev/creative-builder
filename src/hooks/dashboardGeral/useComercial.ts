/**
 * Hook da aba Comercial no Dashboard Geral.
 * Reusa /api/faturamento-genius-dashboard (atual + mês anterior).
 * ATENÇÃO: backend rejeita 'codemp' (erro SQL "1 marker, 3 params").
 */
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { rangeFor, num, delta, labelAnomes, safeDiv, statusFrom, type Periodo, type ModStatus } from './shared';

export interface ComercialData {
  kpis: {
    faturamento: number;
    delta_pct: number;
    meta: number;
    meta_pct: number;
    ticket_medio: number;
    qtd_notas: number;
    desconto_pct: number;
  };
  series: {
    faturamento_meta: Array<{ label: string; valor: number; meta?: number }>;
  };
  breakdowns: {
    revendas: Array<{ label: string; valor: number }>;
    produtos: Array<{ label: string; valor: number }>;
    ufs: Array<{ label: string; valor: number }>;
  };
  status: ModStatus;
}

const EMPTY: ComercialData = {
  kpis: { faturamento: 0, delta_pct: 0, meta: 0, meta_pct: 0, ticket_medio: 0, qtd_notas: 0, desconto_pct: 0 },
  series: { faturamento_meta: [] },
  breakdowns: { revendas: [], produtos: [], ufs: [] },
  status: 'idle',
};

export function useComercial(periodo: Periodo, enabled: boolean) {
  const range = useMemo(() => rangeFor(periodo), [periodo]);
  const rangeAnt = useMemo(() => rangeFor('mes_anterior'), []);

  const queries = useQueries({
    queries: [
      {
        queryKey: ['dg-com', 'fat', range.ini, range.fim],
        queryFn: () => api.get<any>('/api/faturamento-genius-dashboard', { anomes_ini: range.ini, anomes_fim: range.fim }),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dg-com', 'fat-ant', rangeAnt.ini, rangeAnt.fim],
        queryFn: () => api.get<any>('/api/faturamento-genius-dashboard', { anomes_ini: rangeAnt.ini, anomes_fim: rangeAnt.fim }),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
    ],
  });
  const [qFat, qFatAnt] = queries;

  const data: ComercialData = useMemo(() => {
    const fat: any = qFat.data ?? {};
    const fatAnt: any = qFatAnt.data ?? {};
    const k = fat?.kpis ?? {};
    const kAnt = fatAnt?.kpis ?? {};

    const faturamento = num(k.valor_total ?? k.fat_liquido ?? k.faturamento_liquido ?? k.faturamento);
    const faturamentoAnt = num(kAnt.valor_total ?? kAnt.fat_liquido ?? kAnt.faturamento_liquido ?? kAnt.faturamento);
    const meta = num(k.meta_faturamento ?? k.meta ?? k.meta_total);
    const notas = num(k.quantidade_notas ?? k.qtd_notas ?? k.count_notas);
    const desconto = num(k.valor_desconto ?? k.desconto_total);

    const serie: any[] = fat?.por_mes ?? fat?.graficos?.por_mes ?? [];
    const faturamento_meta = serie.slice(-12).map((r: any) => ({
      label: labelAnomes(String(r.anomes ?? r.mes ?? '').replace(/\D/g, '').slice(0, 6)),
      valor: num(r.valor_total ?? r.valor ?? r.fat_liquido ?? r.faturamento_total),
      meta: num(r.meta ?? r.meta_faturamento),
    }));

    const revendas = ((fat?.por_revenda ?? fat?.graficos?.por_revenda ?? []) as any[])
      .map((r) => ({ label: String(r.revenda ?? r.nome ?? '—').slice(0, 24), valor: num(r.valor_total ?? r.valor ?? r.fat_liquido) }))
      .filter((r) => r.valor !== 0)
      .sort((a, b) => b.valor - a.valor).slice(0, 8);

    const produtos = ((fat?.por_produto ?? fat?.graficos?.por_produto ?? []) as any[])
      .map((r) => ({ label: String(r.produto ?? r.descricao ?? r.nome ?? '—').slice(0, 32), valor: num(r.valor_total ?? r.valor) }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8);

    const ufs = ((fat?.por_uf ?? fat?.por_estado ?? fat?.graficos?.por_uf ?? []) as any[])
      .map((r) => ({ label: String(r.uf ?? r.estado ?? '—'), valor: num(r.valor_total ?? r.valor) }))
      .sort((a, b) => b.valor - a.valor).slice(0, 12);

    return {
      kpis: {
        faturamento,
        delta_pct: delta(faturamento, faturamentoAnt) * 100,
        meta,
        meta_pct: safeDiv(faturamento, meta) * 100,
        ticket_medio: num(k.ticket_medio ?? safeDiv(faturamento, notas)),
        qtd_notas: notas,
        desconto_pct: safeDiv(desconto, faturamento + desconto) * 100,
      },
      series: { faturamento_meta },
      breakdowns: { revendas, produtos, ufs },
      status: statusFrom(qFat, enabled),
    };
  }, [qFat.data, qFatAnt.data, qFat.isLoading, qFat.isError, enabled]);

  return {
    data: enabled ? data : EMPTY,
    loading: enabled && queries.some((q) => q.isLoading),
    refetch: () => Promise.all(queries.map((q) => q.refetch())),
    range,
  };
}
