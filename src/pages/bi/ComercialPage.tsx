import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, RotateCcw, Sparkles, X } from 'lucide-react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  KpiCard,
  KpiGrid,
  KpiTargetCard,
  KpiVariationCard,
  KpiSparklineCard,
  DataTableBI,
  LoadingState,
  ErrorState,
  EmptyState,
  ComboChartCard,
  DonutChartCard,
  HorizontalBarChartCard,
  RankingChartCard,
  RankingTable,
  TreemapChartCard,
  BrazilMapCard,
  FilterBar,
  SelectFilter,
  UserWidgetsSlot,
  formatCurrency,
  formatNumber,
  type Column,
} from '@/components/bi';
import { DrillSheet, useDrillSheet } from '@/components/bi/drill/DrillSheet';
import {
  DashboardPage,
  DashboardSection,
} from '@/components/bi/layout/DashboardLayout';
import { BiSlot } from '@/components/bi/runtime/BiSlot';
import { COMERCIAL_SLOTS } from '@/lib/bi/comercialSlots';
import { useSlotOverrides } from '@/hooks/useSlotOverrides';
import { PageDataProvider } from '@/lib/bi/PageDataContext';
import {
  fetchComercialKpis,
  fetchComercialMensal,
  fetchComercialMix,
  fetchComercialEstado,
  fetchComercialRevenda,
  fetchComercialObras,
  fetchComercialDetalhes,
  type ComercialDetalheEscopo,
  type ComercialDetalheRow,
  type ComercialMensalRow,
} from '@/lib/bi/comercialApi';
import {
  useComercialFilters,
  drillFromMixCategoria,
  DRILL_LABELS,
  type BiComercialDrillKey,
  type UnidadeNegocio,
} from '@/lib/bi/comercialFilters';
import { cn } from '@/lib/utils';

const n = (v: any) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

const UNIDADES: UnidadeNegocio[] = ['CONSOLIDADO', 'GENIUS', 'ESTRUTURAL ZORTEA'];

const UNIDADE_STYLE: Record<UnidadeNegocio, { bar: string; mapVar: string; chip: string }> = {
  CONSOLIDADO: {
    bar: 'hsl(var(--muted-foreground))',
    mapVar: '--muted-foreground',
    chip: 'bg-muted text-muted-foreground',
  },
  GENIUS: {
    bar: 'hsl(var(--warning))',
    mapVar: '--warning',
    chip: 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]',
  },
  'ESTRUTURAL ZORTEA': {
    bar: 'hsl(var(--primary))',
    mapVar: '--primary',
    chip: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]',
  },
};

const ERR_MSG = 'Não foi possível carregar os dados do BI Comercial';
const ERR_DRILL = 'Não foi possível carregar os dados do drill';
const EMPTY_MSG = 'Sem dados para o período selecionado';
const PAGE_KEY = 'bi-comercial';

const ESCOPO_LABELS: Record<ComercialDetalheEscopo, string> = {
  todas: 'Todas as notas',
  impostos: 'Detalhamento de impostos',
  devolucao: 'Devoluções',
  vendas: 'Notas distintas',
  clientes: 'Por cliente',
  estados: 'Por estado',
};

function BlocoErro({ err, onRetry, msg = ERR_MSG }: { err: unknown; onRetry: () => void; msg?: string }) {
  return (
    <ErrorState
      title={msg}
      message={String((err as any)?.message ?? '')}
      onRetry={onRetry}
    />
  );
}

/** Wrapper clicável genérico — adiciona cursor pointer + title "Clique para detalhar". */
function Clickable({
  children, onClick, className,
}: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  if (!onClick) return <>{children}</>;
  return (
    <div
      role="button"
      tabIndex={0}
      title="Clique para detalhar"
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className={cn('cursor-pointer outline-none rounded-md transition-shadow hover:ring-2 hover:ring-ring/50', className)}
    >
      {children}
    </div>
  );
}

export default function ComercialPage() {
  const [draft, setDraft] = useState<{ anomes_ini: string; anomes_fim: string; unidade_negocio: UnidadeNegocio }>({
    anomes_ini: '202601',
    anomes_fim: '202606',
    unidade_negocio: 'GENIUS',
  });

  const {
    filters, setBase, applyDrill, removeDrill, clearDrill, chips,
  } = useComercialFilters(draft);

  const style = UNIDADE_STYLE[filters.unidade_negocio];
  const unidade = filters.unidade_negocio;

  const qKpis = useQuery({
    queryKey: ['bi-comercial', 'kpis', filters],
    queryFn: () => fetchComercialKpis(filters),
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const qMensal = useQuery({
    queryKey: ['bi-comercial', 'mensal', filters],
    queryFn: () => fetchComercialMensal(filters),
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const qMix = useQuery({
    queryKey: ['bi-comercial', 'mix', filters],
    queryFn: () => fetchComercialMix(filters),
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const qEstado = useQuery({
    queryKey: ['bi-comercial', 'estado', filters],
    queryFn: () => fetchComercialEstado(filters),
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const qRevenda = useQuery({
    queryKey: ['bi-comercial', 'revenda', filters],
    queryFn: () => fetchComercialRevenda(filters),
    enabled: unidade === 'GENIUS' || unidade === 'CONSOLIDADO',
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const qObras = useQuery({
    queryKey: ['bi-comercial', 'obras', filters],
    queryFn: () => fetchComercialObras(filters),
    enabled: unidade === 'ESTRUTURAL ZORTEA' || unidade === 'CONSOLIDADO',
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const aplicarFiltrosBase = () => setBase({ ...draft });
  const atualizar = () => {
    qKpis.refetch(); qMensal.refetch(); qMix.refetch(); qEstado.refetch();
    if (qRevenda.isFetched || unidade !== 'ESTRUTURAL ZORTEA') qRevenda.refetch();
    if (qObras.isFetched || unidade !== 'GENIUS') qObras.refetch();
  };

  const carregando =
    qKpis.isFetching || qMensal.isFetching || qMix.isFetching || qEstado.isFetching ||
    qRevenda.isFetching || qObras.isFetching;

  const kpis = qKpis.data ?? ({} as any);
  const mensal = qMensal.data ?? [];
  const mix = qMix.data ?? [];
  const estados = qEstado.data ?? [];
  const revendaRows = qRevenda.data ?? [];
  const obrasRows = qObras.data ?? [];

  // ---------- séries derivadas ----------
  const dadosCombo = useMemo(
    () => mensal.map((m) => ({
      label: m.anomes_emissao,
      faturamento: n(m.faturamento),
      meta: n(m.meta),
    })),
    [mensal],
  );
  const sparkSerie = useMemo(() => mensal.map((m) => n(m.faturamento)), [mensal]);
  const sparkTrend = useMemo(() => {
    if (sparkSerie.length < 2) return undefined;
    const ant = sparkSerie[sparkSerie.length - 2];
    const atu = sparkSerie[sparkSerie.length - 1];
    if (!ant) return undefined;
    return ((atu - ant) / Math.abs(ant)) * 100;
  }, [sparkSerie]);

  const donutMix = useMemo(
    () => mix.map((m) => ({ label: String(m.categoria ?? '-'), valor: n(m.faturamento) })),
    [mix],
  );

  const estadoSorted = useMemo(
    () => [...estados].sort((a, b) => n(b.faturamento) - n(a.faturamento)),
    [estados],
  );
  const horizTop = estadoSorted.slice(0, 10).map((d) => ({ label: d.cd_estado, valor: n(d.faturamento) }));
  const mapaData = estadoSorted.map((d) => ({ uf: d.cd_estado, valor: n(d.faturamento) }));

  const revendaRank = useMemo(
    () => revendaRows.map((r) => ({ label: r.revenda, valor: n(r.faturamento) })),
    [revendaRows],
  );
  const obrasRank = useMemo(
    () => obrasRows.map((o) => ({ label: o.projeto || o.cd_prj, valor: n(o.faturamento), cd_prj: o.cd_prj })),
    [obrasRows],
  );
  const obrasTreeData = useMemo(
    () => obrasRank.slice().sort((a, b) => b.valor - a.valor).slice(0, 30)
      .map((o) => ({ name: o.label, value: o.valor })),
    [obrasRank],
  );

  // ---------- drawer de detalhes ----------
  const drill = useDrillSheet<{ escopo: ComercialDetalheEscopo }>();
  const escopoAtual = drill.current?.ctx?.escopo ?? 'todas';

  const qDetalhes = useQuery({
    queryKey: ['bi-comercial', 'detalhes', filters, escopoAtual, drill.state.open],
    queryFn: () => fetchComercialDetalhes(filters, { escopo: escopoAtual, limit: 5000 }),
    enabled: drill.state.open,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const detalhesRows: ComercialDetalheRow[] = useMemo(() => {
    const all = qDetalhes.data ?? [];
    if (escopoAtual === 'devolucao') return all.filter((r) => n(r.vl_devolucao) !== 0);
    return all;
  }, [qDetalhes.data, escopoAtual]);

  const colsDetalhes: Column<ComercialDetalheRow>[] = [
    { key: 'anomes_emissao', header: 'Ano/Mês', render: (_v, r) => r.anomes_emissao ?? '-' },
    { key: 'unidade_negocio', header: 'Unidade', render: (_v, r) => r.unidade_negocio ?? '-' },
    { key: 'cd_tp_movimento', header: 'Mov.', render: (_v, r) => r.cd_tp_movimento ?? '-' },
    { key: 'cd_origem', header: 'Origem', render: (_v, r) => r.cd_origem ?? '-' },
    { key: 'cd_empresa', header: 'Emp.', render: (_v, r) => r.cd_empresa ?? '-' },
    { key: 'cd_filial', header: 'Filial', render: (_v, r) => r.cd_filial ?? '-' },
    { key: 'cd_nf', header: 'NF', render: (_v, r) => r.cd_nf ?? '-' },
    { key: 'cd_serie', header: 'Série', render: (_v, r) => r.cd_serie ?? '-' },
    { key: 'dt_emissao', header: 'Emissão', render: (_v, r) => r.dt_emissao ?? '-' },
    { key: 'cd_estado', header: 'UF', render: (_v, r) => r.cd_estado ?? '-' },
    { key: 'cd_cliente', header: 'Cliente', render: (_v, r) => r.cd_cliente ?? '-' },
    { key: 'cd_prj', header: 'Projeto', render: (_v, r) => r.cd_prj ?? '-' },
    { key: 'ds_abr_prj', header: 'Descrição', render: (_v, r) => r.ds_abr_prj ?? '-' },
    { key: 'cd_rev_pedido', header: 'Revenda', render: (_v, r) => r.cd_rev_pedido ?? '-' },
    { key: 'cd_tns', header: 'TNS', render: (_v, r) => r.cd_tns ?? '-' },
    { key: 'vl_bruto', header: 'Bruto', align: 'right', render: (_v, r) => formatCurrency(n(r.vl_bruto)) },
    { key: 'vl_impostos', header: 'Impostos', align: 'right', render: (_v, r) => formatCurrency(n(r.vl_impostos)) },
    { key: 'vl_liquido', header: 'Líquido', align: 'right', render: (_v, r) => formatCurrency(n(r.vl_liquido)) },
    { key: 'vl_devolucao', header: 'Devolução', align: 'right', render: (_v, r) => formatCurrency(n(r.vl_devolucao)) },
    { key: 'qtd_produtos', header: 'Qtd.', align: 'right', render: (_v, r) => formatNumber(n(r.qtd_produtos)) },
  ];

  const openDetalhes = (escopo: ComercialDetalheEscopo, titleExtra?: string) => {
    const chipsList = [
      { label: 'Unidade', value: filters.unidade_negocio },
      { label: 'Período', value: `${filters.anomes_ini} → ${filters.anomes_fim}` },
      ...chips.map((c) => ({ label: c.label, value: c.value })),
    ];
    drill.openWith({
      title: titleExtra ? `Detalhamento do Drill — ${titleExtra}` : 'Detalhamento do Drill',
      subtitle: ESCOPO_LABELS[escopo],
      chips: chipsList,
      ctx: { escopo },
    });
  };

  // ---------- handlers de drill ----------
  const onClickMensal = (d: any) => applyDrill('anomes_emissao', d?.label ?? d?.anomes_emissao);
  const onClickMix = (d: any) => {
    const map = drillFromMixCategoria(d?.label ?? d?.name ?? '');
    if (map) applyDrill(map.key, map.value);
  };
  const onClickEstado = (d: any) => applyDrill('cd_estado', d?.label ?? d?.uf);
  const onClickMapa = (d: { uf: string; valor: number }) => applyDrill('cd_estado', d.uf);
  const onClickRevenda = (d: any) => applyDrill('cd_rev_pedido', d?.label ?? d?.revenda);
  const onClickObra = (d: any) => {
    // Treemap usa name; ranking usa cd_prj/label
    const found = obrasRank.find((o) => o.label === d?.name || o.label === d?.label);
    const cod = found?.cd_prj ?? d?.cd_prj ?? d?.label ?? d?.name;
    applyDrill('cd_prj', cod);
  };

  // ---------- tabela mensal ----------
  const colsMensal: Column<ComercialMensalRow>[] = [
    { key: 'anomes_emissao', header: 'Ano/Mês', render: (_v, r) => r.anomes_emissao },
    { key: 'faturamento', header: 'Faturamento', align: 'right', render: (_v, r) => formatCurrency(n(r.faturamento)) },
    { key: 'fat_liquido', header: 'Líquido', align: 'right', render: (_v, r) => formatCurrency(n(r.fat_liquido)) },
    { key: 'impostos', header: 'Impostos', align: 'right', render: (_v, r) => formatCurrency(n(r.impostos)) },
    { key: 'devolucao', header: 'Devolução', align: 'right', render: (_v, r) => formatCurrency(n(r.devolucao)) },
    { key: 'numero_vendas', header: 'Nº Vendas', align: 'right', render: (_v, r) => formatNumber(n(r.numero_vendas)) },
    { key: 'numero_clientes', header: 'Nº Clientes', align: 'right', render: (_v, r) => formatNumber(n(r.numero_clientes)) },
    { key: 'quantidade', header: 'Quantidade', align: 'right', render: (_v, r) => formatNumber(n(r.quantidade)) },
    { key: 'ticket_medio', header: 'Ticket Médio', align: 'right', render: (_v, r) => formatCurrency(n(r.ticket_medio)) },
    { key: 'preco_medio', header: 'Preço Médio', align: 'right', render: (_v, r) => formatCurrency(n(r.preco_medio)) },
  ];

  const showRevenda = unidade === 'GENIUS' || unidade === 'CONSOLIDADO';
  const showObras = unidade === 'ESTRUTURAL ZORTEA' || unidade === 'CONSOLIDADO';

  const pageSeries = {
    mensal: dadosCombo,
    mix: donutMix,
    estados: estadoSorted.map((d) => ({ label: d.cd_estado, valor: n(d.faturamento) })),
    revendas: revendaRank,
    obras: obrasRank.map((o) => ({ label: o.label, valor: o.valor })),
  };

  // Overrides globais (para botão "Restaurar layout padrão")
  const slotOverrides = useSlotOverrides(PAGE_KEY);

  return (
    <PageDataProvider
      pageKey={PAGE_KEY}
      kpis={kpis}
      series={pageSeries}
      rows={mensal as any[]}
      filtros={filters as any}
    >
      <DashboardPage>
        <PageHeader
          title="BI Comercial"
          description="Faturamento comercial validado (fonte_acao = VM_FATURAMENTO)."
          actions={
            <div className="flex items-center gap-2">
              <span className={cn('rounded-full px-3 py-0.5 text-xs font-semibold', style.chip)}>
                {unidade}
              </span>
              {slotOverrides.hasAny && (
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => slotOverrides.clearAll()}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurar layout padrão
                </Button>
              )}
              <Button asChild size="sm" variant="outline" className="h-8 gap-1">
                <Link to="/biblioteca-bi">
                  <Sparkles className="h-3.5 w-3.5" />
                  Adicionar componente
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={atualizar} disabled={carregando}>
                <RefreshCw className={cn('mr-1 h-3.5 w-3.5', carregando && 'animate-spin')} />
                Atualizar
              </Button>
            </div>
          }
        />

        {/* Filtros base */}
        <FilterBar>
          <div className="min-w-[180px] flex-1">
            <SelectFilter
              label="Unidade"
              value={draft.unidade_negocio}
              onChange={(v) => setDraft({ ...draft, unidade_negocio: v as UnidadeNegocio })}
              options={UNIDADES.map((u) => ({ value: u, label: u }))}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <Label className="text-xs">AnoMês Início</Label>
            <Input
              className="h-8 text-xs"
              value={draft.anomes_ini}
              placeholder="202601"
              onChange={(e) => setDraft({ ...draft, anomes_ini: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && aplicarFiltrosBase()}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <Label className="text-xs">AnoMês Fim</Label>
            <Input
              className="h-8 text-xs"
              value={draft.anomes_fim}
              placeholder="202606"
              onChange={(e) => setDraft({ ...draft, anomes_fim: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && aplicarFiltrosBase()}
            />
          </div>
          <Button size="sm" className="h-8" onClick={aplicarFiltrosBase}>Aplicar</Button>
        </FilterBar>

        {/* Breadcrumb / chips de drill ativos */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
            <span className="font-semibold text-muted-foreground">Drill ativo:</span>
            <Badge variant="outline" className="font-medium">
              {filters.unidade_negocio}
            </Badge>
            {chips.map((c) => (
              <Badge
                key={c.key}
                variant="secondary"
                className="gap-1 pr-1 font-medium"
              >
                <span className="text-muted-foreground">{c.label}:</span>
                <span>{c.value}</span>
                <button
                  type="button"
                  onClick={() => removeDrill(c.key as BiComercialDrillKey)}
                  aria-label={`Remover filtro ${DRILL_LABELS[c.key as BiComercialDrillKey]}`}
                  className="ml-0.5 rounded-sm p-0.5 hover:bg-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-6 gap-1 px-2 text-xs"
              onClick={clearDrill}
            >
              <X className="h-3 w-3" /> Limpar Drill
            </Button>
          </div>
        )}

        {/* Slot widgets — topo */}
        <UserWidgetsSlot section="kpis" cols={4} emptyHint={false} />

        {/* KPIs */}
        <DashboardSection title="Indicadores">
          {qKpis.isLoading ? (
            <LoadingState height={120} variant="skeleton" />
          ) : qKpis.isError ? (
            <Card><CardContent className="pt-4"><BlocoErro err={qKpis.error} onRetry={() => qKpis.refetch()} /></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {/* destaque */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Clickable onClick={() => openDetalhes('todas', 'Faturamento')}>
                  <KpiTargetCard
                    title="Faturamento vs Meta"
                    value={n(kpis.faturamento)}
                    target={n(kpis.meta)}
                    format="currency"
                  />
                </Clickable>
                <Clickable onClick={() => openDetalhes('todas', 'Diferença vs Meta')}>
                  <KpiVariationCard
                    title="Diferença vs Meta"
                    variation={n(kpis.meta) > 0 ? (n(kpis.diferenca) / n(kpis.meta)) * 100 : 0}
                    subtitle={formatCurrency(n(kpis.diferenca))}
                  />
                </Clickable>
                <Clickable onClick={() => openDetalhes('todas', 'Faturamento mensal')}>
                  <KpiSparklineCard
                    title="Faturamento (mensal)"
                    value={n(kpis.faturamento)}
                    format="currency"
                    series={sparkSerie}
                    trend={sparkTrend}
                    color={style.bar}
                  />
                </Clickable>
              </div>

              {/* demais */}
              <KpiGrid cols={5}>
                <Clickable onClick={() => openDetalhes('todas', 'Faturamento')}>
                  <KpiCard title="Faturamento" value={n(kpis.faturamento)} format="currency" variant="info" />
                </Clickable>
                <Clickable onClick={() => openDetalhes('todas', 'Faturamento Líquido')}>
                  <KpiCard title="Faturamento Líquido" value={n(kpis.fat_liquido)} format="currency" variant="success" />
                </Clickable>
                <Clickable onClick={() => openDetalhes('impostos', 'Impostos')}>
                  <KpiCard title="Impostos" value={n(kpis.impostos)} format="currency" variant="warning" />
                </Clickable>
                <Clickable onClick={() => openDetalhes('devolucao', 'Devoluções')}>
                  <KpiCard title="Devolução" value={n(kpis.devolucao)} format="currency" variant="danger" />
                </Clickable>
                <Clickable onClick={() => openDetalhes('todas', 'Quantidade')}>
                  <KpiCard title="Quantidade" value={n(kpis.quantidade)} format="quantity" />
                </Clickable>
                <Clickable onClick={() => openDetalhes('vendas', 'Nº Vendas')}>
                  <KpiCard title="Nº Vendas" value={n(kpis.numero_vendas)} format="number" />
                </Clickable>
                <Clickable onClick={() => openDetalhes('clientes', 'Nº Clientes')}>
                  <KpiCard title="Nº Clientes" value={n(kpis.numero_clientes)} format="number" />
                </Clickable>
                <Clickable onClick={() => openDetalhes('estados', 'Nº Estados')}>
                  <KpiCard title="Nº Estados" value={n(kpis.numero_estados)} format="number" />
                </Clickable>
                <Clickable onClick={() => openDetalhes('todas', 'Ticket Médio')}>
                  <KpiCard title="Ticket Médio" value={n(kpis.ticket_medio)} format="currency" />
                </Clickable>
                <Clickable onClick={() => openDetalhes('todas', 'Preço Médio')}>
                  <KpiCard title="Preço Médio" value={n(kpis.preco_medio)} format="currency" />
                </Clickable>
              </KpiGrid>
            </div>
          )}
        </DashboardSection>

        <UserWidgetsSlot section="kpis" cols={4} emptyHint={false} />

        {/* Mensal + Mix */}
        <DashboardSection title="Evolução e Mix">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {qMensal.isLoading ? <LoadingState height={280} /> :
              qMensal.isError ? <BlocoErro err={qMensal.error} onRetry={() => qMensal.refetch()} /> :
              dadosCombo.length === 0 ? <EmptyState description={EMPTY_MSG} height={280} /> :
              <BiSlot
                slot={COMERCIAL_SLOTS.mensal}
                color={style.bar}
                onItemClick={onClickMensal}
                defaultRender={() => (
                  <ComboChartCard
                    title="Faturamento mensal x Meta — clique p/ filtrar"
                    data={dadosCombo}
                    barKey="faturamento"
                    barLabel="Faturamento"
                    lineKey="meta"
                    lineLabel="Meta"
                    barColor={style.bar}
                    onItemClick={onClickMensal}
                  />
                )}
              />}
            {qMix.isLoading ? <LoadingState height={280} /> :
              qMix.isError ? <BlocoErro err={qMix.error} onRetry={() => qMix.refetch()} /> :
              donutMix.length === 0 ? <EmptyState description={EMPTY_MSG} height={280} /> :
              <BiSlot
                slot={COMERCIAL_SLOTS.mix}
                onItemClick={onClickMix}
                defaultRender={() => (
                  <DonutChartCard
                    title="Mix acumulado — clique p/ filtrar"
                    data={donutMix}
                    onItemClick={onClickMix}
                  />
                )}
              />}
          </div>
        </DashboardSection>

        {/* Tabela mensal */}
        <DashboardSection title="Detalhamento mensal">
          <Card>
            <CardContent className="pt-4">
              {qMensal.isLoading ? <LoadingState height={200} variant="skeleton" /> :
                qMensal.isError ? <BlocoErro err={qMensal.error} onRetry={() => qMensal.refetch()} /> :
                mensal.length === 0 ? <EmptyState description={EMPTY_MSG} /> :
                <DataTableBI
                  columns={colsMensal}
                  data={mensal}
                  onRowClick={(r) => applyDrill('anomes_emissao', r.anomes_emissao)}
                />}
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Estado */}
        <DashboardSection title="Distribuição por estado">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {qEstado.isLoading ? <LoadingState height={280} /> :
              qEstado.isError ? <BlocoErro err={qEstado.error} onRetry={() => qEstado.refetch()} /> :
              horizTop.length === 0 ? <EmptyState description={EMPTY_MSG} height={280} /> :
              <HorizontalBarChartCard
                title="Top estados — clique p/ filtrar"
                data={horizTop}
                color={style.bar}
                yWidth={60}
                onItemClick={onClickEstado}
              />}
            {qEstado.isLoading ? <LoadingState height={280} /> :
              qEstado.isError ? <BlocoErro err={qEstado.error} onRetry={() => qEstado.refetch()} /> :
              mapaData.length === 0 ? <EmptyState description={EMPTY_MSG} height={280} /> :
              <BrazilMapCard
                title="Faturamento por estado — clique p/ filtrar"
                data={mapaData}
                colorVar={style.mapVar}
                onItemClick={onClickMapa}
              />}
          </div>
        </DashboardSection>

        <UserWidgetsSlot section="charts" cols={3} emptyHint={false} />

        {/* Revendas e Obras */}
        {(showRevenda || showObras) && (
          <DashboardSection title={showRevenda && showObras ? 'Revendas e Obras' : showRevenda ? 'Revendas (GENIUS)' : 'Obras (ESTRUTURAL)'}>
            <div className={cn('grid grid-cols-1 gap-4', showRevenda && showObras && 'lg:grid-cols-2')}>
              {showRevenda && (
                <div className="space-y-3">
                  {qRevenda.isLoading ? <LoadingState height={280} /> :
                    qRevenda.isError ? <BlocoErro err={qRevenda.error} onRetry={() => qRevenda.refetch()} /> :
                    revendaRank.length === 0 ? <EmptyState description={EMPTY_MSG} height={280} /> :
                    <RankingChartCard
                      title="GENIUS — Ranking de revendas (clique)"
                      data={revendaRank}
                      topN={10}
                      onItemClick={onClickRevenda}
                    />}
                  {!qRevenda.isLoading && !qRevenda.isError && revendaRank.length > 0 && (
                    <Card><CardContent className="pt-4">
                      <RankingTable data={revendaRank} topN={20} onItemClick={onClickRevenda} />
                    </CardContent></Card>
                  )}
                </div>
              )}
              {showObras && (
                <div className="space-y-3">
                  {qObras.isLoading ? <LoadingState height={280} /> :
                    qObras.isError ? <BlocoErro err={qObras.error} onRetry={() => qObras.refetch()} /> :
                    obrasTreeData.length === 0 ? <EmptyState description={EMPTY_MSG} height={280} /> :
                    <TreemapChartCard
                      title="ESTRUTURAL ZORTEA — Faturamento por obra (clique)"
                      data={obrasTreeData}
                      onItemClick={onClickObra}
                    />}
                  {!qObras.isLoading && !qObras.isError && obrasRank.length > 0 && (
                    <Card><CardContent className="pt-4">
                      <RankingTable
                        data={obrasRank.map((o) => ({ label: o.label, valor: o.valor }))}
                        topN={20}
                        onItemClick={onClickObra}
                      />
                    </CardContent></Card>
                  )}
                </div>
              )}
            </div>
          </DashboardSection>
        )}

        <UserWidgetsSlot section="tables" cols={2} emptyHint={false} />
      </DashboardPage>

      {/* Drawer de detalhes */}
      <DrillSheet {...drill.sheetProps}>
        {qDetalhes.isLoading ? (
          <LoadingState height={300} variant="skeleton" />
        ) : qDetalhes.isError ? (
          <BlocoErro err={qDetalhes.error} onRetry={() => qDetalhes.refetch()} msg={ERR_DRILL} />
        ) : detalhesRows.length === 0 ? (
          <EmptyState description="Sem registros para os filtros selecionados" />
        ) : (
          <DataTableBI columns={colsDetalhes} data={detalhesRows} />
        )}
      </DrillSheet>
    </PageDataProvider>
  );
}
