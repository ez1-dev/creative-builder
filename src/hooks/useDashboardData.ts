import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

interface DashboardLike {
  kpis?: Record<string, any>;
  [k: string]: any;
}

interface ListLike<T = any> {
  dados?: T[];
  total_paginas?: number;
  total_registros?: number;
  pagina?: number;
  [k: string]: any;
}

interface UseDashboardDataOptions<F extends Record<string, any>> {
  dashboardEndpoint: string;
  listEndpoint?: string;
  filtros: F;
  pageSize?: number;
  /** Auto-buscar ao montar e quando filtros mudarem (default false — controlado pelo dev) */
  autoSearch?: boolean;
  /** Timeout em ms para abortar requisição (default 60s) */
  timeoutMs?: number;
}

interface UseDashboardDataReturn<D, T> {
  dashboard: D | null;
  loading: boolean;
  error: string | null;

  dados: T[];
  pagina: number;
  setPagina: (p: number) => void;
  totalPaginas: number;
  totalRegistros: number;
  loadingDados: boolean;
  errorDados: string | null;

  search: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook genérico para páginas dashboard que combinam:
 * - Endpoint *-dashboard: KPIs + gráficos globais (sem paginação)
 * - Endpoint *-list: dados paginados para a tabela
 *
 * Mantém o padrão de "KPIs sempre globais, tabela sempre paginada".
 *
 * @example
 * const {
 *   dashboard, loading, error,
 *   dados, pagina, setPagina, totalPaginas, totalRegistros,
 *   search, refresh,
 * } = useDashboardData({
 *   dashboardEndpoint: '/api/painel-compras-dashboard',
 *   listEndpoint: '/api/painel-compras-list',
 *   filtros,
 *   pageSize: 50,
 * });
 */
export function useDashboardData<D extends DashboardLike, T = any, F extends Record<string, any> = Record<string, any>>(
  opts: UseDashboardDataOptions<F>,
): UseDashboardDataReturn<D, T> {
  const { dashboardEndpoint, listEndpoint, filtros, pageSize = 50, autoSearch = false, timeoutMs = 60_000 } = opts;

  const [dashboard, setDashboard] = useState<D | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dados, setDados] = useState<T[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [loadingDados, setLoadingDados] = useState(false);
  const [errorDados, setErrorDados] = useState<string | null>(null);

  const abortDashRef = useRef<AbortController | null>(null);
  const abortListRef = useRef<AbortController | null>(null);

  const fetchDashboard = useCallback(async () => {
    abortDashRef.current?.abort();
    const ctrl = new AbortController();
    abortDashRef.current = ctrl;
    setLoading(true);
    setError(null);
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await api.get<D>(dashboardEndpoint, filtros);
      clearTimeout(t);
      if (ctrl.signal.aborted) return;
      setDashboard(res);
    } catch (e: any) {
      clearTimeout(t);
      if (ctrl.signal.aborted) return;
      setError(e?.message ?? 'Erro ao carregar dashboard');
      setDashboard(null);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dashboardEndpoint, JSON.stringify(filtros), timeoutMs]);

  const fetchList = useCallback(async (paginaAlvo: number) => {
    if (!listEndpoint) return;
    abortListRef.current?.abort();
    const ctrl = new AbortController();
    abortListRef.current = ctrl;
    setLoadingDados(true);
    setErrorDados(null);
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await api.get<ListLike<T>>(listEndpoint, { ...filtros, pagina: paginaAlvo, page_size: pageSize });
      clearTimeout(t);
      if (ctrl.signal.aborted) return;
      setDados(res?.dados ?? []);
      setTotalPaginas(res?.total_paginas ?? 0);
      setTotalRegistros(res?.total_registros ?? 0);
    } catch (e: any) {
      clearTimeout(t);
      if (ctrl.signal.aborted) return;
      setErrorDados(e?.message ?? 'Erro ao carregar dados');
      setDados([]);
    } finally {
      if (!ctrl.signal.aborted) setLoadingDados(false);
    }
  }, [listEndpoint, JSON.stringify(filtros), pageSize, timeoutMs]);

  const search = useCallback(async () => {
    setPagina(1);
    await Promise.all([fetchDashboard(), fetchList(1)]);
  }, [fetchDashboard, fetchList]);

  const refresh = search;

  useEffect(() => {
    if (listEndpoint) fetchList(pagina);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina]);

  useEffect(() => {
    if (autoSearch) search();
    return () => {
      abortDashRef.current?.abort();
      abortListRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    dashboard, loading, error,
    dados, pagina, setPagina, totalPaginas, totalRegistros, loadingDados, errorDados,
    search, refresh,
  };
}
