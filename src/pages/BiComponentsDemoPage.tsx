import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DollarSign, Package, ShoppingCart, Users, TrendingUp, Layers, Palette, Filter, Table2, BarChart3, MousePointerClick, AlertCircle, Tag, LayoutDashboard, Map, Network, Clock, Sparkles } from 'lucide-react';
import {
  // layout
  DashboardPage, DashboardHeader, DashboardSection, DashboardGrid, ChartGrid, DashboardTabs,
  Timeline,
  // kpis
  KpiCard, KpiGrid, KpiComparisonCard, KpiVariationCard, KpiStatusCard, KpiSparklineCard, KpiTargetCard,
  // charts
  BarChartCard, HorizontalBarChartCard, LineChartCard, AreaChartCard, PieChartCard,
  DonutChartCard, StackedBarChartCard, ComboChartCard, RankingChartCard,
  GaugeChartCard, ProgressChartCard,
  TreemapChartCard, RadarChartCard, ScatterChartCard, HeatmapChartCard,
  WaterfallChartCard, FunnelChartCard, SparklineCard, CalendarHeatmapCard,
  // maps
  BrazilMapCard,
  // tree
  TreeView,
  // tables
  DataTableBI, DrillDownTable, RankingTable, SummaryTable, ComparisonTable,
  // filters
  DashboardFilters, FilterBar, AdvancedFiltersPanel, FilterChips,
  DateRangeFilter, SelectFilter, MultiSelectFilter, SearchFilter,
  // drill
  DrillBreadcrumb, DrillLevelSelector,
  // states
  LoadingState, EmptyState, ErrorState, NoDataState,
  // badges
  StatusBadge,
  // templates
  ComprasDashboardTemplate,
  // ai
  ComponentSuggester,
  // utils
  formatCurrency, formatNumber, abbreviateNumber,
  type Column,
  type BiStatus,
} from '@/components/bi';

// ============ MOCK DATA ============
const mesesData = [
  { label: 'Jan', valor: 1240000, recebido: 980000, pendente: 260000 },
  { label: 'Fev', valor: 1380000, recebido: 1150000, pendente: 230000 },
  { label: 'Mar', valor: 1620000, recebido: 1390000, pendente: 230000 },
  { label: 'Abr', valor: 1490000, recebido: 1230000, pendente: 260000 },
  { label: 'Mai', valor: 1710000, recebido: 1480000, pendente: 230000 },
  { label: 'Jun', valor: 1890000, recebido: 1620000, pendente: 270000 },
];
const fornecedoresRanking = [
  { label: 'Acme Aço LTDA', valor: 2180000 },
  { label: 'Metalúrgica Sul', valor: 1740000 },
  { label: 'Insumos Brasil', valor: 1320000 },
  { label: 'Ferro & Cia', valor: 980000 },
  { label: 'Distribuidora XYZ', valor: 740000 },
  { label: 'TechParts SA', valor: 610000 },
  { label: 'Forja Nacional', valor: 480000 },
];
const tiposDespesa = [
  { label: 'Matéria Prima', valor: 4800000 },
  { label: 'Serviços', valor: 1200000 },
  { label: 'Manutenção', valor: 760000 },
  { label: 'Logística', valor: 540000 },
  { label: 'Outros', valor: 280000 },
];
const drillRows = [
  { tipo: 'Matéria Prima', centro: 'Produção', fornecedor: 'Acme Aço LTDA', valor_liquido: 1280000 },
  { tipo: 'Matéria Prima', centro: 'Produção', fornecedor: 'Metalúrgica Sul', valor_liquido: 940000 },
  { tipo: 'Matéria Prima', centro: 'Manutenção', fornecedor: 'Ferro & Cia', valor_liquido: 380000 },
  { tipo: 'Serviços', centro: 'Administrativo', fornecedor: 'TechParts SA', valor_liquido: 410000 },
  { tipo: 'Serviços', centro: 'Produção', fornecedor: 'Insumos Brasil', valor_liquido: 620000 },
  { tipo: 'Logística', centro: 'Expedição', fornecedor: 'Distribuidora XYZ', valor_liquido: 540000 },
];
const tableRows = drillRows.map((r, i) => ({ id: i + 1, ...r, status: i % 3 === 0 ? 'recebido' : i % 3 === 1 ? 'pendente' : 'parcial' }));
const stackedSeries = [
  { dataKey: 'recebido', label: 'Recebido' },
  { dataKey: 'pendente', label: 'Pendente' },
];
const fornecedorOptions = fornecedoresRanking.map((f) => ({ value: f.label, label: f.label }));

// ============ SECTIONS ============
const SECTIONS = [
  { id: 'dashboard-pronto', label: 'Dashboard Pronto', icon: Sparkles },
  { id: 'layout',  label: 'Layout',     icon: LayoutDashboard },
  { id: 'kpis',    label: 'KPIs',       icon: TrendingUp },
  { id: 'charts',  label: 'Gráficos',   icon: BarChart3 },
  { id: 'maps',    label: 'Mapas',      icon: Map },
  { id: 'tree',    label: 'Hierarquia', icon: Network },
  { id: 'tables',  label: 'Tabelas',    icon: Table2 },
  { id: 'filters', label: 'Filtros',    icon: Filter },
  { id: 'drill',   label: 'Drill-down', icon: MousePointerClick },
  { id: 'states',  label: 'Estados',    icon: AlertCircle },
  { id: 'badges',  label: 'Badges',     icon: Tag },
];

function DemoBlock({ name, children, description, span }: { name: string; description?: string; children: React.ReactNode; span?: 1 | 2 | 3 }) {
  const colSpan = span === 3 ? 'lg:col-span-3' : span === 2 ? 'lg:col-span-2' : '';
  return (
    <div className={`space-y-1.5 ${colSpan}`}>
      <div className="flex items-baseline justify-between gap-2">
        <code className="text-[11px] font-semibold text-primary">{name}</code>
        {description && <span className="text-[11px] text-muted-foreground">{description}</span>}
      </div>
      {children}
    </div>
  );
}

function CatalogSidebar({ active, onJump }: { active: string; onJump: (id: string) => void }) {
  return (
    <nav className="sticky top-4 hidden h-fit w-56 shrink-0 space-y-0.5 rounded-md border bg-card p-2 lg:block">
      <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Catálogo
      </div>
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onJump(s.id)}
            className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors ${
              isActive ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-accent/50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}

function MobileNav({ active, onJump }: { active: string; onJump: (id: string) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto rounded-md border bg-card p-1.5 lg:hidden">
      {SECTIONS.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onJump(s.id)}
            className={`shrink-0 rounded-sm px-2.5 py-1 text-xs ${
              isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

export default function BiComponentsDemoPage() {
  const [active, setActive] = useState('layout');

  // filter state (controlled, local)
  const [start, setStart] = useState('2026-01-01');
  const [end, setEnd] = useState('2026-06-30');
  const [tipo, setTipo] = useState('all');
  const [fornec, setFornec] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [chips, setChips] = useState([
    { key: 'periodo', label: '01/01 a 30/06' },
    { key: 'tipo', label: 'Matéria Prima' },
  ]);

  // drill state
  const [drillPath, setDrillPath] = useState<{ levelKey: string; value: string; label: string }[]>([
    { levelKey: 'tipo', value: 'Matéria Prima', label: 'Tipo' },
  ]);

  // intersection observer for sidebar highlight
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.isIntersecting && setActive(s.id)),
        { rootMargin: '-30% 0px -60% 0px' },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // table columns
  const cols: Column<typeof tableRows[number]>[] = [
    { key: 'id', header: '#', sortable: true },
    { key: 'tipo', header: 'Tipo' },
    { key: 'centro', header: 'Centro de Custo' },
    { key: 'fornecedor', header: 'Fornecedor' },
    { key: 'valor_liquido', header: 'Valor', sortable: true, align: 'right', render: (_v, r) => formatCurrency(r.valor_liquido) },
    { key: 'status', header: 'Status', render: (_v, r) => <StatusBadge status={r.status as BiStatus} /> },
  ];

  const tabContent = useMemo(() => ([
    { value: 'visao', label: 'Visão Geral', content: (
      <KpiGrid cols={3}>
        <KpiCard title="Total" value={7580000} format="currency" variant="info" icon={<DollarSign className="h-4 w-4" />} />
        <KpiCard title="Itens" value={1245} format="number" />
        <KpiCard title="Ticket Médio" value={6088} format="currency" />
      </KpiGrid>
    ) },
    { value: 'detalhe', label: 'Detalhamento', content: (
      <RankingTable data={fornecedoresRanking.slice(0, 5)} />
    ) },
    { value: 'comparacao', label: 'Comparação', content: (
      <ComparisonTable rows={[
        { label: 'Compras', current: 7580000, previous: 6420000, format: 'currency' },
        { label: 'Recebimentos', current: 6840000, previous: 5980000, format: 'currency' },
      ]} />
    ) },
  ]), []);

  return (
    <DashboardPage>
      <DashboardHeader
        title={useLocation().pathname === '/biblioteca-bi' ? 'Biblioteca BI — Componentes' : 'Catálogo de Componentes BI'}
        description="Biblioteca interna padronizada para dashboards, KPIs, gráficos, filtros e drill-down do sistema ERP. Todos os exemplos usam dados controlados (mock) — nenhum endpoint é chamado nesta tela."
        actions={<StatusBadge status="positivo" label="v1.0 — Fase 1 concluída" />}
      />

      <MobileNav active={active} onJump={jumpTo} />

      <div className="flex gap-4">
        <CatalogSidebar active={active} onJump={jumpTo} />

        <div className="flex-1 space-y-10 min-w-0">
          {/* ===== LAYOUT ===== */}
          <section id="layout" className="scroll-mt-4 space-y-3">
            <DashboardSection title="Layout & estrutura" icon={<LayoutDashboard className="h-4 w-4" />}>
              <DemoBlock name="DashboardTabs" description="Navegação entre visões dentro de uma página">
                <DashboardTabs tabs={tabContent} />
              </DemoBlock>
              <DemoBlock name="DashboardGrid (cols=4)" description="Grid responsivo automático">
                <DashboardGrid cols={4}>
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="rounded-md border bg-muted/30 p-4 text-center text-xs text-muted-foreground">Slot {i}</div>
                  ))}
                </DashboardGrid>
              </DemoBlock>
            </DashboardSection>
          </section>

          {/* ===== KPIs ===== */}
          <section id="kpis" className="scroll-mt-4 space-y-3">
            <DashboardSection title="KPIs" icon={<TrendingUp className="h-4 w-4" />}>
              <DemoBlock name="KpiGrid + KpiCard (variants)">
                <KpiGrid cols={4}>
                  <KpiCard title="Receita" value={1820000} format="currency" variant="info"
                    icon={<DollarSign className="h-4 w-4" />} trend={{ value: 12.4 }} />
                  <KpiCard title="Compras" value={980000} format="currency" variant="success"
                    icon={<ShoppingCart className="h-4 w-4" />} trend={{ value: -3.2 }} subtitle="vs mês anterior" />
                  <KpiCard title="Pendências" value={240000} format="currency" variant="warning"
                    icon={<Package className="h-4 w-4" />} status="pendente" />
                  <KpiCard title="Atrasos" value={48000} format="currency" variant="danger"
                    icon={<Users className="h-4 w-4" />} status="atraso" tooltip="Soma de notas com vencimento ultrapassado." />
                </KpiGrid>
              </DemoBlock>
              <DemoBlock name="KpiComparisonCard / KpiVariationCard / KpiStatusCard">
                <KpiGrid cols={3}>
                  <KpiComparisonCard title="Faturamento" current={1820000} previous={1620000} />
                  <KpiVariationCard title="Variação MoM" variation={12.34} subtitle="Junho vs Maio" />
                  <KpiStatusCard title="Recebimento" value={92.5} format="percent" status="recebido" />
                </KpiGrid>
              </DemoBlock>
              <DemoBlock name="KpiCard loading">
                <KpiGrid cols={3}>
                  <KpiCard title="Carregando..." value={null} loading />
                  <KpiCard title="Carregando..." value={null} loading />
                  <KpiCard title="Carregando..." value={null} loading />
                </KpiGrid>
              </DemoBlock>
            </DashboardSection>
          </section>

          {/* ===== CHARTS ===== */}
          <section id="charts" className="scroll-mt-4 space-y-3">
            <DashboardSection title="Gráficos" icon={<BarChart3 className="h-4 w-4" />}>
              <ChartGrid>
                <BarChartCard title="Compras por mês" subtitle="Barras com média"
                  data={mesesData} showAverage />
                <LineChartCard title="Tendência mensal" data={mesesData} />
                <AreaChartCard title="Área acumulada" data={mesesData} />
                <DonutChartCard title="Tipos de despesa" data={tiposDespesa} />
                <PieChartCard title="Distribuição (pizza)" data={tiposDespesa} />
                <StackedBarChartCard title="Recebido x Pendente" data={mesesData} series={stackedSeries} />
                <ComboChartCard title="Compras x Recebido" data={mesesData}
                  barKey="valor" barLabel="Compras" lineKey="recebido" lineLabel="Recebido" />
                <RankingChartCard title="Top fornecedores" subtitle="Ranking horizontal"
                  data={fornecedoresRanking} topN={7} />
                <HorizontalBarChartCard title="Barras horizontais" data={fornecedoresRanking.slice(0,6)} />
                <GaugeChartCard title="Atingimento de meta" value={78} max={100} label="78% da meta" />
                <ProgressChartCard title="Metas por categoria" items={[
                  { label: 'Matéria Prima', value: 4200000, target: 5000000, format: 'currency' },
                  { label: 'Serviços', value: 1100000, target: 1000000, format: 'currency' },
                  { label: 'Logística', value: 320000, target: 600000, format: 'currency' },
                ]} />
              </ChartGrid>
            </DashboardSection>
          </section>

          {/* ===== TABLES ===== */}
          <section id="tables" className="scroll-mt-4 space-y-3">
            <DashboardSection title="Tabelas analíticas" icon={<Table2 className="h-4 w-4" />}>
              <DemoBlock name="DataTableBI (com paginação)">
                <DataTableBI
                  columns={cols}
                  data={tableRows}
                  pagination={{ pagina: 1, totalPaginas: 5, totalRegistros: 47, onPageChange: () => {} }}
                />
              </DemoBlock>
              <DemoBlock name="DrillDownTable" description="Hierarquia colapsável Tipo → Centro → Fornecedor">
                <DrillDownTable
                  data={drillRows}
                  levels={[
                    { key: 'tipo', label: 'Tipo' },
                    { key: 'centro', label: 'Centro de Custo' },
                    { key: 'fornecedor', label: 'Fornecedor' },
                  ]}
                />
              </DemoBlock>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DemoBlock name="RankingTable">
                  <RankingTable data={fornecedoresRanking.slice(0, 6)} />
                </DemoBlock>
                <DemoBlock name="SummaryTable + total">
                  <SummaryTable rows={[
                    { label: 'Compras', value: 7580000, format: 'currency' },
                    { label: 'Recebido', value: 6840000, format: 'currency' },
                    { label: 'Pendente', value: 740000, format: 'currency' },
                  ]} total={{ label: 'Saldo', value: 6100000, format: 'currency', bold: true }} />
                </DemoBlock>
                <DemoBlock name="ComparisonTable" span={2}>
                  <ComparisonTable rows={[
                    { label: 'Compras', current: 7580000, previous: 6420000, format: 'currency' },
                    { label: 'Recebimentos', current: 6840000, previous: 5980000, format: 'currency' },
                    { label: 'Pendências', current: 740000, previous: 920000, format: 'currency' },
                  ]} />
                </DemoBlock>
              </div>
            </DashboardSection>
          </section>

          {/* ===== FILTERS ===== */}
          <section id="filters" className="scroll-mt-4 space-y-3">
            <DashboardSection title="Filtros" icon={<Filter className="h-4 w-4" />}>
              <DemoBlock name="DashboardFilters (painel completo)">
                <DashboardFilters onApply={() => {}} onClear={() => setChips([])} onRefresh={() => {}}>
                  <DateRangeFilter startValue={start} endValue={end} onStartChange={setStart} onEndChange={setEnd} />
                  <SelectFilter label="Tipo de despesa" value={tipo} onChange={setTipo} options={[
                    { value: 'all', label: 'Todos' },
                    { value: 'mp', label: 'Matéria Prima' },
                    { value: 'serv', label: 'Serviços' },
                  ]} />
                  <MultiSelectFilter label="Fornecedores" values={fornec} onChange={setFornec} options={fornecedorOptions} />
                  <SearchFilter value={search} onChange={setSearch} placeholder="Buscar..." />
                </DashboardFilters>
              </DemoBlock>
              <DemoBlock name="FilterBar (barra horizontal)">
                <FilterBar>
                  <SelectFilter label="Tipo" value={tipo} onChange={setTipo} options={[
                    { value: 'all', label: 'Todos' },
                    { value: 'mp', label: 'Matéria Prima' },
                  ]} />
                  <SearchFilter value={search} onChange={setSearch} />
                </FilterBar>
              </DemoBlock>
              <DemoBlock name="FilterChips" description="Chips removíveis representando filtros ativos">
                <FilterChips
                  chips={chips}
                  onRemove={(k) => setChips(chips.filter((c) => c.key !== k))}
                  onClearAll={() => setChips([])}
                />
              </DemoBlock>
              <DemoBlock name="AdvancedFiltersPanel">
                <AdvancedFiltersPanel>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <SelectFilter label="Origem" value="all" onChange={() => {}} options={[{ value: 'all', label: 'Todas' }]} />
                    <SelectFilter label="Depósito" value="all" onChange={() => {}} options={[{ value: 'all', label: 'Todos' }]} />
                  </div>
                </AdvancedFiltersPanel>
              </DemoBlock>
            </DashboardSection>
          </section>

          {/* ===== DRILL ===== */}
          <section id="drill" className="scroll-mt-4 space-y-3">
            <DashboardSection title="Drill-down" icon={<MousePointerClick className="h-4 w-4" />}>
              <DemoBlock name="DrillBreadcrumb">
                <DrillBreadcrumb
                  path={drillPath}
                  onJumpTo={(d) => setDrillPath(d < 0 ? [] : drillPath.slice(0, d + 1))}
                  onClear={() => setDrillPath([])}
                />
              </DemoBlock>
              <DemoBlock name="DrillLevelSelector" description="Próximo nível disponível para drill">
                <DrillLevelSelector
                  levels={[
                    { key: 'centro', label: 'Centro de Custo' },
                    { key: 'fornecedor', label: 'Fornecedor' },
                    { key: 'projeto', label: 'Projeto' },
                  ]}
                  currentKey="centro"
                  onSelect={(k) => setDrillPath([...drillPath, { levelKey: k, value: 'Exemplo', label: k }])}
                />
              </DemoBlock>
            </DashboardSection>
          </section>

          {/* ===== STATES ===== */}
          <section id="states" className="scroll-mt-4 space-y-3">
            <DashboardSection title="Estados visuais" icon={<AlertCircle className="h-4 w-4" />}>
              <DashboardGrid cols={2}>
                <DemoBlock name="LoadingState (spinner)">
                  <div className="rounded-md border bg-card"><LoadingState height={140} /></div>
                </DemoBlock>
                <DemoBlock name="LoadingState (skeleton)">
                  <div className="rounded-md border bg-card"><LoadingState height={140} variant="skeleton" /></div>
                </DemoBlock>
                <DemoBlock name="EmptyState">
                  <div className="rounded-md border bg-card"><EmptyState /></div>
                </DemoBlock>
                <DemoBlock name="NoDataState">
                  <div className="rounded-md border bg-card"><NoDataState height={140} /></div>
                </DemoBlock>
                <DemoBlock name="ErrorState" span={2}>
                  <div className="rounded-md border bg-card"><ErrorState message="Falha ao carregar dados do servidor." height={140} /></div>
                </DemoBlock>
              </DashboardGrid>
            </DashboardSection>
          </section>

          {/* ===== BADGES ===== */}
          <section id="badges" className="scroll-mt-4 space-y-3">
            <DashboardSection title="StatusBadge" icon={<Tag className="h-4 w-4" />}>
              <DemoBlock name="StatusBadge — todas as variantes" description="Padrão para status em tabelas e KPIs">
                <div className="flex flex-wrap gap-2 rounded-md border bg-card p-3">
                  {(['recebido','pendente','parcial','cancelado','atraso','sem-nf','com-nf','sem-oc','com-oc','positivo','negativo','neutro'] as BiStatus[]).map((s) => (
                    <StatusBadge key={s} status={s} />
                  ))}
                </div>
              </DemoBlock>
              <DemoBlock name="Formatadores" description="formatCurrency, formatNumber, abbreviateNumber">
                <div className="grid grid-cols-3 gap-3 rounded-md border bg-card p-3 text-xs">
                  <div><div className="text-muted-foreground">formatCurrency</div><div className="font-mono font-semibold">{formatCurrency(1234567.89)}</div></div>
                  <div><div className="text-muted-foreground">formatNumber</div><div className="font-mono font-semibold">{formatNumber(1234567, 0)}</div></div>
                  <div><div className="text-muted-foreground">abbreviateNumber</div><div className="font-mono font-semibold">{abbreviateNumber(1234567, true)}</div></div>
                </div>
              </DemoBlock>
            </DashboardSection>
          </section>

          <div className="border-t pt-4 pb-8 text-center text-[11px] text-muted-foreground">
            <Palette className="mx-auto mb-1 h-4 w-4" />
            Catálogo BI — fonte: <code>src/components/bi/</code>. Use estes blocos como referência ao migrar telas existentes.
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
