import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getBalancoPatrimonial } from '@/lib/api';
import { fetchDreRealizadoResumo } from '@/lib/bi/dreConfiguravelApi';
import { MODELO_DRE_OFICIAL_ID } from '@/lib/contabilConfig';
import { rangeFor, num, anomesToDate, statusFrom, type Periodo, type ModStatus } from './shared';
import { BalancoResponseSchema, EMPTY_BALANCO } from '@/lib/dashboardGeral/schemas/contabilidade';
import { DreResumoResponseSchema, EMPTY_DRE } from '@/lib/dashboardGeral/schemas/financeiro';
import { parseOrEmpty } from '@/lib/dashboardGeral/schemas/_utils';

export interface ContabilidadeData {
  kpis: {
    ativo: number;
    passivo: number;
    pl: number;
    resultado_exercicio: number;
    receita: number;
    margem_pct: number;
  };
  balanco: Array<{ grupo: string; valor: number; tipo: 'A' | 'P' | 'PL' }>;
  dre_top: Array<{ label: string; valor: number }>;
  status: ModStatus;
}

const EMPTY: ContabilidadeData = {
  kpis: { ativo: 0, passivo: 0, pl: 0, resultado_exercicio: 0, receita: 0, margem_pct: 0 },
  balanco: [],
  dre_top: [],
  status: 'idle',
};

export function useContabilidade(periodo: Periodo, enabled: boolean) {
  const range = useMemo(() => rangeFor(periodo), [periodo]);
  const dataIni = anomesToDate(range.ini);
  const dataFim = anomesToDate(range.fim, true);

  const queries = useQueries({
    queries: [
      {
        queryKey: ['dg-cont', 'balanco', range.ini, range.fim],
        queryFn: () => getBalancoPatrimonial({
          anomes_ini: range.ini,
          anomes_fim: range.fim,
          pagina: 1,
          por_pagina: 500,
        }),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dg-cont', 'dre', dataIni, dataFim, MODELO_DRE_OFICIAL_ID],
        queryFn: () => fetchDreRealizadoResumo({ data_ini: dataIni, data_fim: dataFim, tipo: 'ACUMULADO', modelo_id: MODELO_DRE_OFICIAL_ID }),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
    ],
  });
  const [qBal, qDre] = queries;

  const data: ContabilidadeData = useMemo(() => {
    const balP = parseOrEmpty(BalancoResponseSchema, qBal.data, EMPTY_BALANCO, 'contabilidade/balanco');
    const dreP = parseOrEmpty(DreResumoResponseSchema, qDre.data, EMPTY_DRE, 'contabilidade/dre');
    const linhas = balP.data.dados;

    const grupoMap: Record<string, { valor: number; tipo: 'A' | 'P' | 'PL' }> = {};
    linhas.forEach((l) => {
      const grupo = l.grupo.trim();
      if (!grupo) return;
      const up = grupo.toUpperCase();
      const tp: 'A' | 'P' | 'PL' = up.includes('PATRIM') ? 'PL' : up.startsWith('PASSIV') ? 'P' : 'A';
      if (!grupoMap[grupo]) grupoMap[grupo] = { valor: 0, tipo: tp };
      grupoMap[grupo].valor += l.saldo_atual;
    });
    const balancoAgg = Object.entries(grupoMap)
      .map(([grupo, v]) => ({ grupo, valor: v.valor, tipo: v.tipo }))
      .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));

    const ativo = balancoAgg.filter((b) => b.tipo === 'A').reduce((s, b) => s + b.valor, 0);
    const passivo = balancoAgg.filter((b) => b.tipo === 'P').reduce((s, b) => s + b.valor, 0);
    const pl = balancoAgg.filter((b) => b.tipo === 'PL').reduce((s, b) => s + b.valor, 0);

    const totais = dreP.data.totais;
    const dre_top = [
      { label: 'Receita', valor: totais.receita_operacional },
      { label: 'Custos', valor: -Math.abs(totais.custos) },
      { label: 'Despesas', valor: -Math.abs(totais.despesas) },
      { label: 'Resultado', valor: totais.resultado_dre },
    ];

    return {
      kpis: {
        ativo,
        passivo,
        pl,
        resultado_exercicio: totais.resultado_dre,
        receita: totais.receita_operacional,
        margem_pct: totais.margem_pct,
      },
      balanco: balancoAgg.slice(0, 12),
      dre_top,
      status: statusFrom(qBal, enabled, balP.partial || dreP.partial),
    };
  }, [qBal.data, qDre.data, qBal.isLoading, qBal.isFetching, qBal.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && queries.some((q) => q.isLoading), refetch: () => Promise.all(queries.map((q) => q.refetch())), range };
}
