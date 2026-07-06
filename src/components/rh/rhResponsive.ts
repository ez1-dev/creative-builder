/**
 * Classes Tailwind reutilizáveis para deixar as páginas RH responsivas
 * (mobile → desktop wide). Use-as no lugar de literais hardcoded em cada
 * página para manter espaçamentos, grids e wraps consistentes.
 */
export const rhResponsive = {
  /** Container de página: padding fluido + espaçamento vertical. */
  page: 'container mx-auto px-3 md:px-6 py-4 md:py-6 space-y-3 md:space-y-4',
  /** KPI grids padrão. Sobem colunas conforme largura disponível. */
  kpiGrid4: 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3',
  kpiGrid5: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3',
  kpiGrid6: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3',
  kpiGrid7: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2 md:gap-3',
  /** Grid de filtros: 1 col mobile → wrap em desktop. */
  filterGrid: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end',
  filterGrid3: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end',
  /** Wrapper de tabelas grandes com scroll horizontal em telas estreitas. */
  tableWrap: 'overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0',
  /** Toolbar de ações: quebra linha em mobile. */
  actionsWrap: 'flex flex-wrap items-center gap-2',
} as const;
