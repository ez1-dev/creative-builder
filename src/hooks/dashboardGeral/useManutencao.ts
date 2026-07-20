import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rangeFor, num, anomesToDate, type Periodo, type ModStatus } from './shared';
import { ManutencaoRowsSchema, EMPTY_MANUT } from '@/lib/dashboardGeral/schemas/manutencao';
import { parseOrEmpty } from '@/lib/dashboardGeral/schemas/_utils';

export interface ManutencaoData {
  kpis: {
    total_frota: number;
    custo_frota: number;
    total_maquinas: number;
    custo_maquinas: number;
    custo_total: number;
  };
  breakdowns: {
    por_veiculo: Array<{ label: string; valor: number }>;
    por_maquina: Array<{ label: string; valor: number }>;
    por_categoria: Array<{ label: string; valor: number }>;
  };
  status: ModStatus;
}

const EMPTY: ManutencaoData = {
  kpis: { total_frota: 0, custo_frota: 0, total_maquinas: 0, custo_maquinas: 0, custo_total: 0 },
  breakdowns: { por_veiculo: [], por_maquina: [], por_categoria: [] },
  status: 'idle',
};

async function fetchAll(table: 'manutencao_frota' | 'manutencao_maquinas', dataIni: string, dataFim: string) {
  const PAGE = 1000;
  let from = 0;
  const acc: any[] = [];
  while (true) {
    const { data, error } = await supabase.from(table).select('*').gte('data', dataIni).lte('data', dataFim).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    acc.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return acc;
}

export function useManutencao(periodo: Periodo, enabled: boolean) {
  const range = useMemo(() => rangeFor(periodo), [periodo]);
  const dIni = anomesToDate(range.ini);
  const dFim = anomesToDate(range.fim, true);

  const queries = useQueries({
    queries: [
      { queryKey: ['dg-man', 'frota', dIni, dFim], queryFn: () => fetchAll('manutencao_frota', dIni, dFim), enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false },
      { queryKey: ['dg-man', 'maq', dIni, dFim], queryFn: () => fetchAll('manutencao_maquinas', dIni, dFim), enabled, retry: 0, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, placeholderData: keepPreviousData, refetchOnWindowFocus: false },
    ],
  });
  const [qF, qM] = queries;

  const data: ManutencaoData = useMemo(() => {
    const frotaP = parseOrEmpty(ManutencaoRowsSchema, qF.data, EMPTY_MANUT, 'manutencao/frota');
    const maqP = parseOrEmpty(ManutencaoRowsSchema, qM.data, EMPTY_MANUT, 'manutencao/maquinas');
    const frota = frotaP.data;
    const maq = maqP.data;
    const custoFrota = frota.reduce((s, r) => s + r.valor, 0);
    const custoMaq = maq.reduce((s, r) => s + r.valor, 0);

    const veicMap: Record<string, number> = {};
    frota.forEach((r) => {
      const k = r.placa || r.veiculo_descricao || '—';
      veicMap[k] = (veicMap[k] || 0) + r.valor;
    });
    const por_veiculo = Object.entries(veicMap).map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor).slice(0, 10);

    const maqMap: Record<string, number> = {};
    maq.forEach((r) => {
      const k = r.maquina || '—';
      maqMap[k] = (maqMap[k] || 0) + r.valor;
    });
    const por_maquina = Object.entries(maqMap).map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor).slice(0, 10);

    const catMap: Record<string, number> = {};
    frota.forEach((r) => {
      const k = r.categoria || 'MANUTENCAO';
      catMap[k] = (catMap[k] || 0) + r.valor;
    });
    const por_categoria = Object.entries(catMap).map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor);

    const partial = frotaP.partial || maqP.partial;
    const st: ModStatus = !enabled
      ? 'idle'
      : (qF.isLoading || qM.isLoading) ? 'carregando'
      : (qF.isError || qM.isError) ? 'erro'
      : partial ? 'parcial' : 'ok';

    return {
      kpis: {
        total_frota: frota.length,
        custo_frota: custoFrota,
        total_maquinas: maq.length,
        custo_maquinas: custoMaq,
        custo_total: custoFrota + custoMaq,
      },
      breakdowns: { por_veiculo, por_maquina, por_categoria },
      status: st,
    };
  }, [qF.data, qM.data, qF.isLoading, qM.isLoading, qF.isError, qM.isError, enabled]);

  return { data: enabled ? data : EMPTY, loading: enabled && queries.some((q) => q.isLoading), refetch: () => Promise.all(queries.map((q) => q.refetch())) };
}
