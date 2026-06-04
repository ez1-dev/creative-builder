import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  DashboardPage,
  DashboardSection,
} from '@/components/bi/layout/DashboardLayout';
import { PageDataProvider } from '@/lib/bi/PageDataContext';
import {
  fetchComercialKpis,
  fetchComercialMensal,
  fetchComercialMix,
  fetchComercialEstado,
  fetchComercialRevenda,
  fetchComercialObras,
  type ComercialParams,
  type UnidadeNegocio,
  type ComercialMensalRow,
} from '@/lib/bi/comercialApi';
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
const EMPTY_MSG = 'Sem dados para o período selecionado';
const PAGE_KEY = 'bi-comercial';

function BlocoErro({ err, onRetry }: { err: unknown; onRetry: () => void }) {
  return (
    <ErrorState
      title={ERR_MSG}
      message={String((err as any)?.message ?? '')}
      onRetry={onRetry}
    />
  );
}

export default function ComercialPage() {
  const [draft, setDraft] = useState<ComercialParams>({
    anomes_ini: '202601',
    anomes_fim: '202606',
    unidade_negocio: 'GENIUS',
  });
  const [filtros, setFiltros] = useState<ComercialParams>(draft);

  const style = UNIDADE_STYLE[filtros.unidade_negocio];
  const unidade = filtros.unidade_negocio;

  const qKpis = useQuery({
    queryKey: ['bi-comercial', 'kpis', filtros],
    queryFn: () => fetchComercialKpis(filtros),
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const qMensal = useQuery({
    queryKey: ['bi-comercial', 'mensal', filtros],
    queryFn: () => fetchComercialMensal(filtros),
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const qMix = useQuery({
    queryKey: ['bi-comercial', 'mix', filtros],
    queryFn: () => fetchComercialMix(filtros),
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const qEstado = useQuery({
    queryKey: ['bi-comercial', 'estado', filtros],
    queryFn: () => fetchComercialEstado(filtros),
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const qRevenda = useQuery({
    queryKey: ['bi-comercial', 'revenda', filtros],
    queryFn: () => fetchComercialRevenda(filtros),
    enabled: unidade === 'GENIUS' || unidade === 'CONSOLIDADO',
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const qObras = useQuery({
    queryKey: ['bi-comercial', 'obras', filtros],
    queryFn: () => fetchComercialObras(filtros),
    enabled: unidade === 'ESTRUTURAL ZORTEA' || unidade === 'CONSOLIDADO',
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const aplicar = () => setFiltros({ ...draft });
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

  // ----- gráficos derivados -----
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
    () => obrasRows.map((o) => ({ label: o.projeto || o.cd_prj, valor: n(o.faturamento) })),
    [obrasRows],
  );
  const obrasTreeData = useMemo(
    () => obrasRank.slice().sort((a, b) => b.valor - a.valor).slice(0, 30)
      .map((o) => ({ name: o.label, value: o.valor })),
    [obrasRank],
  );

  // ----- colunas da tabela mensal -----
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

  // ----- PageDataContext: dados expostos para widgets aplicados -----
  const pageSeries = {
    mensal: dadosCombo.map((m) => ({ label: m.label, valor: m.faturamento })),
    mix: donutMix,
    estados: estadoSorted.map((d) => ({ label: d.cd_estado, valor: n(d.faturamento) })),
    revendas: revendaRank,
    obras: obrasRank,
  };

  return (
    <PageDataProvider
      pageKey={PAGE_KEY}
      kpis={kpis}
      series={pageSeries}
      rows={mensal as any[]}
      filtros={filtros as any}
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

        {/* Filtros */}
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
              onKeyDown={(e) => e.key === 'Enter' && aplicar()}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <Label className="text-xs">AnoMês Fim</Label>
            <Input
              className="h-8 text-xs"
              value={draft.anomes_fim}
              placeholder="202606"
              onChange={(e) => setDraft({ ...draft, anomes_fim: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && aplicar()}
            />
          </div>
          <Button size="sm" className="h-8" onClick={aplicar}>Aplicar</Button>
        </FilterBar>

        {/* Slot: topo */}
        <UserWidgetsSlot section="kpis" cols={4} emptyHint={false} />

        {/* KPIs principais */}
        <DashboardSection title="Indicadores">
          {qKpis.isLoading ? (
            <LoadingState height={120} variant="skeleton" />
          ) : qKpis.isError ? (
            <Card><CardContent className="pt-4"><BlocoErro err={qKpis.error} onRetry={() => qKpis.refetch()} /></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {/* destaque: meta / variação / sparkline */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <KpiTargetCard
                  title="Faturamento vs Meta"
                  value={n(kpis.faturamento)}
                  target={n(kpis.meta)}
                  format="currency"
                />
                <KpiVariationCard
                  title="Diferença vs Meta"
                  variation={n(kpis.meta) > 0 ? (n(kpis.diferenca) / n(kpis.meta)) * 100 : 0}
                  subtitle={formatCurrency(n(kpis.diferenca))}
                />
                <KpiSparklineCard
                  title="Faturamento (mensal)"
                  value={n(kpis.faturamento)}
                  format="currency"
                  series={sparkSerie}
                  trend={sparkTrend}
                  color={style.bar}
                />
              </div>

              {/* demais KPIs */}
              <KpiGrid cols={5}>
                <KpiCard title="Faturamento" value={n(kpis.faturamento)} format="currency" variant="info" />
                <KpiCard title="Faturamento Líquido" value={n(kpis.fat_liquido)} format="currency" variant="success" />
                <KpiCard title="Impostos" value={n(kpis.impostos)} format="currency" variant="warning" />
                <KpiCard title="Devolução" value={n(kpis.devolucao)} format="currency" variant="danger" />
                <KpiCard title="Quantidade" value={n(kpis.quantidade)} format="quantity" />
                <KpiCard title="Nº Vendas" value={n(kpis.numero_vendas)} format="number" />
                <KpiCard title="Nº Clientes" value={n(kpis.numero_clientes)} format="number" />
                <KpiCard title="Nº Estados" value={n(kpis.numero_estados)} format="number" />
                <KpiCard title="Ticket Médio" value={n(kpis.ticket_medio)} format="currency" />
                <KpiCard title="Preço Médio" value={n(kpis.preco_medio)} format="currency" />
              </KpiGrid>
            </div>
          )}
        </DashboardSection>

        {/* Slot: pós-KPIs */}
        <UserWidgetsSlot section="kpis" cols={4} emptyHint={false} />

        {/* Mensal + Mix */}
        <DashboardSection title="Evolução e Mix">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {qMensal.isLoading ? <LoadingState height={280} /> :
              qMensal.isError ? <BlocoErro err={qMensal.error} onRetry={() => qMensal.refetch()} /> :
              dadosCombo.length === 0 ? <EmptyState description={EMPTY_MSG} height={280} /> :
              <ComboChartCard
                title="Faturamento mensal x Meta"
                data={dadosCombo}
                barKey="faturamento"
                barLabel="Faturamento"
                lineKey="meta"
                lineLabel="Meta"
                barColor={style.bar}
              />}
            {qMix.isLoading ? <LoadingState height={280} /> :
              qMix.isError ? <BlocoErro err={qMix.error} onRetry={() => qMix.refetch()} /> :
              donutMix.length === 0 ? <EmptyState description={EMPTY_MSG} height={280} /> :
              <DonutChartCard title="Mix acumulado" data={donutMix} />}
          </div>
        </DashboardSection>

        {/* Tabela mensal */}
        <DashboardSection title="Detalhamento mensal">
          <Card>
            <CardContent className="pt-4">
              {qMensal.isLoading ? <LoadingState height={200} variant="skeleton" /> :
                qMensal.isError ? <BlocoErro err={qMensal.error} onRetry={() => qMensal.refetch()} /> :
                mensal.length === 0 ? <EmptyState description={EMPTY_MSG} /> :
                <DataTableBI columns={colsMensal} data={mensal} />}
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Estado: ranking + mapa */}
        <DashboardSection title="Distribuição por estado">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {qEstado.isLoading ? <LoadingState height={280} /> :
              qEstado.isError ? <BlocoErro err={qEstado.error} onRetry={() => qEstado.refetch()} /> :
              horizTop.length === 0 ? <EmptyState description={EMPTY_MSG} height={280} /> :
              <HorizontalBarChartCard
                title="Top estados (faturamento)"
                data={horizTop}
                color={style.bar}
                yWidth={60}
              />}
            {qEstado.isLoading ? <LoadingState height={280} /> :
              qEstado.isError ? <BlocoErro err={qEstado.error} onRetry={() => qEstado.refetch()} /> :
              mapaData.length === 0 ? <EmptyState description={EMPTY_MSG} height={280} /> :
              <BrazilMapCard title="Faturamento por estado" data={mapaData} colorVar={style.mapVar} />}
          </div>
        </DashboardSection>

        {/* Slot: pós-gráficos */}
        <UserWidgetsSlot section="charts" cols={3} emptyHint={false} />

        {/* Bloco específico por unidade */}
        {(showRevenda || showObras) && (
          <DashboardSection title={showRevenda && showObras ? 'Revendas e Obras' : showRevenda ? 'Revendas (GENIUS)' : 'Obras (ESTRUTURAL)'}>
            <div className={cn('grid grid-cols-1 gap-4', showRevenda && showObras && 'lg:grid-cols-2')}>
              {showRevenda && (
                <div className="space-y-3">
                  {qRevenda.isLoading ? <LoadingState height={280} /> :
                    qRevenda.isError ? <BlocoErro err={qRevenda.error} onRetry={() => qRevenda.refetch()} /> :
                    revendaRank.length === 0 ? <EmptyState description={EMPTY_MSG} height={280} /> :
                    <RankingChartCard
                      title="GENIUS — Ranking de revendas"
                      data={revendaRank}
                      topN={10}
                    />}
                  {!qRevenda.isLoading && !qRevenda.isError && revendaRank.length > 0 && (
                    <Card><CardContent className="pt-4">
                      <RankingTable data={revendaRank} topN={20} />
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
                      title="ESTRUTURAL ZORTEA — Faturamento por obra"
                      data={obrasTreeData}
                    />}
                  {!qObras.isLoading && !qObras.isError && obrasRank.length > 0 && (
                    <Card><CardContent className="pt-4">
                      <RankingTable data={obrasRank} topN={20} />
                    </CardContent></Card>
                  )}
                </div>
              )}
            </div>
          </DashboardSection>
        )}

        {/* Slot: rodapé (tabelas personalizadas) */}
        <UserWidgetsSlot section="tables" cols={2} emptyHint={false} />
      </DashboardPage>
    </PageDataProvider>
  );
}
