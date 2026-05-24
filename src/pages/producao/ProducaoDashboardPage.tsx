import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { ExportButton } from '@/components/erp/ExportButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';
import { useAiPageContext } from '@/hooks/useAiPageContext';
import { AlertTriangle, Clock, SearchX, RefreshCw, Package, TrendingUp, Truck, Warehouse, Layers, AlertCircle, Hourglass } from 'lucide-react';
import { DashboardCharts } from './components/DashboardCharts';
import { KpiGrid, KpiCard, LoadingState, UserWidgetsSlot } from '@/components/bi';
import { DrillSheet, useDrillSheet } from '@/components/bi/drill/DrillSheet';
import { PageDataProvider } from '@/lib/bi/PageDataContext';

interface DashboardResumo {
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

interface TopProjetoPatio {
  numero_projeto: number;
  numero_desenho: number;
  revisao: string;
  kg_patio: number;
  kg_produzido: number;
  kg_expedido: number;
  kg_engenharia: number;
  status_patio: string;
  cliente: string;
}

interface CargaPorMes {
  periodo: string;
  quantidade_cargas: number;
}

export interface DashboardData {
  resumo: DashboardResumo;
  top_projetos_patio: TopProjetoPatio[];
  cargas_por_mes: CargaPorMes[];
}

type RequestStatus = 'idle' | 'loading' | 'success' | 'error' | 'timeout' | 'empty';

const TIMEOUT_MS = 45_000;

const defaultResumo: DashboardResumo = {
  kg_engenharia: 0, kg_produzido: 0, kg_expedido: 0, kg_patio: 0,
  itens_nao_carregados: 0, projetos_aguardando_producao: 0, projetos_em_producao: 0,
  projetos_parcialmente_expedidos: 0, projetos_expedidos: 0,
  leadtime_medio_engenharia_producao: 0, leadtime_medio_producao_expedicao: 0,
  leadtime_medio_total: 0, quantidade_cargas: 0,
};

function normalizeDashboardData(result: any): DashboardData | null {
  if (!result || typeof result !== 'object') return null;
  const resumo = result.resumo && typeof result.resumo === 'object'
    ? { ...defaultResumo, ...result.resumo }
    : null;
  return {
    resumo: resumo as DashboardResumo,
    top_projetos_patio: Array.isArray(result.top_projetos_patio) ? result.top_projetos_patio : [],
    cargas_por_mes: Array.isArray(result.cargas_por_mes) ? result.cargas_por_mes : [],
  };
}

function isResumoEmpty(r: DashboardResumo): boolean {
  return Object.values(r).every(v => v === 0 || v === null || v === undefined);
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
    .filter(p => (p[key] ?? 0) > 0)
    .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))
    .slice(0, 10)
    .map(p => ({
      label: `Proj ${p.numero_projeto} / Des ${p.numero_desenho} Rev ${p.revisao}`,
      value: `${formatNumber(p[key], 0)} Kg`,
      projeto: p,
    }));
}

function buildStatusDetails(projetos: TopProjetoPatio[], ...keywords: string[]): DrillItem[] {
  const upper = keywords.map(k => k.toUpperCase());
  return projetos
    .filter(p => {
      const s = (p.status_patio ?? '').toUpperCase();
      return upper.some(k => s.includes(k));
    })
    .slice(0, 15)
    .map(p => ({
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

export default function ProducaoDashboardPage() {
  const [filters, setFilters] = useState({
    numero_projeto: '', numero_desenho: '', revisao: '', cliente: '', cidade: '',
  });
  const [data, setData] = useState<DashboardData | null>(null);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const erpReady = useErpReady();
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
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

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const search = useCallback(async () => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }

    // Cancel previous
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const currentId = ++requestIdRef.current;

    setStatus('loading');
    setErrorMsg('');
    setData(null);

    const timeout = setTimeout(() => {
      if (requestIdRef.current === currentId) {
        controller.abort();
        setStatus('timeout');
        setErrorMsg('A consulta do dashboard está demorando mais que o normal. Tente refinar os filtros.');
      }
    }, TIMEOUT_MS);

    try {
      const result = await api.get<any>('/api/producao/dashboard', filters);
      clearTimeout(timeout);
      if (requestIdRef.current !== currentId) return;

      const normalized = normalizeDashboardData(result);
      if (!normalized || !normalized.resumo) {
        setStatus('empty');
        setErrorMsg('O dashboard não recebeu dados consolidados para estes filtros.');
        setData(null);
      } else if (isResumoEmpty(normalized.resumo)) {
        setStatus('empty');
        setErrorMsg('Nenhum dado encontrado para os filtros informados.');
        setData(normalized);
      } else {
        setData(normalized);
        setStatus('success');
      }
    } catch (e: any) {
      clearTimeout(timeout);
      if (requestIdRef.current !== currentId) return;
      if (e.name === 'AbortError' || controller.signal.aborted) {
        if (status !== 'timeout') return; // already handled
      } else {
        setStatus('error');
        setErrorMsg(e.message || 'Erro ao consultar o dashboard.');
        toast.error(e.message);
      }
    }
  }, [filters, erpReady]);

  useAiFilters('producao-dashboard', setFilters, () => search());

  const resumoCtx = data?.resumo;
  useAiPageContext({
    title: 'Dashboard Produção',
    filters,
    kpis: resumoCtx ? {
      'Kg Previsto': formatNumber(resumoCtx.kg_engenharia, 0),
      'Kg Produzido': formatNumber(resumoCtx.kg_produzido, 0),
      'Kg Expedido': formatNumber(resumoCtx.kg_expedido, 0),
      'Kg Pátio': formatNumber(resumoCtx.kg_patio, 0),
      'Qtd Cargas': resumoCtx.quantidade_cargas,
      'Itens Não Carregados': resumoCtx.itens_nao_carregados,
      'Em Produção': resumoCtx.projetos_em_producao,
      'LT Total (dias)': resumoCtx.leadtime_medio_total,
    } : undefined,
    summary: status === 'success'
      ? `Dashboard carregado; ${(data?.top_projetos_patio || []).length} projetos no top pátio`
      : status === 'loading' ? 'Carregando dashboard...' : undefined,
  });

  const clearFilters = () => {
    abortRef.current?.abort();
    setFilters({ numero_projeto: '', numero_desenho: '', revisao: '', cliente: '', cidade: '' });
    setData(null);
    setStatus('idle');
    setErrorMsg('');
  };

  const resumo = data?.resumo;

  const topProjetos = data?.top_projetos_patio ?? [];
  const cargasPorMes = data?.cargas_por_mes ?? [];

  return (
    <PageDataProvider
      pageKey="producao-dashboard"
      kpis={resumo ? {
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
      filtros={filters}
    >
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Dashboard Produção"
        description="Visão gerencial de produção, expedição e pátio"
        actions={<ExportButton endpoint="/api/export/producao-patio" params={filters} />}
      />
      <FilterPanel onSearch={search} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.numero_desenho} onChange={(e) => setFilters(f => ({ ...f, numero_desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={filters.cidade} onChange={(e) => setFilters(f => ({ ...f, cidade: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {status === 'loading' && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
          <Clock className="h-5 w-5 animate-spin" />
          <span>Consultando dashboard... Aguarde.</span>
        </div>
      )}

      {status === 'timeout' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Tempo excedido</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            {errorMsg}
            <Button variant="outline" size="sm" onClick={search} className="ml-2">
              <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {status === 'error' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro na consulta</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            {errorMsg}
            <Button variant="outline" size="sm" onClick={search} className="ml-2">
              <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {status === 'empty' && (
        <Alert>
          <SearchX className="h-4 w-4" />
          <AlertTitle>Sem resultados</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {resumo && status === 'success' && (
        <>
          <KpiGrid cols={7}>
            <KpiCard title="Kg Previsto" value={formatNumber(resumo.kg_engenharia, 0)} variant="info"
              icon={<Layers className="h-4 w-4" />} tooltip="Peso previsto em engenharia"
              onClick={() => drill.openWith({ title: 'Kg Previsto — Top projetos', chips: [{ label: 'Métrica', value: 'kg_engenharia' }], ctx: { items: buildProjectDetails(topProjetos, 'kg_engenharia') } })} />
            <KpiCard title="Kg Produzido" value={formatNumber(resumo.kg_produzido, 0)} variant="success"
              icon={<Package className="h-4 w-4" />} tooltip="Total produzido (entrada estoque)"
              onClick={() => drill.openWith({ title: 'Kg Produzido — Top projetos', chips: [{ label: 'Métrica', value: 'kg_produzido' }], ctx: { items: buildProjectDetails(topProjetos, 'kg_produzido') } })} />
            <KpiCard title="Kg Expedido" value={formatNumber(resumo.kg_expedido, 0)} variant="success"
              icon={<Truck className="h-4 w-4" />} tooltip="Total expedido (romaneio)"
              onClick={() => drill.openWith({ title: 'Kg Expedido — Top projetos', chips: [{ label: 'Métrica', value: 'kg_expedido' }], ctx: { items: buildProjectDetails(topProjetos, 'kg_expedido') } })} />
            <KpiCard title="Kg Pátio" value={formatNumber(resumo.kg_patio, 0)} variant="warning"
              icon={<Warehouse className="h-4 w-4" />} tooltip="Saldo em pátio (produzido − expedido)"
              onClick={() => drill.openWith({ title: 'Kg em Pátio — Top projetos', chips: [{ label: 'Métrica', value: 'kg_patio' }], ctx: { items: buildProjectDetails(topProjetos, 'kg_patio') } })} />
            <KpiCard title="Qtd Cargas" value={resumo.quantidade_cargas} icon={<Truck className="h-4 w-4" />} />
            <KpiCard title="Itens Não Carreg." value={resumo.itens_nao_carregados} variant="warning"
              icon={<AlertCircle className="h-4 w-4" />} tooltip="Itens produzidos ainda não carregados" />
            <KpiCard title="Aguardando Prod." value={resumo.projetos_aguardando_producao}
              icon={<Hourglass className="h-4 w-4" />} tooltip="Projetos aguardando início de produção"
              onClick={() => drill.openWith({ title: 'Aguardando Produção', chips: [{ label: 'Status', value: 'AGUARDANDO' }], ctx: { items: buildStatusDetails(topProjetos, 'AGUARDANDO') } })} />
          </KpiGrid>
          <KpiGrid cols={6}>
            <KpiCard title="Em Produção" value={resumo.projetos_em_producao} variant="info"
              tooltip="Projetos em fase de produção ou sem entrada em estoque"
              onClick={() => drill.openWith({ title: 'Em Produção', chips: [{ label: 'Status', value: 'EM PRODUÇÃO' }], ctx: { items: buildStatusDetails(topProjetos, 'PRODUÇÃO') } })} />
            <KpiCard title="Parcial Expedido" value={resumo.projetos_parcialmente_expedidos} variant="warning"
              tooltip="Projetos com expedição parcial"
              onClick={() => drill.openWith({ title: 'Parcialmente Expedidos', chips: [{ label: 'Status', value: 'PARCIAL' }], ctx: { items: buildStatusDetails(topProjetos, 'PARCIAL') } })} />
            <KpiCard title="Total Expedidos" value={resumo.projetos_expedidos} variant="success"
              tooltip="Projetos totalmente expedidos"
              onClick={() => drill.openWith({ title: 'Totalmente Expedidos', chips: [{ label: 'Status', value: 'EXPEDIDO' }], ctx: { items: buildStatusDetails(topProjetos, 'EXPEDIDO') } })} />
            <KpiCard title="LT Eng→Prod (dias)" value={resumo.leadtime_medio_engenharia_producao} />
            <KpiCard title="LT Prod→Exp (dias)" value={resumo.leadtime_medio_producao_expedicao} />
            <KpiCard title="LT Total (dias)" value={resumo.leadtime_medio_total} variant="info" />
          </KpiGrid>

          <DashboardCharts data={data!} />

          {/* Widgets personalizados via Biblioteca BI */}
          <UserWidgetsSlot section="kpis" cols={4} emptyHint={true} />
          <UserWidgetsSlot section="charts" cols={3} emptyHint={false} />
          <UserWidgetsSlot section="tables" cols={2} emptyHint={false} />
        </>
      )}
      <DrillSheet
        open={drill.state.open}
        onOpenChange={drill.setOpen}
        title={drill.state.title}
        chips={drill.state.chips}
      >
        {drill.state.ctx && drill.state.ctx.items.length > 0 ? (
          <ul className="divide-y">
            {drill.state.ctx.items.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-foreground truncate">{it.label}</span>
                <span className="text-muted-foreground tabular-nums">{it.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sem registros para detalhar.</p>
        )}
      </DrillSheet>
    </div>
    </PageDataProvider>
  );
}
