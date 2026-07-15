import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fetchDreRealizadoResumo } from '@/lib/bi/dreConfiguravelApi';
import { rangeFor, num, labelAnomes, anomesToDate, statusFrom, type Periodo, type ModStatus } from './shared';

export interface FinanceiroData {
  kpis: {
    receita: number;
    custos: number;
    despesas: number;
    resultado: number;
    margem_pct: number;
    a_pagar: number;
    a_receber: number;
    inadimplencia: number;
  };
  series: {
    resultado_mes: Array<{ label: string; valor: number; receita?: number }>;
  };
  status: ModStatus;
}

const EMPTY: FinanceiroData = {
  kpis: { receita: 0, custos: 0, despesas: 0, resultado: 0, margem_pct: 0, a_pagar: 0, a_receber: 0, inadimplencia: 0 },
  series: { resultado_mes: [] },
  status: 'idle',
};

export function useFinanceiro(periodo: Periodo, enabled: boolean) {
  const range = useMemo(() => rangeFor(periodo), [periodo]);
  const dataIni = anomesToDate(range.ini);
  const dataFim = anomesToDate(range.fim, true);

  const queries = useQueries({
    queries: [
      {
        queryKey: ['dg-fin', 'dre', dataIni, dataFim],
        queryFn: () => fetchDreRealizadoResumo({ data_ini: dataIni, data_fim: dataFim, tipo: 'MENSAL' }),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dg-fin', 'cpagar'],
        queryFn: () => api.get<any>('/api/contas-pagar', { pagina: 1, tamanho_pagina: 1 }),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dg-fin', 'creceber'],
        queryFn: () => api.get<any>('/api/contas-receber', { pagina: 1, tamanho_pagina: 1 }),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
    ],
  });
  const [qDre, qPagar, qReceber] = queries;

  const data: FinanceiroData = useMemo(() => {
    const dre: any = qDre.data ?? {};
    const totais = dre.totais ?? {};
    const mensal: any[] = Array.isArray(dre.mensal) ? dre.mensal : [];
    const resultado_mes = mensal.slice(-12).map((r) => ({
      label: labelAnomes(String(r.anomes ?? '').slice(0, 6)),
      valor: num(r.resultado_dre),
      receita: num(r.receita_operacional),
    }));
    const cp: any = qPagar.data ?? {};
    const cr: any = qReceber.data ?? {};
    return {
      kpis: {
        receita: num(totais.receita_operacional),
        custos: num(totais.custos),
        despesas: num(totais.despesas),
        resultado: num(totais.resultado_dre),
        margem_pct: num(totais.margem_pct),
        a_pagar: num(cp.total_valor ?? cp.valor_total ?? cp.resumo?.valor_total),
        a_receber: num(cr.total_valor ?? cr.valor_total ?? cr.resumo?.valor_total),
        inadimplencia: num(cr.valor_vencido ?? cr.resumo?.valor_vencido),
      },
      series: { resultado_mes },
      status: statusFrom(qDre, enabled),
    };
  }, [qDre.data, qPagar.data, qReceber.data, qDre.isLoading, qDre.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && queries.some((q) => q.isLoading), refetch: () => Promise.all(queries.map((q) => q.refetch())), range };
}
