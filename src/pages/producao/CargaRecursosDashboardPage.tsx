import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity, Boxes, ClipboardList, Clock, Factory, AlertTriangle, AlertOctagon,
  Layers, ArrowRight, TrendingUp, Lightbulb,
} from 'lucide-react';
import { CargaFiltersBar } from '@/components/producao/carga/CargaFiltersBar';
import { useCargaRecursos } from '@/hooks/useCargaProducao';
import { CargaFiltros, type CargaRecursoRow } from '@/lib/producao/cargaApi';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { KpiCard, type KpiDelta } from '@/components/producao/carga-dashboard/KpiCard';
import { fmtDec, fmtNum, type RecursoAgg } from '@/components/producao/carga-dashboard/aggregations';
import { countCriticos } from '@/components/producao/carga-dashboard/statusOcupacao';
import { TopRecursosChart } from '@/components/producao/carga-dashboard/TopRecursosChart';
import { CargaQtdOpsChart } from '@/components/producao/carga-dashboard/CargaQtdOpsChart';
import { DonutCard } from '@/components/producao/carga-dashboard/DonutCard';
import { PorRecursoTable } from '@/components/producao/carga-dashboard/PorRecursoTable';
import { DrillSheet, useDrillSheet, biResponsive, type DrillSheetFilterChip } from '@/components/bi';
import { DetalheOpsTab } from '@/components/producao/carga/DetalheOpsTab';
import { cn } from '@/lib/utils';

const primeiroDiaMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const ultimoDiaMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};
const shiftMonth = (iso: string, delta: number): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const target = new Date(d.getFullYear(), d.getMonth() + delta, d.getDate());
  if (target.getMonth() !== ((d.getMonth() + delta) % 12 + 12) % 12) target.setDate(0);
  return target.toISOString().slice(0, 10);
};
const pctDelta = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

// Recurso shape compatível com RecursoAgg para reuso dos componentes
const toAgg = (r: CargaRecursoRow): RecursoAgg => ({
  codcre: r.codcre,
  descre: r.descre,
  codccu: r.codccu,
  unidade_negocio: r.unidade_negocio,
  tipo_recurso: r.tipo_recurso,
  qtd_ops: r.qtd_ops,
  qtd_operacoes: r.qtd_operacoes,
  carga_prevista_min: r.carga_prevista_min,
  carga_prevista_horas: r.carga_prevista_horas,
});

interface DrillCtx { filtros: CargaFiltros }

export default function CargaRecursosDashboardPage() {
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState<CargaFiltros>({
    codemp: 1,
    data_ini: primeiroDiaMes(),
    data_fim: ultimoDiaMes(),
    situacoes: 'A,L',
    considera_carga: true,
  });
  const drill = useDrillSheet<DrillCtx>();

  const { data, isLoading, isError, error, dataUpdatedAt } = useCargaRecursos(filtros);
  const filtrosPrev = useMemo<CargaFiltros>(
    () => ({
      ...filtros,
      data_ini: filtros.data_ini ? shiftMonth(filtros.data_ini, -1) : undefined,
      data_fim: filtros.data_fim ? shiftMonth(filtros.data_fim, -1) : undefined,
    }),
    [filtros],
  );
  const { data: dataPrev } = useCargaRecursos(filtrosPrev, !!filtros.data_ini && !!filtros.data_fim);

  const rows = data?.dados ?? [];
  const rowsPrev = dataPrev?.dados ?? [];
  const aggRows = useMemo(() => rows.map(toAgg), [rows]);
  const aggRowsPrev = useMemo(() => rowsPrev.map(toAgg), [rowsPrev]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.qtd_ops += r.qtd_ops ?? 0;
          acc.qtd_operacoes += r.qtd_operacoes ?? 0;
          acc.carga_h += r.carga_prevista_horas ?? 0;
          return acc;
        },
        { qtd_ops: 0, qtd_operacoes: 0, carga_h: 0 },
      ),
    [rows],
  );
  const totalsPrev = useMemo(
    () =>
      rowsPrev.reduce(
        (acc, r) => {
          acc.qtd_ops += r.qtd_ops ?? 0;
          acc.qtd_operacoes += r.qtd_operacoes ?? 0;
          acc.carga_h += r.carga_prevista_horas ?? 0;
          return acc;
        },
        { qtd_ops: 0, qtd_operacoes: 0, carga_h: 0 },
      ),
    [rowsPrev],
  );

  const recursosAtivos = rows.length;
  const recursosAtivosPrev = rowsPrev.length;
  const cargaMedia = recursosAtivos > 0 ? totals.carga_h / recursosAtivos : 0;
  const cargaMediaPrev = recursosAtivosPrev > 0 ? totalsPrev.carga_h / recursosAtivosPrev : 0;
  const criticos = useMemo(() => countCriticos(aggRows), [aggRows]);
  const criticosPrev = useMemo(() => countCriticos(aggRowsPrev), [aggRowsPrev]);

  const hasPrev = rowsPrev.length > 0;
  const deltaRec: KpiDelta | undefined = hasPrev ? { value: pctDelta(recursosAtivos, recursosAtivosPrev), unit: 'pct' } : undefined;
  const deltaOps: KpiDelta | undefined = hasPrev ? { value: pctDelta(totals.qtd_ops, totalsPrev.qtd_ops), unit: 'pct' } : undefined;
  const deltaOper: KpiDelta | undefined = hasPrev ? { value: pctDelta(totals.qtd_operacoes, totalsPrev.qtd_operacoes), unit: 'pct' } : undefined;
  const deltaCargaH: KpiDelta | undefined = hasPrev ? { value: pctDelta(totals.carga_h, totalsPrev.carga_h), unit: 'pct' } : undefined;
  const deltaCriticos: KpiDelta | undefined = hasPrev ? { value: criticos - criticosPrev, unit: 'abs', invertColor: true } : undefined;
  const deltaMedia: KpiDelta | undefined = hasPrev ? { value: pctDelta(cargaMedia, cargaMediaPrev), unit: 'pct' } : undefined;

  // Donuts
  const aggByKeyLocal = (key: keyof CargaRecursoRow) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = String(r[key] || '—');
      m.set(k, (m.get(k) ?? 0) + (r.carga_prevista_horas ?? 0));
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };
  const porUnidade = useMemo(() => aggByKeyLocal('unidade_negocio'), [rows]);
  const porTipo = useMemo(() => aggByKeyLocal('tipo_recurso'), [rows]);
  const porCcuFull = useMemo(() => aggByKeyLocal('codccu'), [rows]);
  const porCcu = useMemo(() => {
    const top = porCcuFull.slice(0, 8);
    const resto = porCcuFull.slice(8).reduce((a, c) => a + c.value, 0);
    return resto > 0 ? [...top, { name: 'Outros', value: resto }] : top;
  }, [porCcuFull]);

  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const baseChips = (): DrillSheetFilterChip[] => {
    const c: DrillSheetFilterChip[] = [];
    if (filtros.data_ini || filtros.data_fim) c.push({ label: 'Período', value: `${filtros.data_ini ?? '…'} → ${filtros.data_fim ?? '…'}` });
    if (filtros.situacoes) c.push({ label: 'Situações', value: filtros.situacoes });
    if (filtros.unidade_negocio) c.push({ label: 'Unidade', value: filtros.unidade_negocio });
    if (filtros.tipo_recurso) c.push({ label: 'Tipo', value: filtros.tipo_recurso });
    return c;
  };
  const openDrill = (payload: Parameters<typeof drill.openWith>[0]) => {
    const snap = filtros;
    drill.openWith(payload, { restore: () => setFiltros(snap) });
  };
  const openRecurso = (r: { codcre: string; codccu: string; descre?: string }) => {
    openDrill({
      title: `Recurso · ${r.descre || r.codcre}`,
      subtitle: `${r.codcre} · CC ${r.codccu}`,
      chips: [...baseChips(), { label: 'Recurso', value: r.codcre }, { label: 'CCusto', value: r.codccu }],
      ctx: { filtros: { ...filtros, codcre: r.codcre } },
    });
  };
  const openKpiAll = () =>
    openDrill({
      title: 'Detalhe — todas as OPs do filtro',
      subtitle: 'Lista paginada das linhas de operação',
      chips: baseChips(),
      ctx: { filtros },
    });
  const openUnidade = (un: string) =>
    openDrill({ title: `Unidade · ${un}`, chips: [...baseChips(), { label: 'Unidade', value: un }], ctx: { filtros: { ...filtros, unidade_negocio: un } } });
  const openTipo = (tp: string) =>
    openDrill({ title: `Tipo · ${tp}`, chips: [...baseChips(), { label: 'Tipo', value: tp }], ctx: { filtros: { ...filtros, tipo_recurso: tp } } });
  const openCcu = (ccu: string) => {
    if (ccu === 'Outros') {
      openDrill({ title: 'Centros de custo · Outros', chips: baseChips(), ctx: { filtros } });
      return;
    }
    openDrill({ title: `Centro de custo · ${ccu}`, chips: [...baseChips(), { label: 'CCusto', value: ccu }], ctx: { filtros: { ...filtros } } });
  };

  // Insights
  const insights = useMemo(() => {
    if (!rows.length) return [];
    const top1 = aggRows[0];
    const top3 = aggRows.slice(0, 3).reduce((a, r) => a + r.carga_prevista_horas, 0);
    const pctTop1 = totals.carga_h > 0 ? (top1.carga_prevista_horas / totals.carga_h) * 100 : 0;
    const pctTop3 = totals.carga_h > 0 ? (top3 / totals.carga_h) * 100 : 0;
    return [
      { icon: TrendingUp, kind: 'warn' as const, title: `${top1.descre || top1.codcre} lidera a carga`, body: `Concentra ${fmtDec(pctTop1)}% das ${fmtDec(totals.carga_h)} h previstas no período.` },
      { icon: AlertOctagon, kind: 'critical' as const, title: `${fmtNum(criticos)} recurso(s) crítico(s)`, body: `Top 10% de carga prevista — provável gargalo. Ver tabela abaixo para identificar.` },
      { icon: Lightbulb, kind: 'info' as const, title: 'Concentração nos top 3', body: `${fmtDec(pctTop3)}% da carga total está em apenas 3 centros de recurso.` },
    ];
  }, [aggRows, rows, totals, criticos]);

  const handleRefresh = () => qc.invalidateQueries({ queryKey: ['carga-producao'] });

  return (
    <div className={`${biResponsive.pagePad} bg-muted/30 min-h-full`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Factory className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">Dashboard por Centro de Recurso</h1>
            <p className="text-[11px] md:text-xs text-muted-foreground">
              Foco em ocupação e gargalo · 1 linha por recurso · fonte <code className="font-mono">/api/producao/carga/recursos</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/producao/carga/dashboard"
            className="text-[11px] md:text-xs text-primary hover:underline inline-flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-md bg-card border"
          >
            Ver por operação <ArrowRight className="h-3 w-3" />
          </Link>
          {updatedAt && (
            <div className="text-[10px] md:text-[11px] text-muted-foreground flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-md bg-card border">
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Atualizado em:</span> {updatedAt.toLocaleString('pt-BR')}
            </div>
          )}
        </div>
      </div>

      <CargaFiltersBar filtros={filtros} onChange={setFiltros} onRefresh={handleRefresh} loading={isLoading} />

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao consultar recursos</AlertTitle>
          <AlertDescription>{(error as Error)?.message}</AlertDescription>
        </Alert>
      )}

      {/* KPIs (6 cards) */}
      <div className={biResponsive.kpiGrid}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <KpiCard number={1} icon={Boxes} label="Recursos ativos" value={fmtNum(recursosAtivos)} accent="primary" delta={deltaRec} onDrill={openKpiAll} />
            <KpiCard number={2} icon={ClipboardList} label="Qtd OPs" value={fmtNum(totals.qtd_ops)} accent="primary" delta={deltaOps} onDrill={openKpiAll} />
            <KpiCard number={3} icon={Activity} label="Qtd Operações" value={fmtNum(totals.qtd_operacoes)} accent="primary" delta={deltaOper} onDrill={openKpiAll} />
            <KpiCard number={4} icon={Clock} label="Carga Prevista (h)" value={fmtDec(totals.carga_h)} accent="success" delta={deltaCargaH} onDrill={openKpiAll} />
            <KpiCard
              number={5}
              icon={AlertOctagon}
              label="Centros Críticos"
              value={fmtNum(criticos)}
              accent={criticos > 0 ? 'critical' : 'success'}
              delta={deltaCriticos}
              tooltip="Recursos no top 10% de carga prevista no período — derivado por ranking enquanto não há capacidade real."
              onDrill={openKpiAll}
            />
            <KpiCard
              number={6}
              icon={TrendingUp}
              label="Carga média / recurso (h)"
              value={fmtDec(cargaMedia)}
              accent="primary"
              delta={deltaMedia}
              tooltip="Carga prevista total dividida pelo número de recursos ativos no período."
            />
          </>
        )}
      </div>

      {/* Linha 1: 2 charts + insights */}
      <div className={biResponsive.chartGrid2Plus1}>
        <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TopRecursosChart rows={aggRows} onSelect={(r) => openRecurso(r)} />
          <CargaQtdOpsChart rows={aggRows} onSelect={(r) => openRecurso(r)} />
        </div>
        <Card className="p-3 md:p-4 rounded-2xl shadow-sm border h-full">
          <div className="text-sm font-semibold mb-3">Insights</div>
          <div className="space-y-2">
            {insights.length === 0 ? (
              <div className="text-xs text-muted-foreground">Sem dados para gerar insights.</div>
            ) : (
              insights.map((ins, i) => {
                const Icon = ins.icon;
                const tone =
                  ins.kind === 'critical' ? 'text-destructive bg-destructive/10'
                  : ins.kind === 'warn' ? 'text-orange-600 dark:text-orange-500 bg-orange-500/10'
                  : 'text-primary bg-primary/10';
                return (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-card/50">
                    <div className={cn('h-7 w-7 rounded-md flex items-center justify-center shrink-0', tone)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium">{i + 1}. {ins.title}</div>
                      <div className="text-[11px] text-muted-foreground leading-snug">{ins.body}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Linha 2: donuts */}
      <div className={biResponsive.chartGrid3}>
        <DonutCard
          title="Por unidade de negócio"
          data={porUnidade}
          centerLabel="Carga (h)"
          centerValue={fmtDec(totals.carga_h)}
          totalLabel="Total"
          totalValue={`${fmtDec(totals.carga_h)} h / 100%`}
          onSelect={openUnidade}
        />
        <DonutCard
          title="Por tipo de recurso"
          data={porTipo}
          centerLabel="Carga (h)"
          centerValue={fmtDec(totals.carga_h)}
          totalLabel="Total"
          totalValue={`${fmtDec(totals.carga_h)} h / 100%`}
          onSelect={openTipo}
        />
        <DonutCard
          title="Por centro de custo"
          subtitle="Top 8 · demais agrupados em Outros"
          data={porCcu}
          centerLabel="Carga (h)"
          centerValue={fmtDec(totals.carga_h)}
          totalLabel="Total"
          totalValue={`${fmtDec(totals.carga_h)} h / 100%`}
          onSelect={openCcu}
        />
      </div>

      {/* Tabela completa */}
      <PorRecursoTable
        rows={rows}
        loading={isLoading}
        error={error as Error | null}
        onSelect={openRecurso}
      />

      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-2">
        <Layers className="h-3 w-3" />
        Fonte: GET /api/producao/carga/recursos · {fmtNum(rows.length)} recursos
      </div>

      <DrillSheet {...drill.sheetProps}>
        {drill.state.ctx && <DetalheOpsTab filtros={drill.state.ctx.filtros} />}
      </DrillSheet>
    </div>
  );
}
