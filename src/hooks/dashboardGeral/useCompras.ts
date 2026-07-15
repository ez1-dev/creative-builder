import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { api, type PainelComprasDashboardResponse } from '@/lib/api';
import { rangeFor, num, labelAnomes, anomesToDate, statusFrom, type Periodo, type ModStatus } from './shared';

export interface ComprasData {
  kpis: {
    valor_comprado: number;
    valor_pendente: number;
    total_ocs: number;
    fornecedores: number;
    valor_atrasado: number;
  };
  series: { compras_mes: Array<{ label: string; valor: number }> };
  breakdowns: {
    por_tipo: Array<{ label: string; valor: number }>;
    top_fornecedores: Array<{ label: string; valor: number }>;
    situacao: Array<{ label: string; valor: number }>;
  };
  status: ModStatus;
}

const EMPTY: ComprasData = {
  kpis: { valor_comprado: 0, valor_pendente: 0, total_ocs: 0, fornecedores: 0, valor_atrasado: 0 },
  series: { compras_mes: [] },
  breakdowns: { por_tipo: [], top_fornecedores: [], situacao: [] },
  status: 'idle',
};

export function useCompras(periodo: Periodo, enabled: boolean) {
  const range = useMemo(() => rangeFor(periodo), [periodo]);
  const params = useMemo(() => ({
    data_ini: anomesToDate(range.ini),
    data_fim: anomesToDate(range.fim, true),
  }), [range]);

  const [q] = useQueries({
    queries: [{
      queryKey: ['dg-compras', params.data_ini, params.data_fim],
      queryFn: () => api.get<PainelComprasDashboardResponse>('/api/painel-compras-dashboard', params),
      enabled, retry: 0, staleTime: 5 * 60 * 1000,
    }],
  });

  const data: ComprasData = useMemo(() => {
    const d: any = q.data ?? {};
    const k = d.kpis ?? {};
    const g = d.graficos ?? {};

    const compras_mes = ((g.por_mes ?? []) as any[]).slice(-12).map((r) => ({
      label: labelAnomes(String(r.mes ?? r.anomes ?? '').replace(/\D/g, '').slice(0, 6)),
      valor: num(r.valor ?? r.valor_total),
    }));

    const por_tipo = ((g.por_tipo_despesa ?? []) as any[])
      .map((r) => ({ label: String(r.tipo_despesa ?? r.tipo ?? r.label ?? '—').slice(0, 22), valor: num(r.valor ?? r.valor_total) }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8);

    const top_fornecedores = ((g.por_fornecedor ?? g.top_fornecedores ?? []) as any[])
      .map((r) => ({ label: String(r.fornecedor ?? r.nome ?? '—').slice(0, 28), valor: num(r.valor ?? r.valor_total) }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8);

    const situacao = ((g.por_situacao ?? g.situacao ?? []) as any[])
      .map((r) => ({ label: String(r.situacao ?? r.status ?? '—'), valor: num(r.valor ?? r.quantidade ?? r.qtd) }))
      .sort((a, b) => b.valor - a.valor).slice(0, 6);

    return {
      kpis: {
        valor_comprado: num(k.valor_comprado),
        valor_pendente: num(k.valor_pendente),
        total_ocs: num(k.quantidade_ocs),
        fornecedores: num(k.quantidade_fornecedores),
        valor_atrasado: num(k.valor_atrasado ?? k.valor_vencido ?? 0),
      },
      series: { compras_mes },
      breakdowns: { por_tipo, top_fornecedores, situacao },
      status: statusFrom(q, enabled),
    };
  }, [q.data, q.isLoading, q.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && q.isLoading, refetch: () => q.refetch(), range };
}
