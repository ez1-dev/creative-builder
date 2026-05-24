// Classes Tailwind padronizadas para dashboards responsivos (mobile→desktop).
// Use-as ao invés de hardcodar grids/paddings em cada página.

export const biResponsive = {
  pagePad: 'p-3 md:p-4 lg:p-6 space-y-3 md:space-y-4',
  kpiGrid: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3',
  kpiGrid4: 'grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3',
  chartGrid2: 'grid grid-cols-1 lg:grid-cols-2 gap-3',
  chartGrid3: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3',
  // 2 charts + painel lateral em xl
  chartGrid2Plus1: 'grid grid-cols-1 xl:grid-cols-3 gap-3',
  tableWrap: 'overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0',
} as const;
