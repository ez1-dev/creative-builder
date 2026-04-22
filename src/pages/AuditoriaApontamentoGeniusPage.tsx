import { useState, useCallback, useMemo, useEffect } from 'react';
import { api, AuditoriaApontamentoGeniusResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { ComboboxFilter } from '@/components/erp/ComboboxFilter';
import { KPICard } from '@/components/erp/KPICard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  AlertTriangle, AlertCircle, Clock, UserCheck, ListChecks, FileQuestion, Timer,
  Activity, CheckCircle2,
} from 'lucide-react';

const ORIGENS_GENIUS = ['110','120','130','135','140','150','205','208','210','220','230','235','240','245','250'];

const today = new Date();
const d30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

const initialFilters = {
  data_ini: toIso(d30),
  data_fim: toIso(today),
  numop: '',
  codori: '',
  codpro: '',
  operador: '',
  status_op: '' as '' | 'EM_ANDAMENTO' | 'FINALIZADO',
  somente_discrepancia: false,
  somente_acima_8h: false,
};

type Status = 'OK' | 'SEM_INICIO' | 'SEM_FIM' | 'FIM_MENOR_INICIO' | 'APONTAMENTO_MAIOR_8H' | 'OPERADOR_MAIOR_8H_DIA';
type StatusApont = 'ABERTO' | 'FECHADO' | 'DIVERGENTE' | 'ALERTA';

const statusVariants: Record<string, { label: string; className: string }> = {
  OK: { label: 'OK', className: 'bg-green-600 text-white' },
  SEM_INICIO: { label: 'Sem início', className: 'bg-amber-500 text-white' },
  SEM_FIM: { label: 'Sem fim', className: 'bg-amber-500 text-white' },
  FIM_MENOR_INICIO: { label: 'Fim < Início', className: 'bg-destructive text-destructive-foreground' },
  APONTAMENTO_MAIOR_8H: { label: 'Apont. > 8h', className: 'bg-red-700 text-white' },
  OPERADOR_MAIOR_8H_DIA: { label: 'Operador > 8h/dia', className: 'bg-red-700 text-white' },
};

const statusOpVariants: Record<string, { label: string; className: string }> = {
  EM_ANDAMENTO: { label: 'Em andamento', className: 'bg-blue-600 text-white' },
  FINALIZADO: { label: 'Finalizado', className: 'bg-slate-500 text-white' },
};

const statusApontVariants: Record<StatusApont, { label: string; className: string }> = {
  ABERTO: { label: 'Aberto', className: 'bg-amber-500 text-white' },
  FECHADO: { label: 'Fechado', className: 'bg-green-600 text-white' },
  DIVERGENTE: { label: 'Divergente', className: 'bg-destructive text-destructive-foreground' },
  ALERTA: { label: 'Alerta', className: 'bg-red-700 text-white' },
};

function derivarStatusApont(row: any): StatusApont {
  const s = row?.status as Status | undefined;
  if (s === 'FIM_MENOR_INICIO') return 'DIVERGENTE';
  if (s === 'APONTAMENTO_MAIOR_8H' || s === 'OPERADOR_MAIOR_8H_DIA') return 'ALERTA';
  if (s === 'SEM_FIM' || s === 'SEM_INICIO') return 'ABERTO';
  return 'FECHADO';
}

function is404(e: any): boolean {
  if (e?.statusCode === 404) return true;
  const msg = String(e?.message || '').toLowerCase();
  return msg.includes('not found') || msg.includes('404');
}

const columns: Column<any>[] = [
  { key: 'data', header: 'Data', sticky: true, stickyWidth: 100, render: (v) => v ? formatDate(v) : '-' },
  { key: 'codori', header: 'Origem' },
  { key: 'numop', header: 'OP' },
  { key: 'estagio', header: 'Estágio' },
  { key: 'seq_roteiro', header: 'Seq. Rot.', align: 'right' },
  { key: 'seq_apontamento', header: 'Seq. Apont.', align: 'right' },
  { key: 'usuario', header: 'Usuário' },
  { key: 'operador', header: 'Operador' },
  { key: 'turno', header: 'Turno' },
  { key: 'codpro', header: 'Produto' },
  { key: 'despro', header: 'Descrição', render: (v) => <span className="block max-w-[260px] truncate" title={v}>{v || '-'}</span> },
  { key: 'hora_inicio', header: 'Hora Início' },
  { key: 'hora_fim', header: 'Hora Fim' },
  { key: 'horas_alocadas', header: 'H. Alocadas', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'horas_apontadas', header: 'H. Apontadas', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'total_dia_operador', header: 'Total Dia Operador', align: 'right', render: (v) => formatNumber(v, 2) },
  {
    key: 'status_op',
    header: 'Status OP',
    render: (v: string) => {
      const cfg = statusOpVariants[v];
      if (!cfg) return <span className="text-muted-foreground">—</span>;
      return <Badge className={cfg.className}>{cfg.label}</Badge>;
    },
  },
  {
    key: 'status',
    header: 'Status Apont.',
    render: (v: Status, row: any) => {
      const derived = derivarStatusApont(row);
      const cfg = statusApontVariants[derived];
      const granular = statusVariants[v]?.label || v || '';
      return (
        <Badge className={cfg.className} title={granular ? `Detalhe: ${granular}` : undefined}>
          {cfg.label}
        </Badge>
      );
    },
  },
];

export default function AuditoriaApontamentoGeniusPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<AuditoriaApontamentoGeniusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [endpointMissing, setEndpointMissing] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');

  const erpReady = useErpReady();

  const buscarAuditoriaApontamentoGenius = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.', { id: 'erp-not-ready' }); return; }
    setLoading(true);
    try {
      const result = await api.get<AuditoriaApontamentoGeniusResponse>('/api/auditoria-apontamento-genius', {
        ...filters,
        somente_discrepancia: filters.somente_discrepancia ? 1 : 0,
        somente_acima_8h: filters.somente_acima_8h ? 1 : 0,
        pagina: page,
        tamanho_pagina: 100,
      });
      setData(result);
      setPagina(page);
      setEndpointMissing(false);
    } catch (e: any) {
      if (is404(e)) {
        setEndpointMissing(true);
        toast.error('Endpoint /api/auditoria-apontamento-genius ainda não publicado no ERP.', { id: 'missing-apont-genius', duration: 6000 });
      } else {
        toast.error(e.message, { id: 'err-apont-genius' });
      }
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  const limparTelaAuditoriaApontamentoGenius = useCallback(() => {
    setFilters(initialFilters);
    setData(null);
    setPagina(1);
    setEndpointMissing(false);
    setQuickFilter('');
  }, []);

  useEffect(() => { setEndpointMissing(false); }, [filters]);

  const aplicarFiltroListaApontGenius = useMemo(() => {
    const rows = (data?.dados || []) as any[];
    const q = quickFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const derived = derivarStatusApont(r);
      const derivedLabel = statusApontVariants[derived]?.label || '';
      const opLabel = statusOpVariants[r.status_op]?.label || r.status_op || '';
      return [
        r.operador, r.numop, r.codpro, r.despro, r.codori, r.turno, r.status,
        r.status_op, opLabel, derived, derivedLabel,
      ].some((f) => String(f ?? '').toLowerCase().includes(q));
    });
  }, [data, quickFilter]);

  const atualizarKpisApontGenius = useMemo(() => {
    if (!data) return null;
    const r = data.resumo;
    const rows = (data.dados || []) as any[];

    // Fallback: agrega contando Set de numop por status_op
    const opsSet = { EM_ANDAMENTO: new Set<string>(), FINALIZADO: new Set<string>() };
    for (const row of rows) {
      const op = String(row.numop ?? '');
      if (!op) continue;
      if (row.status_op === 'EM_ANDAMENTO') opsSet.EM_ANDAMENTO.add(op);
      else if (row.status_op === 'FINALIZADO') opsSet.FINALIZADO.add(op);
    }

    if (r) {
      const rAny = r as any;
      return {
        total_registros: rAny.total_registros ?? rows.length,
        total_discrepancias: rAny.total_discrepancias ?? 0,
        sem_inicio: rAny.sem_inicio ?? rAny.total_sem_inicio ?? 0,
        sem_fim: rAny.sem_fim ?? rAny.total_sem_fim ?? 0,
        fim_menor_inicio: rAny.fim_menor_inicio ?? rAny.total_fim_menor_inicio ?? 0,
        acima_8h: rAny.acima_8h
          ?? ((rAny.total_apontamento_maior_8h ?? 0) + (rAny.total_operador_maior_8h_dia ?? 0)),
        maior_total_dia_operador: rAny.maior_total_dia_operador ?? 0,
        operador_maior_total: rAny.operador_maior_total ?? '',
        ops_em_andamento: rAny.ops_em_andamento ?? opsSet.EM_ANDAMENTO.size,
        ops_finalizadas: rAny.ops_finalizadas ?? opsSet.FINALIZADO.size,
      };
    }

    const acc = {
      total_registros: rows.length,
      total_discrepancias: 0,
      sem_inicio: 0,
      sem_fim: 0,
      fim_menor_inicio: 0,
      acima_8h: 0,
      maior_total_dia_operador: 0,
      operador_maior_total: '',
      ops_em_andamento: opsSet.EM_ANDAMENTO.size,
      ops_finalizadas: opsSet.FINALIZADO.size,
    };
    for (const row of rows) {
      if (row.status && row.status !== 'OK') acc.total_discrepancias++;
      if (row.status === 'SEM_INICIO') acc.sem_inicio++;
      if (row.status === 'SEM_FIM') acc.sem_fim++;
      if (row.status === 'FIM_MENOR_INICIO') acc.fim_menor_inicio++;
      if (row.status === 'APONTAMENTO_MAIOR_8H' || row.status === 'OPERADOR_MAIOR_8H_DIA') acc.acima_8h++;
      const tot = Number(row.total_dia_operador || 0);
      if (tot > acc.maior_total_dia_operador) {
        acc.maior_total_dia_operador = tot;
        acc.operador_maior_total = row.operador || '';
      }
    }
    return acc;
  }, [data]);

  const rowClassName = useCallback((row: any) => {
    if (row.status === 'APONTAMENTO_MAIOR_8H' || row.status === 'OPERADOR_MAIOR_8H_DIA' || row.status === 'FIM_MENOR_INICIO') {
      return 'bg-destructive/5 hover:bg-destructive/10';
    }
    if (row.status === 'SEM_INICIO' || row.status === 'SEM_FIM') {
      return 'bg-amber-500/5 hover:bg-amber-500/10';
    }
    return '';
  }, []);

  const origensOptions = useMemo(
    () => ORIGENS_GENIUS.map((o) => ({ value: o, label: o })),
    []
  );

  const statusOpOptions = useMemo(
    () => [
      { value: 'EM_ANDAMENTO', label: 'Em andamento' },
      { value: 'FINALIZADO', label: 'Finalizado' },
    ],
    []
  );

  const exportParams = {
    ...filters,
    somente_discrepancia: filters.somente_discrepancia ? 1 : 0,
    somente_acima_8h: filters.somente_acima_8h ? 1 : 0,
  };

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      {endpointMissing && (
        <Alert className="border-[hsl(var(--warning))]/50 bg-[hsl(var(--warning))]/10">
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
          <AlertTitle>Backend pendente</AlertTitle>
          <AlertDescription className="text-xs">
            O backend desta auditoria ainda não está disponível. A tela ficará operacional assim que o ERP publicar{' '}
            <code className="rounded bg-muted px-1">GET /api/auditoria-apontamento-genius</code>. Veja{' '}
            <code className="rounded bg-muted px-1">docs/backend-auditoria-apontamento-genius.md</code> para o contrato esperado.
          </AlertDescription>
        </Alert>
      )}
      <PageHeader
        title="Auditoria Apontamento Genius"
        description="Conferência de apontamentos da operação GENIUS — destaca apontamentos > 8h e totais diários > 8h por operador"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton endpoint="/api/export/auditoria-apontamento-genius" params={exportParams} />
          </div>
        }
      />
      <FilterPanel
        onSearch={() => buscarAuditoriaApontamentoGenius(1)}
        onClear={limparTelaAuditoriaApontamentoGenius}
      >
        <div><Label className="text-xs">Data inicial</Label><Input type="date" value={filters.data_ini} onChange={(e) => setFilters(f => ({ ...f, data_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data final</Label><Input type="date" value={filters.data_fim} onChange={(e) => setFilters(f => ({ ...f, data_fim: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Número da OP</Label><Input value={filters.numop} onChange={(e) => setFilters(f => ({ ...f, numop: e.target.value }))} placeholder="OP" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Origem (GENIUS)</Label><ComboboxFilter value={filters.codori} onChange={(v) => setFilters(f => ({ ...f, codori: v }))} options={origensOptions} placeholder="Origem" /></div>
        <div><Label className="text-xs">Código produto</Label><Input value={filters.codpro} onChange={(e) => setFilters(f => ({ ...f, codpro: e.target.value }))} placeholder="Produto" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Operador</Label><Input value={filters.operador} onChange={(e) => setFilters(f => ({ ...f, operador: e.target.value }))} placeholder="Operador" className="h-8 text-xs" /></div>
        <div>
          <Label className="text-xs">Status da OP</Label>
          <ComboboxFilter
            value={filters.status_op}
            onChange={(v) => setFilters(f => ({ ...f, status_op: (v as '' | 'EM_ANDAMENTO' | 'FINALIZADO') }))}
            options={statusOpOptions}
            placeholder="Status OP"
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch id="somente-discrep" checked={filters.somente_discrepancia} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_discrepancia: v }))} />
          <Label htmlFor="somente-discrep" className="cursor-pointer text-xs">Somente discrepância</Label>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch id="somente-8h" checked={filters.somente_acima_8h} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_acima_8h: v }))} />
          <Label htmlFor="somente-8h" className="cursor-pointer text-xs">Somente acima de 8h</Label>
        </div>
      </FilterPanel>

      {atualizarKpisApontGenius && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
          <KPICard title="Total Registros" value={formatNumber(atualizarKpisApontGenius.total_registros, 0)} icon={<ListChecks className="h-5 w-5" />} variant="default" index={0} />
          <KPICard title="OPs em andamento" value={formatNumber(atualizarKpisApontGenius.ops_em_andamento, 0)} icon={<Activity className="h-5 w-5" />} variant="info" index={1} />
          <KPICard title="OPs finalizadas" value={formatNumber(atualizarKpisApontGenius.ops_finalizadas, 0)} icon={<CheckCircle2 className="h-5 w-5" />} variant="default" index={2} />
          <KPICard title="Discrepâncias" value={formatNumber(atualizarKpisApontGenius.total_discrepancias, 0)} icon={<AlertCircle className="h-5 w-5" />} variant="destructive" index={3} />
          <KPICard title="Sem Início" value={formatNumber(atualizarKpisApontGenius.sem_inicio, 0)} icon={<FileQuestion className="h-5 w-5" />} variant="warning" index={4} />
          <KPICard title="Sem Fim" value={formatNumber(atualizarKpisApontGenius.sem_fim, 0)} icon={<FileQuestion className="h-5 w-5" />} variant="warning" index={5} />
          <KPICard title="Fim < Início" value={formatNumber(atualizarKpisApontGenius.fim_menor_inicio, 0)} icon={<Timer className="h-5 w-5" />} variant="destructive" index={6} />
          <KPICard title="Acima de 8h" value={formatNumber(atualizarKpisApontGenius.acima_8h, 0)} icon={<Clock className="h-5 w-5" />} variant="destructive" index={7} />
          <KPICard
            title="Maior Total Dia"
            value={`${formatNumber(atualizarKpisApontGenius.maior_total_dia_operador, 2)} h`}
            subtitle={atualizarKpisApontGenius.operador_maior_total || undefined}
            icon={<UserCheck className="h-5 w-5" />}
            variant="info"
            index={8}
          />
        </div>
      )}

      {data && (
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Input
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              placeholder="Filtro rápido (operador, OP, produto, origem, turno, status)…"
              className="h-8 text-xs"
            />
          </div>
          {quickFilter && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {aplicarFiltroListaApontGenius.length} de {data.dados?.length ?? 0}
            </span>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        data={aplicarFiltroListaApontGenius}
        loading={loading}
        rowClassName={rowClassName}
        emptyMessage={endpointMissing ? 'Backend ainda não publicado.' : 'Nenhum apontamento encontrado para os filtros.'}
      />

      {data && data.total_paginas > 1 && (
        <PaginationControl
          pagina={pagina}
          totalPaginas={data.total_paginas}
          totalRegistros={data.total_registros}
          onPageChange={(p) => buscarAuditoriaApontamentoGenius(p)}
        />
      )}
    </div>
  );
}
