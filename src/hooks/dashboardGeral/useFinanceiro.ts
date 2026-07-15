import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { api, type ContasPagarResponse, type ContasReceberResponse } from '@/lib/api';
import { fetchDreRealizadoResumo } from '@/lib/bi/dreConfiguravelApi';
import { MODELO_DRE_OFICIAL_ID } from '@/lib/contabilConfig';
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
        queryKey: ['dg-fin', 'dre', dataIni, dataFim, MODELO_DRE_OFICIAL_ID],
        queryFn: () => fetchDreRealizadoResumo({ data_ini: dataIni, data_fim: dataFim, tipo: 'MENSAL', modelo_id: MODELO_DRE_OFICIAL_ID }),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dg-fin', 'cpagar', dataIni, dataFim],
        queryFn: () => api.get<ContasPagarResponse>('/api/contas-pagar', {
          pagina: 1, tamanho_pagina: 1,
          data_vencimento_ini: dataIni, data_vencimento_fim: dataFim,
          excluir_pagos: true,
        }),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dg-fin', 'creceber', dataIni, dataFim],
        queryFn: () => api.get<ContasReceberResponse>('/api/contas-receber', {
          pagina: 1, tamanho_pagina: 1,
          data_vencimento_ini: dataIni, data_vencimento_fim: dataFim,
          excluir_pagos: true,
        }),
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
      valor: num(r.resultado_dre ?? r.resultado),
      receita: num(r.receita_operacional ?? r.receita),
    }));
    const cp: any = qPagar.data ?? {};
    const cr: any = qReceber.data ?? {};
    const rp = cp.resumo ?? {};
    const rr = cr.resumo ?? {};
    return {
      kpis: {
        receita: num(totais.receita_operacional ?? totais.receita),
        custos: num(totais.custos),
        despesas: num(totais.despesas),
        resultado: num(totais.resultado_dre ?? totais.resultado),
        margem_pct: num(totais.margem_pct ?? totais.margem),
        a_pagar: num(rp.valor_aberto_total ?? rp.valor_original_total),
        a_receber: num(rr.valor_aberto_total ?? rr.valor_original_total),
        inadimplencia: num(rr.valor_vencido_total),
      },
      series: { resultado_mes },
      status: statusFrom(qDre, enabled),
    };
  }, [qDre.data, qPagar.data, qReceber.data, qDre.isLoading, qDre.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && queries.some((q) => q.isLoading), refetch: () => Promise.all(queries.map((q) => q.refetch())), range };
}
