import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Boxes, ClipboardList, Clock, Gauge, Timer, AlertTriangle, Building2, Layers, Factory } from 'lucide-react';
import { CargaFiltersBar } from '@/components/producao/carga/CargaFiltersBar';
import { useCargaCentros } from '@/hooks/useCargaProducao';
import { cargaApi, CargaFiltros } from '@/lib/producao/cargaApi';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { KpiCard } from '@/components/producao/carga-dashboard/KpiCard';
import { aggByKey, aggByRecurso, fmtDec, fmtNum } from '@/components/producao/carga-dashboard/aggregations';
import { TopRecursosChart } from '@/components/producao/carga-dashboard/TopRecursosChart';
import { CargaQtdOpsChart } from '@/components/producao/carga-dashboard/CargaQtdOpsChart';
import { DonutCard } from '@/components/producao/carga-dashboard/DonutCard';
import { CentrosDemandadosTable } from '@/components/producao/carga-dashboard/CentrosDemandadosTable';
import { InsightsPanel } from '@/components/producao/carga-dashboard/InsightsPanel';
import { HeatmapMock } from '@/components/producao/carga-dashboard/HeatmapMock';
import { FilaSituacaoCard } from '@/components/producao/carga-dashboard/FilaSituacaoCard';

const primeiroDiaMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const ultimoDiaMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};

export default function CargaDashboardPage() {
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState<CargaFiltros>({
    codemp: 1,
    data_ini: primeiroDiaMes(),
    data_fim: ultimoDiaMes(),
    situacoes: 'A,L',
    considera_carga: true,
  });

  const { data, isLoading, isError, error, dataUpdatedAt } = useCargaCentros(filtros);
  const rows = data?.dados ?? [];
  const resumo = data?.resumo;

  const recursos = useMemo(() => aggByRecurso(rows), [rows]);
  const porUnidade = useMemo(() => aggByKey(rows, 'unidade_negocio'), [rows]);
  const porCcu = useMemo(() => {
    const all = aggByKey(rows, 'codccu');
    const top = all.slice(0, 8);
    const resto = all.slice(8);
    const outros = resto.reduce((acc, r) => acc + r.carga_min, 0);
    const data = top.map((c) => ({ name: String(c.name), value: c.carga_min }));
    if (outros > 0) data.push({ name: 'Outros', value: outros });
    return data;
  }, [rows]);

  const totalCargaMin = resumo?.carga_prevista_min ?? 0;
  const totalCargaH = resumo?.carga_prevista_horas ?? 0;
  const semMapeamento = resumo?.linhas_sem_mapeamento ?? resumo?.linhas_sem_mapeamento_supabase ?? 0;
  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const handleRefresh = () => qc.invalidateQueries({ queryKey: ['carga-producao'] });
  const handleExport = () => window.open(cargaApi.urlExportarCentros(filtros), '_blank');

  return (
    <div className="p-4 lg:p-6 space-y-4 bg-muted/30 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Factory className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Dashboard de Carga de Produção</h1>
            <p className="text-xs text-muted-foreground">
              Mapeamento de processos, ocupação dos centros de recursos e capacidade produtiva
            </p>
          </div>
        </div>
        {updatedAt && (
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border">
            <Clock className="h-3.5 w-3.5" />
            Atualizado em: {updatedAt.toLocaleString('pt-BR')}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <KpiCard icon={ClipboardList} label="OPs" value={fmtNum(resumo?.qtd_ops)} accent="primary" />
            <KpiCard icon={Boxes} label="Recursos" value={fmtNum(resumo?.qtd_recursos)} accent="primary" />
            <KpiCard icon={Activity} label="Linhas de operação" value={fmtNum(resumo?.qtd_linhas_operacao)} accent="primary" />
            <KpiCard icon={Timer} label="Carga prevista (min)" value={fmtNum(totalCargaMin)} accent="primary" />
            <KpiCard icon={Clock} label="Carga prevista (h)" value={fmtDec(totalCargaH)} accent="success" />
            <KpiCard
              icon={AlertTriangle}
              label="Sem mapeamento"
              value={fmtNum(semMapeamento)}
              accent={semMapeamento > 0 ? 'warn' : 'muted'}
              hint={semMapeamento > 0 ? 'Linhas no padrão da API' : 'Tudo mapeado'}
            />
          </>
        )}
      </div>

      {/* Segunda linha — KPIs placeholders alinhados ao mockup */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Gauge} label="Capacidade disponível" value="—" placeholder badge="aguardando API" accent="muted" />
        <KpiCard icon={Gauge} label="Ocupação média" value="—" placeholder badge="aguardando API" accent="muted" />
        <KpiCard icon={AlertTriangle} label="Centros críticos" value="—" placeholder badge="aguardando API" accent="muted" />
        <KpiCard icon={Building2} label="Obras em produção" value="—" placeholder badge="aguardando API" accent="muted" />
      </div>

      {/* Linha principal: 2 gráficos + insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TopRecursosChart rows={recursos} />
          <CargaQtdOpsChart rows={recursos} />
        </div>
        <InsightsPanel recursos={recursos} rows={rows} semMapeamento={semMapeamento} />
      </div>

      {/* Donuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <DonutCard
          title="Distribuição por unidade de negócio"
          data={porUnidade.map((u) => ({ name: String(u.name), value: u.carga_min }))}
          centerLabel="Carga (min)"
          centerValue={fmtNum(totalCargaMin)}
          totalLabel="Total"
          totalValue={`${fmtNum(totalCargaMin)} min / 100%`}
        />
        <DonutCard
          title="Distribuição por centro de custo"
          subtitle="Top 8 centros · demais agrupados em Outros"
          data={porCcu}
          centerLabel="Carga (min)"
          centerValue={fmtNum(totalCargaMin)}
          totalLabel="Total"
          totalValue={`${fmtNum(totalCargaMin)} min / 100%`}
        />
        <FilaSituacaoCard filtros={filtros} />
      </div>

      {/* Heatmap mock */}
      <HeatmapMock recursos={recursos} />

      {/* Tabela */}
      <CentrosDemandadosTable rows={recursos} />

      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-2">
        <Layers className="h-3 w-3" />
        Fonte: GET /api/producao/carga/centros · {fmtNum(rows.length)} linhas retornadas · {fmtNum(recursos.length)} recursos agregados
      </div>
    </div>
  );
}
