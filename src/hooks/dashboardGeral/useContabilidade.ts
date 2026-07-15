import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getBalancoPatrimonial } from '@/lib/api';
import { fetchDreRealizadoResumo } from '@/lib/bi/dreConfiguravelApi';
import { rangeFor, num, anomesToDate, statusFrom, type Periodo, type ModStatus } from './shared';

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
  const dataFim = anomesToDate(range.fim, true);

  const queries = useQueries({
    queries: [
      {
        queryKey: ['dg-cont', 'balanco', dataFim],
        queryFn: () => getBalancoPatrimonial({ data_fim: dataFim, pagina: 1, por_pagina: 500 } as any),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dg-cont', 'dre', anomesToDate(range.ini), dataFim],
        queryFn: () => fetchDreRealizadoResumo({ data_ini: anomesToDate(range.ini), data_fim: dataFim, tipo: 'ACUMULADO' }),
        enabled, retry: 0, staleTime: 5 * 60 * 1000,
      },
    ],
  });
  const [qBal, qDre] = queries;

  const data: ContabilidadeData = useMemo(() => {
    const bal: any = qBal.data ?? {};
    const linhas: any[] = bal.dados ?? bal.linhas ?? [];
    // Agrupamento heurístico por descrição / código topo (nivel 1-2).
    const topo = linhas.filter((l) => (l.nivel ?? l.nivel_estrutura ?? 99) <= 2);
    const balancoAgg: Array<{ grupo: string; valor: number; tipo: 'A' | 'P' | 'PL' }> = topo.slice(0, 12).map((l) => {
      const desc = String(l.descricao ?? l.linha ?? l.nome ?? '—');
      const val = num(l.saldo_atual ?? l.valor ?? l.saldo);
      const tp: 'A' | 'P' | 'PL' = /patrim/i.test(desc) ? 'PL' : /passiv/i.test(desc) ? 'P' : 'A';
      return { grupo: desc, valor: val, tipo: tp };
    });

    const ativo = balancoAgg.filter((b) => b.tipo === 'A').reduce((s, b) => s + b.valor, 0);
    const passivo = balancoAgg.filter((b) => b.tipo === 'P').reduce((s, b) => s + b.valor, 0);
    const pl = balancoAgg.filter((b) => b.tipo === 'PL').reduce((s, b) => s + b.valor, 0);

    const dre: any = qDre.data ?? {};
    const totais = dre.totais ?? {};
    const dre_top = [
      { label: 'Receita', valor: num(totais.receita_operacional) },
      { label: 'Custos', valor: -Math.abs(num(totais.custos)) },
      { label: 'Despesas', valor: -Math.abs(num(totais.despesas)) },
      { label: 'Resultado', valor: num(totais.resultado_dre) },
    ];

    return {
      kpis: {
        ativo,
        passivo,
        pl,
        resultado_exercicio: num(totais.resultado_dre),
        receita: num(totais.receita_operacional),
        margem_pct: num(totais.margem_pct),
      },
      balanco: balancoAgg,
      dre_top,
      status: statusFrom(qBal, enabled),
    };
  }, [qBal.data, qDre.data, qBal.isLoading, qBal.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && queries.some((q) => q.isLoading), refetch: () => Promise.all(queries.map((q) => q.refetch())), range };
}
