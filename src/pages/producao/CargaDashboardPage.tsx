import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Boxes, ClipboardList, Clock, Timer, AlertTriangle, Layers, Factory } from 'lucide-react';
import { CargaFiltersBar } from '@/components/producao/carga/CargaFiltersBar';
import { useCargaCentros } from '@/hooks/useCargaProducao';
import { cargaApi, CargaFiltros } from '@/lib/producao/cargaApi';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { KpiCard } from '@/components/producao/carga-dashboard/KpiCard';
import { aggByKey, aggByRecurso, fmtDec, fmtNum, type RecursoAgg } from '@/components/producao/carga-dashboard/aggregations';
import { TopRecursosChart } from '@/components/producao/carga-dashboard/TopRecursosChart';
import { CargaQtdOpsChart } from '@/components/producao/carga-dashboard/CargaQtdOpsChart';
import { DonutCard } from '@/components/producao/carga-dashboard/DonutCard';
import { CentrosDemandadosTable } from '@/components/producao/carga-dashboard/CentrosDemandadosTable';
import { InsightsPanel } from '@/components/producao/carga-dashboard/InsightsPanel';
import { HeatmapMock } from '@/components/producao/carga-dashboard/HeatmapMock';
import { FilaSituacaoCard } from '@/components/producao/carga-dashboard/FilaSituacaoCard';
import { DrillSheet, useDrillSheet, biResponsive, type DrillSheetFilterChip } from '@/components/bi';
import { DetalheOpsTab } from '@/components/producao/carga/DetalheOpsTab';

const primeiroDiaMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const ultimoDiaMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};

interface DrillCtx {
  filtros: CargaFiltros;
}

export default function CargaDashboardPage() {
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState<CargaFiltros>({
    codemp: 1,
    data_ini: primeiroDiaMes(),
    data_fim: ultimoDiaMes(),
    situacoes: 'A,L',
    considera_carga: true,
  });

  const drill = useDrillSheet<DrillCtx>();

  const { data, isLoading, isError, error, dataUpdatedAt } = useCargaCentros(filtros);
  const rows = data?.dados ?? [];
  const resumo = data?.resumo;

  const recursos = useMemo(() => aggByRecurso(rows), [rows]);
  const porUnidade = useMemo(() => aggByKey(rows, 'unidade_negocio'), [rows]);
  const porCcuList = useMemo(() => aggByKey(rows, 'codccu'), [rows]);
  const porCcuChart = useMemo(() => {
    const top = porCcuList.slice(0, 8);
    const resto = porCcuList.slice(8);
    const outros = resto.reduce((acc, r) => acc + r.carga_min, 0);
    const out = top.map((c) => ({ name: String(c.name), value: c.carga_min }));
    if (outros > 0) out.push({ name: 'Outros', value: outros });
    return out;
  }, [porCcuList]);

  const totalCargaMin = resumo?.carga_prevista_min ?? 0;
  const totalCargaH = resumo?.carga_prevista_horas ?? 0;
  const semMapeamento = resumo?.linhas_sem_mapeamento ?? resumo?.linhas_sem_mapeamento_supabase ?? 0;
  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const handleRefresh = () => qc.invalidateQueries({ queryKey: ['carga-producao'] });
  const handleExport = () => window.open(cargaApi.urlExportarCentros(filtros), '_blank');

  const baseChips = (): DrillSheetFilterChip[] => {
    const c: DrillSheetFilterChip[] = [];
    if (filtros.data_ini || filtros.data_fim) {
      c.push({ label: 'Período', value: `${filtros.data_ini ?? '…'} → ${filtros.data_fim ?? '…'}` });
    }
    if (filtros.situacoes) c.push({ label: 'Situações', value: filtros.situacoes });
    if (filtros.unidade_negocio) c.push({ label: 'Unidade', value: filtros.unidade_negocio });
    if (filtros.tipo_recurso) c.push({ label: 'Tipo', value: filtros.tipo_recurso });
    return c;
  };

  const openKpiAll = () =>
    drill.openWith({
      title: 'Detalhe — todas as OPs do filtro',
      subtitle: 'Lista paginada das linhas de operação',
      chips: baseChips(),
      ctx: { filtros },
    });

  const openSemMapeamento = () =>
    drill.openWith({
      title: 'Linhas sem mapeamento (padrão API)',
      subtitle: 'Linhas em que o mapeamento veio do default da API',
      chips: [...baseChips(), { label: 'Origem', value: 'PADRAO_API' }],
      ctx: { filtros: { ...filtros } },
    });

  const openRecurso = (r: RecursoAgg) => {
    if (!r) return;
    drill.openWith({
      title: `Recurso · ${r.descre || r.codcre}`,
      subtitle: `${r.codcre} · CC ${r.codccu}`,
      chips: [
        ...baseChips(),
        { label: 'Recurso', value: r.codcre },
        { label: 'CCusto', value: r.codccu },
      ],
      ctx: { filtros: { ...filtros, codcre: r.codcre } },
    });
  };

  const openUnidade = (un: string) => {
    drill.openWith({
      title: `Unidade · ${un}`,
      chips: [...baseChips(), { label: 'Unidade', value: un }],
      ctx: { filtros: { ...filtros, unidade_negocio: un } },
    });
  };

  const openCcu = (ccu: string) => {
    if (ccu === 'Outros') {
      drill.openWith({
        title: 'Centros de custo · Outros',
        subtitle: 'Demais centros fora do Top 8',
        chips: baseChips(),
        ctx: { filtros },
      });
      return;
    }
    drill.openWith({
      title: `Centro de custo · ${ccu}`,
      chips: [...baseChips(), { label: 'CCusto', value: ccu }],
      ctx: { filtros: { ...filtros } },
    });
  };

  const openSituacao = (sit: string) => {
    drill.openWith({
      title: `Situação · ${sit}`,
      chips: [
        ...baseChips().filter((c) => c.label !== 'Situações'),
        { label: 'Situação', value: sit },
      ],
      ctx: { filtros: { ...filtros, situacoes: sit } },
    });
  };

  return (
    <div className={`${biResponsive.pagePad} bg-muted/30 min-h-full`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Factory className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">Dashboard de Carga de Produção</h1>
            <p className="text-[11px] md:text-xs text-muted-foreground">
              Mapeamento de processos, ocupação dos centros de recursos e capacidade produtiva
            </p>
          </div>
        </div>
        {updatedAt && (
          <div className="text-[10px] md:text-[11px] text-muted-foreground flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-md bg-card border">
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Atualizado em:</span> {updatedAt.toLocaleString('pt-BR')}
          </div>
        )}
      </div>

      <CargaFiltersBar
        filtros={filtros}
        onChange={setFiltros}
        onRefresh={handleRefresh}
        onExport={handleExport}
        loading={isLoading}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao consultar carga</AlertTitle>
          <AlertDescription>{(error as Error)?.message}</AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className={biResponsive.kpiGrid}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <KpiCard icon={ClipboardList} label="OPs" value={fmtNum(resumo?.qtd_ops)} accent="primary" onDrill={openKpiAll} />
            <KpiCard icon={Boxes} label="Recursos" value={fmtNum(resumo?.qtd_recursos)} accent="primary" onDrill={openKpiAll} />
            <KpiCard icon={Activity} label="Linhas de operação" value={fmtNum(resumo?.qtd_linhas_operacao)} accent="primary" onDrill={openKpiAll} />
            <KpiCard icon={Timer} label="Carga prevista (min)" value={fmtNum(totalCargaMin)} accent="primary" onDrill={openKpiAll} />
            <KpiCard icon={Clock} label="Carga prevista (h)" value={fmtDec(totalCargaH)} accent="success" onDrill={openKpiAll} />
            <KpiCard
              icon={Info}
              label="Classificados por regra automática"
              value={fmtNum(semMapeamento)}
              accent="muted"
              tooltip="Quantidade de linhas de carga em que o recurso não possui mapeamento explícito na API, mas foi classificado automaticamente por centro de custo ou origem da OP."
              hint={semMapeamento > 0 ? 'Classificação automática aplicada' : 'Todos com mapeamento explícito'}
              onDrill={semMapeamento > 0 ? openSemMapeamento : undefined}
            />
          </>
        )}
      </div>

      {/* Linha principal: 2 gráficos + insights */}
      <div className={biResponsive.chartGrid2Plus1}>
        <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TopRecursosChart rows={recursos} onSelect={openRecurso} />
          <CargaQtdOpsChart rows={recursos} onSelect={openRecurso} />
        </div>
        <InsightsPanel recursos={recursos} rows={rows} semMapeamento={semMapeamento} />
      </div>

      {/* Donuts */}
      <div className={biResponsive.chartGrid3}>
        <DonutCard
          title="Distribuição por unidade de negócio"
          data={porUnidade.map((u) => ({ name: String(u.name), value: u.carga_min }))}
          centerLabel="Carga (min)"
          centerValue={fmtNum(totalCargaMin)}
          totalLabel="Total"
          totalValue={`${fmtNum(totalCargaMin)} min / 100%`}
          onSelect={openUnidade}
        />
        <DonutCard
          title="Distribuição por centro de custo"
          subtitle="Top 8 centros · demais agrupados em Outros"
          data={porCcuChart}
          centerLabel="Carga (min)"
          centerValue={fmtNum(totalCargaMin)}
          totalLabel="Total"
          totalValue={`${fmtNum(totalCargaMin)} min / 100%`}
          onSelect={openCcu}
        />
        <FilaSituacaoCard filtros={filtros} onSelect={openSituacao} />
      </div>

      {/* Heatmap mock */}
      <HeatmapMock recursos={recursos} />

      {/* Tabela */}
      <CentrosDemandadosTable rows={recursos} onSelect={openRecurso} />

      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-2">
        <Layers className="h-3 w-3" />
        Fonte: GET /api/producao/carga/centros · {fmtNum(rows.length)} linhas retornadas · {fmtNum(recursos.length)} recursos agregados
      </div>

      <DrillSheet
        open={drill.state.open}
        onOpenChange={drill.setOpen}
        title={drill.state.title}
        subtitle={drill.state.subtitle}
        chips={drill.state.chips}
      >
        {drill.state.ctx && <DetalheOpsTab filtros={drill.state.ctx.filtros} />}
      </DrillSheet>
    </div>
  );
}
