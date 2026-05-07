/**
 * Provider que expõe os datasets de uma página alvo (KPIs, séries, linhas
 * e filtros) para os widgets injetados via UserWidgetsSlot.
 *
 * Uso:
 * <PageDataProvider
 *   pageKey="painel-compras"
 *   kpis={dashboard?.kpis}
 *   series={{ compras_por_mes: dashboard?.compras_por_mes, ... }}
 *   rows={dados}
 *   filtros={filtros}
 * >
 *   <UserWidgetsSlot section="kpis" />
 * </PageDataProvider>
 */
import { createContext, ReactNode, useContext, useMemo } from 'react';
import { getPage, type BiPageDef } from './pageRegistry';

export interface PageDataValue {
  pageKey: string;
  page?: BiPageDef;
  kpis: Record<string, any>;
  series: Record<string, any>;
  rows: any[];
  filtros: Record<string, any>;
}

const PageDataCtx = createContext<PageDataValue | null>(null);

export function PageDataProvider({
  pageKey, kpis, series, rows, filtros, children,
}: {
  pageKey: string;
  kpis?: Record<string, any> | null;
  series?: Record<string, any> | null;
  rows?: any[] | null;
  filtros?: Record<string, any> | null;
  children: ReactNode;
}) {
  const value = useMemo<PageDataValue>(() => ({
    pageKey,
    page: getPage(pageKey),
    kpis: kpis ?? {},
    series: series ?? {},
    rows: rows ?? [],
    filtros: filtros ?? {},
  }), [pageKey, kpis, series, rows, filtros]);
  return <PageDataCtx.Provider value={value}>{children}</PageDataCtx.Provider>;
}

export function usePageData(): PageDataValue | null {
  return useContext(PageDataCtx);
}
