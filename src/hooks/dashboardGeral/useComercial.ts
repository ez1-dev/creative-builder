/**
 * Hook da aba Comercial no Dashboard Geral.
 * Reusa /api/faturamento-genius-dashboard (atual + mês anterior).
 * ATENÇÃO: backend rejeita 'codemp' (erro SQL "1 marker, 3 params").
 */
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { rangeFor, num, delta, labelAnomes, safeDiv, statusFrom, type Periodo, type ModStatus } from './shared';
import { FaturamentoGeniusResponseSchema, EMPTY_FATURAMENTO } from '@/lib/dashboardGeral/schemas/comercial';
import { parseOrEmpty } from '@/lib/dashboardGeral/schemas/_utils';

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
        enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false,
      },
      {
        queryKey: ['dg-com', 'fat-ant', rangeAnt.ini, rangeAnt.fim],
        queryFn: () => api.get<any>('/api/faturamento-genius-dashboard', { anomes_ini: rangeAnt.ini, anomes_fim: rangeAnt.fim }),
        enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false,
      },
    ],
  });
  const [qFat, qFatAnt] = queries;

  const data: ComercialData = useMemo(() => {
    const fatP = parseOrEmpty(FaturamentoGeniusResponseSchema, qFat.data, EMPTY_FATURAMENTO, 'comercial');
    const fatAntP = parseOrEmpty(FaturamentoGeniusResponseSchema, qFatAnt.data, EMPTY_FATURAMENTO, 'comercial');
    const fat = fatP.data;
    const fatAnt = fatAntP.data;
    const k = fat.kpis;
    const kAnt = fatAnt.kpis;

    const faturamento = k.valor_total;
    const faturamentoAnt = kAnt.valor_total;
    const meta = k.meta_faturamento;
    const notas = k.quantidade_notas;
    const desconto = k.valor_desconto;

    const faturamento_meta = fat.por_mes.slice(-12).map((r) => ({
      label: labelAnomes(String(r.anomes || r.mes).replace(/\D/g, '').slice(0, 6)),
      valor: r.valor_total,
      meta: r.meta,
    }));

    const revendas = fat.por_revenda
      .map((r) => ({ label: String(r.revenda || r.nome || '—').slice(0, 24), valor: r.valor_total }))
      .filter((r) => r.valor !== 0)
      .sort((a, b) => b.valor - a.valor).slice(0, 8);

    const produtos = fat.por_produto
      .map((r) => ({ label: String(r.produto || r.descricao || r.nome || '—').slice(0, 32), valor: r.valor_total }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8);

    const ufs = fat.por_uf
      .map((r) => ({ label: String(r.uf || r.estado || '—'), valor: r.valor_total }))
      .sort((a, b) => b.valor - a.valor).slice(0, 12);

    return {
      kpis: {
        faturamento,
        delta_pct: delta(faturamento, faturamentoAnt) * 100,
        meta,
        meta_pct: safeDiv(faturamento, meta) * 100,
        ticket_medio: k.ticket_medio || safeDiv(faturamento, notas),
        qtd_notas: notas,
        desconto_pct: safeDiv(desconto, faturamento + desconto) * 100,
      },
      series: { faturamento_meta },
      breakdowns: { revendas, produtos, ufs },
      status: statusFrom(qFat, enabled, fatP.partial),
    };
  }, [qFat.data, qFatAnt.data, qFat.isLoading, qFat.isFetching, qFat.isError, enabled]);

  return {
    data: enabled ? data : EMPTY,
    loading: enabled && queries.some((q) => q.isLoading),
    refetch: () => Promise.all(queries.map((q) => q.refetch())),
    range,
  };
}
