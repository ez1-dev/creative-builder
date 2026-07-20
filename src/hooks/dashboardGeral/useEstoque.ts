import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { api, type EstoqueMinMaxResponse } from '@/lib/api';
import { statusFrom, num, safeDiv, type ModStatus } from './shared';
import { EstoqueMinMaxResponseSchema, EMPTY_ESTOQUE } from '@/lib/dashboardGeral/schemas/estoque';
import { parseOrEmpty } from '@/lib/dashboardGeral/schemas/_utils';

export interface EstoqueData {
  kpis: {
    total_itens: number;
    itens_abaixo_min: number;
    itens_acima_max: number;
    sem_politica: number;
    itens_ok: number;
    ruptura_pct: number;
  };
  rupturas: Array<{ codigo: string; descricao: string; saldo: number; minimo: number; falta: number }>;
  status: ModStatus;
}

const EMPTY: EstoqueData = {
  kpis: { total_itens: 0, itens_abaixo_min: 0, itens_acima_max: 0, sem_politica: 0, itens_ok: 0, ruptura_pct: 0 },
  rupturas: [],
  status: 'idle',
};

export function useEstoque(enabled: boolean) {
  const q = useQuery({
    queryKey: ['dg-est', 'minmax'],
    queryFn: () => api.get<EstoqueMinMaxResponse>('/api/estoque-min-max', { pagina: 1, tamanho_pagina: 2000 }),
    enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false,
  });

  const data: EstoqueData = useMemo(() => {
    const parsed = parseOrEmpty(EstoqueMinMaxResponseSchema, q.data, EMPTY_ESTOQUE, 'estoque');
    const d = parsed.data;

    const rup: EstoqueData['rupturas'] = [];
    d.dados.forEach((r) => {
      if (r.estoque_minimo > 0 && r.saldo_atual < r.estoque_minimo) {
        rup.push({
          codigo: r.codigo || '—',
          descricao: r.descricao || '—',
          saldo: r.saldo_atual,
          minimo: r.estoque_minimo,
          falta: r.estoque_minimo - r.saldo_atual,
        });
      }
    });
    rup.sort((a, b) => b.falta - a.falta);

    const total = d.total_registros || d.dados.length;
    const abaixo = d.resumo.abaixo_minimo || rup.length;

    return {
      kpis: {
        total_itens: total,
        itens_abaixo_min: abaixo,
        itens_acima_max: d.resumo.acima_maximo,
        sem_politica: d.resumo.sem_politica,
        itens_ok: d.resumo.ok,
        ruptura_pct: safeDiv(abaixo, total) * 100,
      },
      rupturas: rup.slice(0, 10),
      status: statusFrom(q, enabled, parsed.partial),
    };
  }, [q.data, q.isLoading, q.isFetching, q.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && q.isLoading, refetch: () => q.refetch() };
}
