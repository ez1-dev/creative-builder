import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { KPICard } from '@/components/erp/KPICard';
import { ExportButton } from '@/components/erp/ExportButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';
import { AlertTriangle, Clock, SearchX, RefreshCw } from 'lucide-react';
import { DashboardCharts } from './components/DashboardCharts';

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

function buildProjectDetails(
  projetos: TopProjetoPatio[],
  key: keyof Pick<TopProjetoPatio, 'kg_produzido' | 'kg_expedido' | 'kg_patio' | 'kg_engenharia'>,
) {
  return projetos
    .filter(p => (p[key] ?? 0) > 0)
    .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))
    .slice(0, 10)
    .map(p => ({
      label: `Proj ${p.numero_projeto} / Des ${p.numero_desenho} Rev ${p.revisao}`,
      value: `${formatNumber(p[key], 0)} Kg`,
    }));
}

function buildStatusDetails(projetos: TopProjetoPatio[], ...keywords: string[]) {
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
    }));
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
  const clearFilters = () => {
    abortRef.current?.abort();
    setFilters({ numero_projeto: '', numero_desenho: '', revisao: '', cliente: '', cidade: '' });
    setData(null);
    setStatus('idle');
    setErrorMsg('');
  };

  const resumo = data?.resumo;

  return (
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
            <KPICard title="Kg Previsto" value={formatNumber(resumo.kg_engenharia, 0)} variant="info" tooltip="Peso previsto em engenharia" details={buildProjectDetails(data!.top_projetos_patio, 'kg_engenharia')} />
            <KPICard title="Kg Produzido" value={formatNumber(resumo.kg_produzido, 0)} variant="success" tooltip="Total produzido (entrada estoque)" details={buildProjectDetails(data!.top_projetos_patio, 'kg_produzido')} />
            <KPICard title="Kg Expedido" value={formatNumber(resumo.kg_expedido, 0)} variant="success" tooltip="Total expedido (romaneio)" details={buildProjectDetails(data!.top_projetos_patio, 'kg_expedido')} />
            <KPICard title="Kg Pátio" value={formatNumber(resumo.kg_patio, 0)} variant="warning" tooltip="Saldo em pátio (produzido − expedido)" details={buildProjectDetails(data!.top_projetos_patio, 'kg_patio')} />
            <KPICard title="Qtd Cargas" value={resumo.quantidade_cargas} />
            <KPICard title="Itens Não Carreg." value={resumo.itens_nao_carregados} variant="destructive" />
            <KPICard title="Aguardando Prod." value={resumo.projetos_aguardando_producao} tooltip="Projetos aguardando início de produção" details={buildStatusDetails(data!.top_projetos_patio, 'AGUARDANDO')} />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KPICard title="Em Produção" value={resumo.projetos_em_producao} variant="info" tooltip="Projetos em fase de produção ou sem entrada em estoque" details={buildStatusDetails(data!.top_projetos_patio, 'PRODUÇÃO', 'SEM ENTRADA')} />
            <KPICard title="Parcial Expedido" value={resumo.projetos_parcialmente_expedidos} variant="warning" tooltip="Projetos com expedição parcial" details={buildStatusDetails(data!.top_projetos_patio, 'PARCIAL')} />
            <KPICard title="Total Expedidos" value={resumo.projetos_expedidos} variant="success" tooltip="Projetos totalmente expedidos" details={buildStatusDetails(data!.top_projetos_patio, 'TOTALMENTE EXPEDIDO')} />
            <KPICard title="LT Eng→Prod (dias)" value={resumo.leadtime_medio_engenharia_producao} />
            <KPICard title="LT Prod→Exp (dias)" value={resumo.leadtime_medio_producao_expedicao} />
            <KPICard title="LT Total (dias)" value={resumo.leadtime_medio_total} />
          </div>

          <DashboardCharts data={data!} />
        </>
      )}
    </div>
  );
}
