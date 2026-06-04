// BI Components Library — barrel
export * from './utils/formatters';
export * from './utils/chartHelpers';
export * from './utils/dashboardHelpers';

export * from './states/LoadingState';
export * from './states/EmptyState';
export * from './states/ErrorState';
export * from './states/NoDataState';

export * from './badges/StatusBadge';

export * from './kpis/KpiCard';
export * from './kpis/KpiGrid';
export * from './kpis/KpiComparisonCard';
export * from './kpis/KpiVariationCard';
export * from './kpis/KpiStatusCard';

export * from './charts/ChartCardShell';
export * from './charts/BarChartCard';
export * from './charts/HorizontalBarChartCard';
export * from './charts/LineChartCard';
export * from './charts/AreaChartCard';
export * from './charts/PieChartCard';
export * from './charts/DonutChartCard';
export * from './charts/StackedBarChartCard';
export * from './charts/ComboChartCard';
export * from './charts/RankingChartCard';
export * from './charts/GaugeChartCard';
export * from './charts/ProgressChartCard';
export * from './charts/TreemapChartCard';
export * from './charts/RadarChartCard';
export * from './charts/ScatterChartCard';
export * from './charts/HeatmapChartCard';
export * from './charts/WaterfallChartCard';
export * from './charts/FunnelChartCard';
export * from './charts/BrazilMapCard';
export * from './charts/SparklineCard';
export * from './charts/CalendarHeatmapCard';

export * from './tree/TreeView';
export * from './layout/Timeline';
export * from './kpis/KpiSparklineCard';
export * from './kpis/KpiTargetCard';
export * from './templates/ComprasDashboardTemplate';
export * from './ai/ComponentSuggester';

export * from './tables/DataTableBI';
export * from './tables/DrillDownTable';
export * from './tables/RankingTable';
export * from './tables/SummaryTable';
export * from './tables/ComparisonTable';

export * from './filters/DashboardFilters';
export * from './filters/FilterBar';
export * from './filters/AdvancedFiltersPanel';
export * from './filters/FilterChips';
export * from './filters/DateRangeFilter';
export * from './filters/SelectFilter';
export * from './filters/MultiSelectFilter';
export * from './filters/SearchFilter';

export * from './drill/DrillBreadcrumb';
export * from './drill/DrillLevelSelector';
export * from './drill/DrillSheet';
export * from './utils/responsive';

export * from './layout/DashboardLayout';
export * from './layout/DashboardTabs';

// runtime: aplicar componentes em páginas reais
export * from './runtime/ApplyComponentDialog';
export * from './runtime/ApplyComponentButton';
export * from './runtime/UserWidgetsSlot';
export * from './runtime/UserWidgetFrame';
export * from './runtime/MyWidgetsPanel';
export * from './runtime/BiAutoSlots';
