import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { api, type PainelComprasDashboardResponse } from '@/lib/api';
import { rangeFor, num, labelAnomes, anomesToDate, safeDiv, statusFrom, type Periodo, type ModStatus } from './shared';
import { PainelComprasResponseSchema, EMPTY_COMPRAS } from '@/lib/dashboardGeral/schemas/compras';
import { parseOrEmpty } from '@/lib/dashboardGeral/schemas/_utils';

export interface ComprasData {
  kpis: {
    valor_comprado: number;
    valor_pendente: number;
    valor_atrasado: number;
    total_ocs: number;
    ocs_atrasadas: number;
    fornecedores: number;
    ticket_medio_oc: number;
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
  kpis: { valor_comprado: 0, valor_pendente: 0, valor_atrasado: 0, total_ocs: 0, ocs_atrasadas: 0, fornecedores: 0, ticket_medio_oc: 0 },
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
      enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false,
    }],
  });

  const data: ComprasData = useMemo(() => {
    const parsed = parseOrEmpty(PainelComprasResponseSchema, q.data, EMPTY_COMPRAS, 'compras');
    const d = parsed.data;
    const k = d.kpis;
    const g = d.graficos;

    const compras_mes = g.por_mes.slice(-12).map((r) => ({
      label: labelAnomes(String(r.mes || r.anomes).replace(/\D/g, '').slice(0, 6)),
      valor: r.valor,
    }));

    const por_tipo = g.por_tipo_despesa
      .map((r) => ({ label: String(r.tipo_despesa || r.tipo || r.label || '—').slice(0, 22), valor: r.valor }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8);

    const top_fornecedores = g.por_fornecedor
      .map((r) => ({ label: String(r.fornecedor || r.nome || r.razao_social || '—').slice(0, 28), valor: r.valor }))
      .sort((a, b) => b.valor - a.valor).slice(0, 10);

    const itensAtrasados = k.itens_atrasados;
    const itensPendentes = k.itens_pendentes;
    const itensOnTime = Math.max(0, itensPendentes - itensAtrasados);
    const situacao: Array<{ label: string; valor: number }> = [
      { label: 'Atrasadas', valor: itensAtrasados },
      { label: 'No prazo', valor: itensOnTime },
    ];

    const valorPendente = k.valor_pendente_total;
    const ocsAtrasadas = k.ocs_atrasadas;
    const totalOcs = k.total_ocs;
    const valorAtrasado = valorPendente * safeDiv(ocsAtrasadas, totalOcs);

    return {
      kpis: {
        valor_comprado: k.valor_comprado,
        valor_pendente: valorPendente,
        valor_atrasado: valorAtrasado,
        total_ocs: totalOcs,
        ocs_atrasadas: ocsAtrasadas,
        fornecedores: k.total_fornecedores,
        ticket_medio_oc: k.ticket_medio_oc,
      },
      series: { compras_mes },
      breakdowns: { por_tipo, top_fornecedores, situacao },
      status: statusFrom(q, enabled, parsed.partial),
    };
  }, [q.data, q.isLoading, q.isFetching, q.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && q.isLoading, refetch: () => q.refetch(), range };
}
