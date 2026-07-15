import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type EstoqueMinMaxResponse } from '@/lib/api';
import { statusFrom, num, type ModStatus } from './shared';

export interface EstoqueData {
  kpis: {
    valor_estocado: number;
    itens_abaixo_min: number;
    itens_acima_max: number;
    total_itens: number;
    ruptura_pct: number;
  };
  rupturas: Array<{ codigo: string; descricao: string; saldo: number; minimo: number }>;
  status: ModStatus;
}

const EMPTY: EstoqueData = {
  kpis: { valor_estocado: 0, itens_abaixo_min: 0, itens_acima_max: 0, total_itens: 0, ruptura_pct: 0 },
  rupturas: [],
  status: 'idle',
};

export function useEstoque(enabled: boolean) {
  const q = useQuery({
    queryKey: ['dg-est', 'minmax'],
    queryFn: () => api.get<EstoqueMinMaxResponse>('/api/estoque-min-max', { pagina: 1, tamanho_pagina: 2000 }),
    enabled, retry: 0, staleTime: 10 * 60 * 1000,
  });

  const data: EstoqueData = useMemo(() => {
    const d: any = q.data ?? {};
    const rows: any[] = d.dados ?? [];
    let abaixo = 0, acima = 0, valor = 0;
    const rup: EstoqueData['rupturas'] = [];
    rows.forEach((r) => {
      const saldo = num(r.saldo ?? r.saldo_atual ?? r.estoque);
      const min = num(r.minimo ?? r.min);
      const max = num(r.maximo ?? r.max);
      const custo = num(r.custo_unitario ?? r.custo);
      valor += saldo * custo;
      if (min > 0 && saldo < min) {
        abaixo++;
        rup.push({ codigo: String(r.codigo ?? r.codpro ?? '—'), descricao: String(r.descricao ?? r.despro ?? '—').slice(0, 40), saldo, minimo: min });
      }
      if (max > 0 && saldo > max) acima++;
    });
    rup.sort((a, b) => (a.saldo - a.minimo) - (b.saldo - b.minimo));

    return {
      kpis: {
        valor_estocado: valor,
        itens_abaixo_min: abaixo,
        itens_acima_max: acima,
        total_itens: rows.length,
        ruptura_pct: rows.length ? (abaixo / rows.length) * 100 : 0,
      },
      rupturas: rup.slice(0, 10),
      status: statusFrom(q, enabled),
    };
  }, [q.data, q.isLoading, q.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && q.isLoading, refetch: () => q.refetch() };
}
