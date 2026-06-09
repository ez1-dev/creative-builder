import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { DollarSign, Package, ShoppingCart, Users, TrendingUp, Layers, Palette, Filter, Table2, BarChart3, MousePointerClick, AlertCircle, Tag, LayoutDashboard, Network, Clock, Sparkles } from 'lucide-react';
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
  // runtime: aplicar em páginas
  ApplyComponentButton,
  MyWidgetsPanel,
  // utils
  formatCurrency, formatNumber, abbreviateNumber,
  type Column,
  type BiStatus,
} from '@/components/bi';
import { NumberRoundingToggle } from '@/components/bi/runtime/NumberRoundingToggle';

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
  
  { id: 'tree',    label: 'Hierarquia', icon: Network },
  { id: 'tables',  label: 'Tabelas',    icon: Table2 },
  { id: 'filters', label: 'Filtros',    icon: Filter },
  { id: 'drill',   label: 'Drill-down', icon: MousePointerClick },
  { id: 'states',  label: 'Estados',    icon: AlertCircle },
  { id: 'badges',  label: 'Badges',     icon: Tag },
];

function DemoBlock({ name, children, description, span, applyId, nonApplicable }: { name: string; description?: string; children: React.ReactNode; span?: 1 | 2 | 3; applyId?: string; nonApplicable?: boolean }) {
  const colSpan = span === 3 ? 'lg:col-span-3' : span === 2 ? 'lg:col-span-2' : '';
  return (
    <div className={`group space-y-2 rounded-xl border border-border/60 bg-card/50 p-3 transition-all hover:border-primary/40 hover:bg-card hover:shadow-sm ${colSpan}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-dashed border-border/60 pb-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <code className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary truncate">{name}</code>
          {description && <span className="text-[11px] text-muted-foreground truncate">{description}</span>}
        </div>
        {applyId
          ? <ApplyComponentButton componentId={applyId} />
          : nonApplicable
            ? <span className="text-[10px] text-muted-foreground italic whitespace-nowrap">uso direto via import</span>
            : null}
      </div>
      {children}
    </div>
  );
}

function WithApply({ componentId, children }: { componentId: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 z-10 opacity-70 transition-opacity group-hover:opacity-100">
        <ApplyComponentButton componentId={componentId} label="Aplicar" />
      </div>
      {children}
    </div>
  );
}

function CatalogSidebar({ active, onJump }: { active: string; onJump: (id: string) => void }) {
  return (
    <nav className="sticky top-4 hidden h-fit w-60 shrink-0 space-y-1 rounded-xl border bg-gradient-to-b from-card to-card/60 p-3 shadow-sm lg:block">
      <div className="flex items-center gap-1.5 px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <LayoutDashboard className="h-3 w-3" />
        Catálogo
        <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">{SECTIONS.length}</span>
      </div>
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onJump(s.id)}
            className={`relative flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-all ${
              isActive
                ? 'bg-gradient-to-r from-primary/15 to-primary/5 font-semibold text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            }`}
          >
            {isActive && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />}
            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : ''}`} />
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}

function MobileNav({ active, onJump }: { active: string; onJump: (id: string) => void }) {
  return (
    <div className="sticky top-2 z-20 flex gap-1.5 overflow-x-auto rounded-xl border bg-card/95 p-1.5 shadow-sm backdrop-blur lg:hidden">
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onJump(s.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-all ${
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Icon className="h-3 w-3" />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

export default function BiComponentsDemoPage() {
  const { isAuthenticated } = useAuth();
  const { canView, hasPermissions, loading: permLoading } = useUserPermissions();
  const blocked = isAuthenticated && !permLoading && hasPermissions && !canView('/biblioteca-bi');

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

  if (blocked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-sm rounded-lg border bg-card p-8 text-center shadow-md space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Sem acesso à Biblioteca BI</h2>
          <p className="text-sm text-muted-foreground">
            Seu perfil não tem permissão para acessar esta tela. Solicite ao administrador a liberação em <strong>Configurações → Permissões por Tela</strong>.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/estoque">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardPage>
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-12 bottom-0 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-xl font-bold tracking-tight">
              {useLocation().pathname === '/biblioteca-bi' ? 'Biblioteca BI — Componentes' : 'Catálogo de Componentes BI'}
            </h1>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Biblioteca interna padronizada para dashboards, KPIs, gráficos, filtros e drill-down do sistema ERP. Todos os exemplos usam dados controlados (mock) — nenhum endpoint é chamado nesta tela.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <StatusBadge status="positivo" label="v1.0 — Fase 1 concluída" />
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                {SECTIONS.length} seções
              </span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                Aplicável em qualquer página
              </span>
              <div className="ml-auto rounded-md border bg-card/60 px-2 py-1 shadow-sm">
                <NumberRoundingToggle />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileNav active={active} onJump={jumpTo} />

      <div className="flex gap-4">
        <CatalogSidebar active={active} onJump={jumpTo} />

        <div className="flex-1 space-y-12 min-w-0">
          {/* ===== MEUS WIDGETS APLICADOS ===== */}
          <MyWidgetsPanel />

          {/* ===== AI SUGGESTER ===== */}
          <ComponentSuggester onJumpToSection={jumpTo} />

          {/* ===== DASHBOARD PRONTO ===== */}
          <section id="dashboard-pronto" className="scroll-mt-4 space-y-3">
            <DashboardSection title="Dashboard Pronto — Gestão de Compras" icon={<Sparkles className="h-4 w-4" />}>
              <p className="text-[11px] text-muted-foreground">
                Exemplo completo de composição: filtros + KPIs + ComboChart + Donut + Mapa do Brasil + Ranking + Treemap + DrillDown.
                Importe <code className="text-primary">ComprasDashboardTemplate</code> da lib <code className="text-primary">@/components/bi</code>.
              </p>
              <div className="rounded-lg border bg-muted/20 p-3">
                <ComprasDashboardTemplate />
              </div>
            </DashboardSection>
          </section>


          <section id="layout" className="scroll-mt-4 space-y-3">
            <DashboardSection title="Layout & estrutura" icon={<LayoutDashboard className="h-4 w-4" />}>
              <DemoBlock name="DashboardTabs" description="Navegação entre visões dentro de uma página" nonApplicable>
                <DashboardTabs tabs={tabContent} />
              </DemoBlock>
              <DemoBlock name="DashboardGrid (cols=4)" description="Grid responsivo automático" nonApplicable>
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
              <DemoBlock name="KpiGrid + KpiCard (variants)" applyId="kpi-card">
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
              <DemoBlock name="KpiComparisonCard" applyId="kpi-comparison">
                <KpiComparisonCard title="Faturamento" current={1820000} previous={1620000} />
              </DemoBlock>
              <DemoBlock name="KpiVariationCard" applyId="kpi-variation">
                <KpiVariationCard title="Variação MoM" variation={12.34} subtitle="Junho vs Maio" />
              </DemoBlock>
              <DemoBlock name="KpiStatusCard" applyId="kpi-status">
                <KpiStatusCard title="Recebimento" value={92.5} format="percent" status="recebido" />
              </DemoBlock>
              <DemoBlock name="KpiSparklineCard / KpiTargetCard" applyId="kpi-sparkline">
                <KpiGrid cols={4}>
                  <KpiSparklineCard title="Compras" value={1820000} format="currency" trend={12.4}
                    series={mesesData.map((m) => m.valor)} />
                  <KpiSparklineCard title="Recebido" value={1620000} format="currency" trend={8.1}
                    series={mesesData.map((m) => m.recebido)} color="hsl(142,70%,40%)" />
                  <KpiTargetCard title="Meta mensal" value={1820000} target={2000000} format="currency" />
                  <KpiTargetCard title="% Recebimento" value={84.1} target={95} format="percent" subtitle="Meta SLA" />
                </KpiGrid>
              </DemoBlock>
              <DemoBlock name="KpiCard loading" nonApplicable>
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
                <WithApply componentId="bar-chart">
                  <BarChartCard title="Compras por mês" subtitle="Barras com média"
                    data={mesesData} showAverage />
                </WithApply>
                <WithApply componentId="line-chart">
                  <LineChartCard title="Tendência mensal" data={mesesData} />
                </WithApply>
                <WithApply componentId="area-chart">
                  <AreaChartCard title="Área acumulada" data={mesesData} />
                </WithApply>
                <WithApply componentId="donut-chart">
                  <DonutChartCard title="Tipos de despesa" data={tiposDespesa} />
                </WithApply>
                <WithApply componentId="pie-chart">
                  <PieChartCard title="Distribuição (pizza)" data={tiposDespesa} />
                </WithApply>
                <WithApply componentId="stacked-bar-chart">
                  <StackedBarChartCard title="Recebido x Pendente" data={mesesData} series={stackedSeries} />
                </WithApply>
                <WithApply componentId="combo-chart">
                  <ComboChartCard title="Compras x Recebido" data={mesesData}
                    barKey="valor" barLabel="Compras" lineKey="recebido" lineLabel="Recebido" />
                </WithApply>
                <WithApply componentId="ranking-chart">
                  <RankingChartCard title="Top fornecedores" subtitle="Ranking horizontal"
                    data={fornecedoresRanking} topN={7} />
                </WithApply>
                <WithApply componentId="horizontal-bar-chart">
                  <HorizontalBarChartCard title="Barras horizontais" data={fornecedoresRanking.slice(0,6)} />
                </WithApply>
                <WithApply componentId="gauge-chart">
                  <GaugeChartCard title="Atingimento de meta" value={78} max={100} label="78% da meta" />
                </WithApply>
                <WithApply componentId="progress-chart">
                  <ProgressChartCard title="Metas por categoria" items={[
                    { label: 'Matéria Prima', value: 4200000, target: 5000000, format: 'currency' },
                    { label: 'Serviços', value: 1100000, target: 1000000, format: 'currency' },
                    { label: 'Logística', value: 320000, target: 600000, format: 'currency' },
                  ]} />
                </WithApply>
                <WithApply componentId="treemap-chart">
                  <TreemapChartCard title="Treemap — categorias"
                    data={tiposDespesa.map((t) => ({ name: t.label, value: t.valor }))} />
                </WithApply>
                <WithApply componentId="radar-chart">
                  <RadarChartCard title="Avaliação de fornecedores"
                    data={[
                      { axis: 'Preço', acme: 80, sul: 60 },
                      { axis: 'Qualidade', acme: 90, sul: 75 },
                      { axis: 'Prazo', acme: 70, sul: 85 },
                      { axis: 'Atend.', acme: 85, sul: 70 },
                      { axis: 'Pós-venda', acme: 65, sul: 80 },
                    ]}
                    series={[{ dataKey: 'acme', label: 'Acme Aço' }, { dataKey: 'sul', label: 'Metalúrgica Sul' }]}
                  />
                </WithApply>
                <WithApply componentId="scatter-chart">
                  <ScatterChartCard title="Prazo x Valor (dispersão)"
                    xLabel="Prazo (dias)" yLabel="Valor (R$ k)"
                    data={[
                      { x: 5, y: 120, z: 200 }, { x: 10, y: 280, z: 400 }, { x: 15, y: 180, z: 300 },
                      { x: 22, y: 540, z: 800 }, { x: 30, y: 320, z: 500 }, { x: 45, y: 720, z: 1000 },
                    ]} />
                </WithApply>
                <WithApply componentId="waterfall-chart">
                  <WaterfallChartCard title="Variação de saldo"
                    data={[
                      { label: 'Inicial', value: 1000000, isTotal: true },
                      { label: 'Compras', value: -480000 },
                      { label: 'Recebido', value: 720000 },
                      { label: 'Devolução', value: -120000 },
                      { label: 'Final', value: 0, isTotal: true },
                    ]} />
                </WithApply>
                <WithApply componentId="funnel-chart">
                  <FunnelChartCard title="Funil de cotação"
                    data={[
                      { name: 'Cotações', value: 480 },
                      { name: 'Aprovadas', value: 320 },
                      { name: 'Pedidos', value: 240 },
                      { name: 'Recebidas', value: 180 },
                    ]} />
                </WithApply>
                <WithApply componentId="heatmap-chart">
                  <HeatmapChartCard title="Compras por dia × hora"
                    data={Array.from({ length: 35 }, (_, i) => ({
                      row: ['Seg','Ter','Qua','Qui','Sex'][i % 5],
                      col: `${8 + Math.floor(i/5)}h`,
                      value: Math.floor(Math.random() * 50),
                    }))} />
                </WithApply>
                <WithApply componentId="calendar-heatmap">
                  <CalendarHeatmapCard title="Atividade diária"
                    data={Array.from({ length: 90 }, (_, i) => {
                      const d = new Date(); d.setDate(d.getDate() - i);
                      return { date: d.toISOString().slice(0, 10), value: Math.floor(Math.random() * 12) };
                    })} />
                </WithApply>
              </ChartGrid>
              <DemoBlock name="SparklineCard" description="Micro-gráfico inline" applyId="sparkline">
                <div className="flex gap-4 rounded-md border bg-card p-3">
                  <div className="flex-1">
                    <div className="text-[11px] text-muted-foreground">Compras (6m)</div>
                    <SparklineCard data={mesesData.map((m) => m.valor)} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-muted-foreground">Recebido (6m)</div>
                    <SparklineCard data={mesesData.map((m) => m.recebido)} color="hsl(142,70%,40%)" />
                  </div>
                </div>
              </DemoBlock>
            </DashboardSection>
          </section>

          {/* ===== TREE ===== */}
          <section id="tree" className="scroll-mt-4 space-y-3">
            <DashboardSection title="Hierarquia / Árvore" icon={<Network className="h-4 w-4" />}>
              <DemoBlock name="TreeView" description="Lista hierárquica genérica (BOM, organograma, taxonomia)" applyId="tree-view">
                <div className="rounded-md border bg-card p-3">
                  <TreeView defaultExpanded nodes={[
                    { id: '1', label: 'Diretoria Industrial', value: '12 áreas', children: [
                      { id: '1.1', label: 'Engenharia', value: '4 setores', children: [
                        { id: '1.1.1', label: 'Projetos', value: '8 pessoas' },
                        { id: '1.1.2', label: 'Processos', value: '5 pessoas' },
                      ]},
                      { id: '1.2', label: 'Produção', value: '6 setores' },
                    ]},
                    { id: '2', label: 'Diretoria Comercial', value: '3 áreas' },
                  ]} />
                </div>
              </DemoBlock>
              <DemoBlock name="Timeline" description="Eventos cronológicos — log de aprovações, histórico" applyId="timeline">
                <div className="rounded-md border bg-card p-3">
                  <Timeline events={[
                    { id: '1', title: 'OC criada', timestamp: '15/04 10:23', description: 'Aberta por João Silva' },
                    { id: '2', title: 'Aprovação financeira', timestamp: '15/04 14:10', color: 'hsl(142,70%,40%)' },
                    { id: '3', title: 'Enviada ao fornecedor', timestamp: '16/04 08:45' },
                    { id: '4', title: 'Recebimento parcial', timestamp: '22/04 11:30', color: 'hsl(38,92%,50%)' },
                  ]} />
                </div>
              </DemoBlock>
            </DashboardSection>
          </section>


          {/* ===== TABLES ===== */}
          <section id="tables" className="scroll-mt-4 space-y-3">
            <DashboardSection title="Tabelas analíticas" icon={<Table2 className="h-4 w-4" />}>
              <DemoBlock name="DataTableBI (com paginação)" applyId="data-table">
                <DataTableBI
                  columns={cols}
                  data={tableRows}
                  pagination={{ pagina: 1, totalPaginas: 5, totalRegistros: 47, onPageChange: () => {} }}
                />
              </DemoBlock>
              <DemoBlock name="DrillDownTable" description="Hierarquia colapsável Tipo → Centro → Fornecedor" applyId="drill-down-table">
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
                <DemoBlock name="RankingTable" applyId="ranking-table">
                  <RankingTable data={fornecedoresRanking.slice(0, 6)} />
                </DemoBlock>
                <DemoBlock name="SummaryTable + total" applyId="summary-table">
                  <SummaryTable rows={[
                    { label: 'Compras', value: 7580000, format: 'currency' },
                    { label: 'Recebido', value: 6840000, format: 'currency' },
                    { label: 'Pendente', value: 740000, format: 'currency' },
                  ]} total={{ label: 'Saldo', value: 6100000, format: 'currency', bold: true }} />
                </DemoBlock>
                <DemoBlock name="ComparisonTable" span={2} applyId="comparison-table">
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
              <DemoBlock name="DashboardFilters (painel completo)" nonApplicable>
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
              <DemoBlock name="FilterBar (barra horizontal)" nonApplicable>
                <FilterBar>
                  <SelectFilter label="Tipo" value={tipo} onChange={setTipo} options={[
                    { value: 'all', label: 'Todos' },
                    { value: 'mp', label: 'Matéria Prima' },
                  ]} />
                  <SearchFilter value={search} onChange={setSearch} />
                </FilterBar>
              </DemoBlock>
              <DemoBlock name="FilterChips" description="Chips removíveis representando filtros ativos" nonApplicable>
                <FilterChips
                  chips={chips}
                  onRemove={(k) => setChips(chips.filter((c) => c.key !== k))}
                  onClearAll={() => setChips([])}
                />
              </DemoBlock>
              <DemoBlock name="AdvancedFiltersPanel" nonApplicable>
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
              <DemoBlock name="DrillBreadcrumb" nonApplicable>
                <DrillBreadcrumb
                  path={drillPath}
                  onJumpTo={(d) => setDrillPath(d < 0 ? [] : drillPath.slice(0, d + 1))}
                  onClear={() => setDrillPath([])}
                />
              </DemoBlock>
              <DemoBlock name="DrillLevelSelector" description="Próximo nível disponível para drill" nonApplicable>
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
                <DemoBlock name="LoadingState (spinner)" nonApplicable>
                  <div className="rounded-md border bg-card"><LoadingState height={140} /></div>
                </DemoBlock>
                <DemoBlock name="LoadingState (skeleton)" nonApplicable>
                  <div className="rounded-md border bg-card"><LoadingState height={140} variant="skeleton" /></div>
                </DemoBlock>
                <DemoBlock name="EmptyState" nonApplicable>
                  <div className="rounded-md border bg-card"><EmptyState /></div>
                </DemoBlock>
                <DemoBlock name="NoDataState" nonApplicable>
                  <div className="rounded-md border bg-card"><NoDataState height={140} /></div>
                </DemoBlock>
                <DemoBlock name="ErrorState" span={2} nonApplicable>
                  <div className="rounded-md border bg-card"><ErrorState message="Falha ao carregar dados do servidor." height={140} /></div>
                </DemoBlock>
              </DashboardGrid>
            </DashboardSection>
          </section>

          {/* ===== BADGES ===== */}
          <section id="badges" className="scroll-mt-4 space-y-3">
            <DashboardSection title="StatusBadge" icon={<Tag className="h-4 w-4" />}>
              <DemoBlock name="StatusBadge — todas as variantes" description="Padrão para status em tabelas e KPIs" applyId="status-badge">
                <div className="flex flex-wrap gap-2 rounded-md border bg-card p-3">
                  {(['recebido','pendente','parcial','cancelado','atraso','sem-nf','com-nf','sem-oc','com-oc','positivo','negativo','neutro'] as BiStatus[]).map((s) => (
                    <StatusBadge key={s} status={s} />
                  ))}
                </div>
              </DemoBlock>
              <DemoBlock name="Formatadores" description="formatCurrency, formatNumber, abbreviateNumber" nonApplicable>
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
