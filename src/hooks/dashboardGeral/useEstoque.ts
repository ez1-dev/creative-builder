import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type EstoqueMinMaxResponse } from '@/lib/api';
import { statusFrom, num, type ModStatus } from './shared';

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
    enabled, retry: 0, staleTime: 10 * 60 * 1000,
  });

  const data: EstoqueData = useMemo(() => {
    const d: any = q.data ?? {};
    const rows: any[] = d.dados ?? [];
    const resumo: any = d.resumo ?? {};

    const rup: EstoqueData['rupturas'] = [];
    rows.forEach((r) => {
      const saldo = num(r.saldo_atual ?? r.saldo);
      const min = num(r.estoque_minimo ?? r.minimo);
      if (min > 0 && saldo < min) {
        rup.push({
          codigo: String(r.codigo ?? r.codpro ?? '—'),
          descricao: String(r.descricao ?? r.despro ?? '—').slice(0, 40),
          saldo,
          minimo: min,
          falta: min - saldo,
        });
      }
    });
    rup.sort((a, b) => b.falta - a.falta);

    const total = num(d.total_registros ?? rows.length);
    const abaixo = num(resumo.abaixo_minimo ?? rup.length);
    const acima = num(resumo.acima_maximo);
    const semPol = num(resumo.sem_politica);
    const ok = num(resumo.ok);

    return {
      kpis: {
        total_itens: total,
        itens_abaixo_min: abaixo,
        itens_acima_max: acima,
        sem_politica: semPol,
        itens_ok: ok,
        ruptura_pct: total ? (abaixo / total) * 100 : 0,
      },
      rupturas: rup.slice(0, 10),
      status: statusFrom(q, enabled),
    };
  }, [q.data, q.isLoading, q.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && q.isLoading, refetch: () => q.refetch() };
}
