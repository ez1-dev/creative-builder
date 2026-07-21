import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { api, type ContasPagarResponse, type ContasReceberResponse } from '@/lib/api';
import { fetchDreRealizadoResumo } from '@/lib/bi/dreConfiguravelApi';
import { useContabilConfiguracao } from '@/hooks/contabil/useContabilConfiguracao';
import { rangeFor, num, labelAnomes, anomesToDate, statusFrom, type Periodo, type ModStatus } from './shared';
import { DreResumoResponseSchema, EMPTY_DRE, ContasResponseSchema, EMPTY_CONTAS } from '@/lib/dashboardGeral/schemas/financeiro';
import { parseOrEmpty } from '@/lib/dashboardGeral/schemas/_utils';

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
  const { data: cfgContabil } = useContabilConfiguracao();
  const dreModeloId = cfgContabil?.dre_modelo_padrao_id ?? null;

  const queries = useQueries({
    queries: [
      {
        queryKey: ['dg-fin', 'dre', dataIni, dataFim, dreModeloId],
        queryFn: () => fetchDreRealizadoResumo({ data_ini: dataIni, data_fim: dataFim, tipo: 'MENSAL', modelo_id: dreModeloId! }),
        enabled: enabled && !!dreModeloId, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false,
      },
      {
        queryKey: ['dg-fin', 'cpagar', dataIni, dataFim],
        queryFn: () => api.get<ContasPagarResponse>('/api/contas-pagar', {
          pagina: 1, tamanho_pagina: 1,
          data_vencimento_ini: dataIni, data_vencimento_fim: dataFim,
          excluir_pagos: true,
        }),
        enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false,
      },
      {
        queryKey: ['dg-fin', 'creceber', dataIni, dataFim],
        queryFn: () => api.get<ContasReceberResponse>('/api/contas-receber', {
          pagina: 1, tamanho_pagina: 1,
          data_vencimento_ini: dataIni, data_vencimento_fim: dataFim,
          excluir_pagos: true,
        }),
        enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false,
      },
    ],
  });
  const [qDre, qPagar, qReceber] = queries;

  const data: FinanceiroData = useMemo(() => {
    const dreP = parseOrEmpty(DreResumoResponseSchema, qDre.data, EMPTY_DRE, 'financeiro/dre');
    const cpP = parseOrEmpty(ContasResponseSchema, qPagar.data, EMPTY_CONTAS, 'financeiro/pagar');
    const crP = parseOrEmpty(ContasResponseSchema, qReceber.data, EMPTY_CONTAS, 'financeiro/receber');
    const totais = dreP.data.totais;
    const resultado_mes = dreP.data.mensal.slice(-12).map((r) => ({
      label: labelAnomes(String(r.anomes).slice(0, 6)),
      valor: r.resultado_dre,
      receita: r.receita_operacional,
    }));
    return {
      kpis: {
        receita: totais.receita_operacional,
        custos: totais.custos,
        despesas: totais.despesas,
        resultado: totais.resultado_dre,
        margem_pct: totais.margem_pct,
        a_pagar: cpP.data.resumo.valor_aberto_total,
        a_receber: crP.data.resumo.valor_aberto_total,
        inadimplencia: crP.data.resumo.valor_vencido_total,
      },
      series: { resultado_mes },
      status: statusFrom(qDre, enabled, dreP.partial),
    };
  }, [qDre.data, qPagar.data, qReceber.data, qDre.isLoading, qDre.isFetching, qDre.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && queries.some((q) => q.isLoading), refetch: () => Promise.all(queries.map((q) => q.refetch())), range };
}
