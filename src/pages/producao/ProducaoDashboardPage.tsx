import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { ExportButton } from '@/components/erp/ExportButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';
import { useAiPageContext } from '@/hooks/useAiPageContext';
import {
  AlertTriangle, SearchX, RefreshCw, Package, Truck, Warehouse, Layers,
  AlertCircle, Hourglass, Activity, Gauge,
} from 'lucide-react';
import { DashboardCharts } from './components/DashboardCharts';
import { KpiGrid, KpiCard, UserWidgetsSlot } from '@/components/bi';
import { DrillSheet, useDrillSheet } from '@/components/bi/drill/DrillSheet';
import { PageDataProvider } from '@/lib/bi/PageDataContext';
import {
  fetchProducaoVisaoGeral,
  type ProducaoFiltros,
  type ProducaoResumo,
} from '@/lib/producao/visaoGeralApi';

/** Compat: mantida para o componente DashboardCharts que importa daqui. */
export interface DashboardResumo {
  kg_engenharia: number;
  kg_produzido: number;
  kg_expedido: number;
  kg_patio: number;
  itens_nao_carregados: number;
  projetos_aguardando_producao: number;
  projetos_em_producao: number;
  projetos_parcialmente_expedidos: number;
  projetos_expedidos: number;
  leadtime_medio_engenharia_producao: number;
  leadtime_medio_producao_expedicao: number;
  leadtime_medio_total: number;
  quantidade_cargas: number;
}

export interface TopProjetoPatio {
  numero_projeto: number;
  numero_desenho: number;
  revisao: string;
  kg_patio: number;
  kg_produzido: number;
  kg_expedido: number;
  kg_engenharia: number;
  status_patio: string;
  cliente: string;
  [k: string]: any;
}

export interface CargaPorMes {
  periodo: string;
  quantidade_cargas: number;
}

export interface DashboardData {
  resumo: DashboardResumo;
  top_projetos_patio: TopProjetoPatio[];
  cargas_por_mes: CargaPorMes[];
}

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function toDashboardResumo(p?: ProducaoResumo | null): DashboardResumo {
  return {
    kg_engenharia: num(p?.kg_engenharia),
    kg_produzido: num(p?.kg_produzido),
    kg_expedido: num(p?.kg_expedido),
    kg_patio: num(p?.kg_patio),
    itens_nao_carregados: num(p?.itens_nao_carregados),
    projetos_aguardando_producao: num(p?.projetos_aguardando_producao),
    projetos_em_producao: num(p?.projetos_em_producao),
    projetos_parcialmente_expedidos: num(p?.projetos_parcialmente_expedidos),
    projetos_expedidos: num(p?.projetos_expedidos),
    leadtime_medio_engenharia_producao: num(
      p?.leadtime_medio_engenharia ?? p?.leadtime_medio_engenharia_producao,
    ),
    leadtime_medio_producao_expedicao: num(
      p?.leadtime_medio_producao ?? p?.leadtime_medio_producao_expedicao,
    ),
    leadtime_medio_total: num(p?.leadtime_medio_total),
    quantidade_cargas: num(p?.quantidade_cargas),
  };
}

function isResumoEmpty(r: DashboardResumo): boolean {
  return Object.values(r).every((v) => v === 0 || v === null || v === undefined);
}

interface DrillItem {
  label: string;
  value: string;
  projeto?: TopProjetoPatio;
}

function buildProjectDetails(
  projetos: TopProjetoPatio[],
  key: keyof Pick<TopProjetoPatio, 'kg_produzido' | 'kg_expedido' | 'kg_patio' | 'kg_engenharia'>,
): DrillItem[] {
  return projetos
    .filter((p) => (p[key] ?? 0) > 0)
    .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))
    .slice(0, 10)
    .map((p) => ({
      label: `Proj ${p.numero_projeto} / Des ${p.numero_desenho} Rev ${p.revisao}`,
      value: `${formatNumber(p[key], 0)} Kg`,
      projeto: p,
    }));
}

function buildStatusDetails(projetos: TopProjetoPatio[], ...keywords: string[]): DrillItem[] {
  const upper = keywords.map((k) => k.toUpperCase());
  return projetos
    .filter((p) => {
      const s = (p.status_patio ?? '').toUpperCase();
      return upper.some((k) => s.includes(k));
    })
    .slice(0, 15)
    .map((p) => ({
      label: `Proj ${p.numero_projeto} / Des ${p.numero_desenho} Rev ${p.revisao}`,
      value: (p.cliente ?? '').length > 25 ? (p.cliente ?? '').slice(0, 25) + '…' : (p.cliente ?? '-'),
      projeto: p,
    }));
}

function buildProjetoBreakdown(p: TopProjetoPatio): DrillItem[] {
  return [
    { label: 'Cliente', value: p.cliente ?? '-' },
    { label: 'Status pátio', value: p.status_patio ?? '-' },
    { label: 'Kg Previsto (engenharia)', value: `${formatNumber(p.kg_engenharia, 0)} Kg` },
    { label: 'Kg Produzido', value: `${formatNumber(p.kg_produzido, 0)} Kg` },
    { label: 'Kg Expedido', value: `${formatNumber(p.kg_expedido, 0)} Kg` },
    { label: 'Kg em Pátio', value: `${formatNumber(p.kg_patio, 0)} Kg` },
  ];
}

const EMPTY_FILTROS: ProducaoFiltros = {
  numero_projeto: '', numero_desenho: '', revisao: '', cliente: '', cidade: '',
};

export default function ProducaoDashboardPage() {
  const [filters, setFilters] = useState<ProducaoFiltros>(EMPTY_FILTROS);
  const [filtrosAplicados, setFiltrosAplicados] = useState<ProducaoFiltros>(EMPTY_FILTROS);
  const [buscou, setBuscou] = useState(false);
  const [tab, setTab] = useState<'resumo' | 'carga'>('resumo');
  const erpReady = useErpReady();
  const drill = useDrillSheet<{ items: DrillItem[] }>();

  const openDrill = (payload: Parameters<typeof drill.openWith>[0]) => {
    const snap = filters;
    drill.openWith(payload, { restore: () => setFilters(snap) });
  };
  const pushProjeto = (it: DrillItem) => {
    if (!it.projeto) return;
    drill.push({
      title: `Projeto ${it.projeto.numero_projeto} · Des ${it.projeto.numero_desenho}`,
      subtitle: it.projeto.cliente ?? undefined,
      chips: [{ label: 'Projeto', value: it.projeto.numero_projeto }],
      ctx: { items: buildProjetoBreakdown(it.projeto) },
    });
  };

  const qResumo = useQuery({
    queryKey: ['producao', 'visao-geral', filtrosAplicados, false],
    queryFn: () => fetchProducaoVisaoGeral(filtrosAplicados, false),
    enabled: erpReady && buscou,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const qCarga = useQuery({
    queryKey: ['producao', 'visao-geral', filtrosAplicados, true],
    queryFn: () => fetchProducaoVisaoGeral(filtrosAplicados, true),
    enabled: erpReady && buscou && tab === 'carga',
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const search = useCallback(() => {
    if (!erpReady) {
      toast.error('Conexão ERP não disponível.');
      return;
    }
    setFiltrosAplicados({ ...filters });
    setBuscou(true);
  }, [filters, erpReady]);

  const clearFilters = () => {
    setFilters(EMPTY_FILTROS);
    setFiltrosAplicados(EMPTY_FILTROS);
    setBuscou(false);
  };

  useAiFilters('producao-dashboard', setFilters, () => search());

  useEffect(() => {
    if (qResumo.error) {
      // eslint-disable-next-line no-console
      console.error('[producao] visao-geral erro', qResumo.error);
    }
  }, [qResumo.error]);

  const resumo = useMemo(
    () => toDashboardResumo(qResumo.data?.producao),
    [qResumo.data?.producao],
  );
  const topProjetos = useMemo<TopProjetoPatio[]>(
    () => (qResumo.data?.top_projetos_patio ?? []) as TopProjetoPatio[],
    [qResumo.data?.top_projetos_patio],
  );
  const cargasPorMes = useMemo<CargaPorMes[]>(
    () => (qResumo.data?.cargas_por_mes ?? []) as CargaPorMes[],
    [qResumo.data?.cargas_por_mes],
  );

  useAiPageContext({
    title: 'Dashboard Produção',
    filters: filtrosAplicados,
    kpis: qResumo.data?.producao ? {
      'Kg Previsto': formatNumber(resumo.kg_engenharia, 0),
      'Kg Produzido': formatNumber(resumo.kg_produzido, 0),
      'Kg Expedido': formatNumber(resumo.kg_expedido, 0),
      'Kg Pátio': formatNumber(resumo.kg_patio, 0),
      'Qtd Cargas': resumo.quantidade_cargas,
      'Itens Não Carregados': resumo.itens_nao_carregados,
      'Em Produção': resumo.projetos_em_producao,
      'LT Total (dias)': resumo.leadtime_medio_total,
    } : undefined,
    summary: qResumo.isSuccess
      ? `Visão geral carregada; ${topProjetos.length} projetos no top pátio`
      : qResumo.isFetching ? 'Carregando visão geral...' : undefined,
  });

  const resumoStatus: 'idle' | 'loading' | 'error' | 'empty' | 'success' =
    !buscou ? 'idle'
      : qResumo.isFetching && !qResumo.data ? 'loading'
      : qResumo.isError ? 'error'
      : qResumo.data && qResumo.data.producao && !isResumoEmpty(resumo) ? 'success'
      : qResumo.data ? 'empty'
      : 'loading';

  const errorMsg = useMemo(() => {
    const err = qResumo.error as any;
    if (!err) return '';
    if (err?.statusCode === 404) return 'Atualização do backend ainda não disponível.';
    return err?.message || 'Não foi possível carregar a visão geral da produção.';
  }, [qResumo.error]);

  const dashboardData: DashboardData = {
    resumo,
    top_projetos_patio: topProjetos,
    cargas_por_mes: cargasPorMes,
  };

  return (
    <PageDataProvider
      pageKey="producao-dashboard"
      kpis={qResumo.data?.producao ? {
        total_produzido: resumo.kg_produzido,
        total_expedido: resumo.kg_expedido,
        em_estoque: resumo.kg_patio,
        meta_semanal: resumo.kg_engenharia,
      } : null}
      series={{
        cargas_por_mes: cargasPorMes.map((c) => ({ label: c.periodo, valor: Number(c.quantidade_cargas ?? 0) })),
        top_projetos_patio: topProjetos.map((p) => ({ label: `Proj ${p.numero_projeto}`, valor: Number(p.kg_patio ?? 0) })),
        top_projetos_produzido: topProjetos.map((p) => ({ label: `Proj ${p.numero_projeto}`, valor: Number(p.kg_produzido ?? 0) })),
      }}
      rows={topProjetos}
      filtros={filtrosAplicados}
    >
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Dashboard Produção"
        description="Visão gerencial de produção, expedição e pátio"
        actions={<ExportButton endpoint="/api/export/producao-patio" params={filtrosAplicados} />}
      />
      <FilterPanel onSearch={search} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto ?? ''} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.numero_desenho ?? ''} onChange={(e) => setFilters(f => ({ ...f, numero_desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao ?? ''} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente ?? ''} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={filters.cidade ?? ''} onChange={(e) => setFilters(f => ({ ...f, cidade: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'resumo' | 'carga')}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="carga">Carga</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4 space-y-4">
          {resumoStatus === 'loading' && (
            <>
              <KpiGrid cols={7}>
                {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
              </KpiGrid>
              <Skeleton className="h-64 w-full" />
            </>
          )}

          {resumoStatus === 'error' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{qResumo.error && (qResumo.error as any).statusCode === 404 ? 'Backend em atualização' : 'Erro na consulta'}</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                {errorMsg}
                <Button variant="outline" size="sm" onClick={() => qResumo.refetch()} className="ml-2">
                  <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {resumoStatus === 'empty' && (
            <Alert>
              <SearchX className="h-4 w-4" />
              <AlertTitle>Sem resultados</AlertTitle>
              <AlertDescription>Nenhum dado encontrado para os filtros informados.</AlertDescription>
            </Alert>
          )}

          {resumoStatus === 'idle' && (
            <Alert>
              <AlertDescription>Ajuste os filtros e clique em Buscar para carregar a visão geral da produção.</AlertDescription>
            </Alert>
          )}

          {resumoStatus === 'success' && (
            <>
              <KpiGrid cols={7}>
                <KpiCard title="Kg Previsto" value={formatNumber(resumo.kg_engenharia, 0)} variant="info"
                  icon={<Layers className="h-4 w-4" />} tooltip="Peso previsto em engenharia"
                  onClick={() => openDrill({ title: 'Kg Previsto — Top projetos', chips: [{ label: 'Métrica', value: 'kg_engenharia' }], ctx: { items: buildProjectDetails(topProjetos, 'kg_engenharia') } })} />
                <KpiCard title="Kg Produzido" value={formatNumber(resumo.kg_produzido, 0)} variant="success"
                  icon={<Package className="h-4 w-4" />} tooltip="Total produzido (entrada estoque)"
                  onClick={() => openDrill({ title: 'Kg Produzido — Top projetos', chips: [{ label: 'Métrica', value: 'kg_produzido' }], ctx: { items: buildProjectDetails(topProjetos, 'kg_produzido') } })} />
                <KpiCard title="Kg Expedido" value={formatNumber(resumo.kg_expedido, 0)} variant="success"
                  icon={<Truck className="h-4 w-4" />} tooltip="Total expedido (romaneio)"
                  onClick={() => openDrill({ title: 'Kg Expedido — Top projetos', chips: [{ label: 'Métrica', value: 'kg_expedido' }], ctx: { items: buildProjectDetails(topProjetos, 'kg_expedido') } })} />
                <KpiCard title="Kg Pátio" value={formatNumber(resumo.kg_patio, 0)} variant="warning"
                  icon={<Warehouse className="h-4 w-4" />} tooltip="Saldo em pátio (produzido − expedido)"
                  onClick={() => openDrill({ title: 'Kg em Pátio — Top projetos', chips: [{ label: 'Métrica', value: 'kg_patio' }], ctx: { items: buildProjectDetails(topProjetos, 'kg_patio') } })} />
                <KpiCard title="Qtd Cargas" value={resumo.quantidade_cargas} icon={<Truck className="h-4 w-4" />} />
                <KpiCard title="Itens Não Carreg." value={resumo.itens_nao_carregados} variant="warning"
                  icon={<AlertCircle className="h-4 w-4" />} tooltip="Itens produzidos ainda não carregados" />
                <KpiCard title="Aguardando Prod." value={resumo.projetos_aguardando_producao}
                  icon={<Hourglass className="h-4 w-4" />} tooltip="Projetos aguardando início de produção"
                  onClick={() => openDrill({ title: 'Aguardando Produção', chips: [{ label: 'Status', value: 'AGUARDANDO' }], ctx: { items: buildStatusDetails(topProjetos, 'AGUARDANDO') } })} />
              </KpiGrid>
              <KpiGrid cols={6}>
                <KpiCard title="Em Produção" value={resumo.projetos_em_producao} variant="info"
                  tooltip="Projetos em fase de produção ou sem entrada em estoque"
                  onClick={() => openDrill({ title: 'Em Produção', chips: [{ label: 'Status', value: 'EM PRODUÇÃO' }], ctx: { items: buildStatusDetails(topProjetos, 'PRODUÇÃO') } })} />
                <KpiCard title="Parcial Expedido" value={resumo.projetos_parcialmente_expedidos} variant="warning"
                  tooltip="Projetos com expedição parcial"
                  onClick={() => openDrill({ title: 'Parcialmente Expedidos', chips: [{ label: 'Status', value: 'PARCIAL' }], ctx: { items: buildStatusDetails(topProjetos, 'PARCIAL') } })} />
                <KpiCard title="Total Expedidos" value={resumo.projetos_expedidos} variant="success"
                  tooltip="Projetos totalmente expedidos"
                  onClick={() => openDrill({ title: 'Totalmente Expedidos', chips: [{ label: 'Status', value: 'EXPEDIDO' }], ctx: { items: buildStatusDetails(topProjetos, 'EXPEDIDO') } })} />
                <KpiCard title="LT Eng→Prod (dias)" value={resumo.leadtime_medio_engenharia_producao} />
                <KpiCard title="LT Prod→Exp (dias)" value={resumo.leadtime_medio_producao_expedicao} />
                <KpiCard title="LT Total (dias)" value={resumo.leadtime_medio_total} variant="info" />
              </KpiGrid>

              <DashboardCharts data={dashboardData} />

              <UserWidgetsSlot section="kpis" cols={4} emptyHint={true} />
              <UserWidgetsSlot section="charts" cols={3} emptyHint={false} />
              <UserWidgetsSlot section="tables" cols={2} emptyHint={false} />
            </>
          )}
        </TabsContent>

        <TabsContent value="carga" className="mt-4 space-y-4">
          <CargaResumoCard
            loading={qCarga.isFetching}
            error={qCarga.error as any}
            carga={qCarga.data?.carga ?? null}
            fetched={!!qCarga.data}
            onRefetch={() => qCarga.refetch()}
            disabled={!buscou}
          />
        </TabsContent>
      </Tabs>

      <DrillSheet {...drill.sheetProps}>
        {drill.state.ctx && drill.state.ctx.items.length > 0 ? (
          <ul className="divide-y">
            {drill.state.ctx.items.map((it, i) => {
              const clickable = !!it.projeto && drill.levels.length === 1;
              return (
                <li
                  key={i}
                  onClick={clickable ? () => pushProjeto(it) : undefined}
                  className={`flex items-center justify-between gap-3 py-2 text-sm ${
                    clickable ? 'cursor-pointer hover:bg-muted/50 -mx-3 px-3 rounded transition-colors' : ''
                  }`}
                >
                  <span className="text-foreground truncate">{it.label}</span>
                  <span className="text-muted-foreground tabular-nums">{it.value}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sem registros para detalhar.</p>
        )}
      </DrillSheet>
    </div>
    </PageDataProvider>
  );
}

function CargaResumoCard({
  loading, error, carga, fetched, onRefetch, disabled,
}: {
  loading: boolean;
  error: any;
  carga: { ocupacao_media_percentual?: number | null; qtd_gargalos?: number | null; obras_em_producao?: number | null } | null;
  fetched: boolean;
  onRefetch: () => void;
  disabled: boolean;
}) {
  if (disabled) {
    return (
      <Alert>
        <AlertDescription>Aplique os filtros e clique em Buscar antes de consultar a carga.</AlertDescription>
      </Alert>
    );
  }
  if (loading) {
    return (
      <KpiGrid cols={3}>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </KpiGrid>
    );
  }
  if (error) {
    const is404 = error?.statusCode === 404;
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{is404 ? 'Backend em atualização' : 'Erro ao consultar carga'}</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          {is404 ? 'Atualização do backend ainda não disponível.' : (error?.message || 'Não foi possível carregar os indicadores de carga.')}
          <Button variant="outline" size="sm" onClick={onRefetch} className="ml-2">
            <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (!fetched || carga === null || carga === undefined) {
    return (
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertTitle>Indicadores de carga ainda não carregados</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          Os indicadores da aba Carga são carregados sob demanda.
          <Button variant="outline" size="sm" onClick={onRefetch} className="ml-2">
            <RefreshCw className="h-3 w-3 mr-1" /> Carregar agora
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  const ocup = carga.ocupacao_media_percentual;
  return (
    <KpiGrid cols={3}>
      <KpiCard
        title="Ocupação Média"
        value={ocup === null || ocup === undefined ? '-' : `${formatNumber(ocup, 1)}%`}
        icon={<Gauge className="h-4 w-4" />}
        variant="info"
        tooltip="Percentual médio de ocupação da carga no período"
      />
      <KpiCard
        title="Qtd Gargalos"
        value={carga.qtd_gargalos ?? '-'}
        icon={<AlertCircle className="h-4 w-4" />}
        variant="warning"
      />
      <KpiCard
        title="Obras em Produção"
        value={carga.obras_em_producao ?? '-'}
        icon={<Warehouse className="h-4 w-4" />}
      />
    </KpiGrid>
  );
}
