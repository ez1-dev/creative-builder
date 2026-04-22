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
import { Card } from '@/components/ui/card';
import { formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, AlertCircle, Clock, UserCheck, ListChecks, FileQuestion, Timer,
  Activity, CheckCircle2, CalendarRange,
} from 'lucide-react';

// Origens GENIUS — começa em 110 conforme regra ERP
const ORIGENS_GENIUS = ['110','120','130','135','140','150','205','208','210','220','230','235','240','245','250'];

// Status nativos da OP (E900COP):
//   L = Liberada, A = Andamento, F = Finalizada, C = Cancelada, E = Emitida (ativa)
// OPs ativas (em andamento) = { E, L, A }
const STATUS_OP_ATIVOS = new Set(['E', 'L', 'A', 'EM_ANDAMENTO']);
const STATUS_OP_FINALIZADOS = new Set(['F', 'FINALIZADO']);
const STATUS_OP_CANCELADOS = new Set(['C', 'CANCELADO']);

function normalizarStatusOp(v: any): string {
  const s = String(v ?? '').trim().toUpperCase();
  if (!s) return 'SEM_STATUS';
  return s;
}

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
  status_op: '' as string,
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

// Mapeamento de status nativos da OP (E900COP) + agrupados legados
const statusOpVariants: Record<string, { label: string; className: string }> = {
  E:            { label: 'Emitida',      className: 'bg-sky-600 text-white' },
  L:            { label: 'Liberada',     className: 'bg-blue-600 text-white' },
  A:            { label: 'Andamento',    className: 'bg-indigo-600 text-white' },
  F:            { label: 'Finalizada',   className: 'bg-slate-500 text-white' },
  C:            { label: 'Cancelada',    className: 'bg-destructive text-destructive-foreground' },
  EM_ANDAMENTO: { label: 'Em andamento', className: 'bg-blue-600 text-white' },
  FINALIZADO:   { label: 'Finalizado',   className: 'bg-slate-500 text-white' },
  CANCELADO:    { label: 'Cancelado',    className: 'bg-destructive text-destructive-foreground' },
  SEM_STATUS:   { label: 'Sem status',   className: 'bg-muted text-muted-foreground' },
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
  { key: 'data_apontamento', header: 'Data', sticky: true, stickyWidth: 100, render: (v) => v ? formatDate(v) : '-' },
  { key: 'origem', header: 'Origem' },
  { key: 'numero_op', header: 'OP' },
  { key: 'estagio', header: 'Estágio' },
  { key: 'seqrot', header: 'Seq. Rot.', align: 'right' },
  { key: 'seq_apontamento', header: 'Seq. Apont.', align: 'right' },
  { key: 'codigo_usuario', header: 'Cód. Usuário', align: 'right' },
  { key: 'nome_usuario', header: 'Operador' },
  { key: 'turno', header: 'Turno' },
  { key: 'codigo_produto', header: 'Produto' },
  { key: 'descricao_produto', header: 'Descrição', render: (v) => <span className="block max-w-[260px] truncate" title={v}>{v || '-'}</span> },
  { key: 'hora_inicio', header: 'Hora Início' },
  { key: 'hora_fim', header: 'Hora Fim' },
  { key: 'horas_apontadas', header: 'H. Apontadas', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'total_horas_dia_operador', header: 'Total Dia Operador', align: 'right', render: (v) => formatNumber(v, 2) },
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
    key: 'status_apontamento',
    header: 'Status Apont.',
    render: (v: string) => {
      const key = ((v as StatusApont) in statusApontVariants ? v : 'FECHADO') as StatusApont;
      const cfg = statusApontVariants[key];
      return <Badge className={cfg.className}>{cfg.label}</Badge>;
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
  const [forcarDiagnostico, setForcarDiagnostico] = useState(false);

  const erpReady = useErpReady();

  const buscarAuditoriaApontamentoGenius = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.', { id: 'erp-not-ready' }); return; }
    setLoading(true);
    try {
      const result = await api.get<AuditoriaApontamentoGeniusResponse>('/api/auditoria-apontamento-genius', {
        data_ini: filters.data_ini,
        data_fim: filters.data_fim,
        numero_op: filters.numop,
        origem: filters.codori,
        codigo_produto: filters.codpro,
        operador: filters.operador,
        status_op: filters.status_op || 'TODOS',
        somente_discrepancia: filters.somente_discrepancia ? 1 : 0,
        somente_maior_8h: filters.somente_acima_8h ? 1 : 0,
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
      const opLabel = statusOpVariants[r.status_op]?.label || r.status_op || '';
      const apontLabel = statusApontVariants[r.status_apontamento as StatusApont]?.label || r.status_apontamento || '';
      return [
        r.nome_usuario, r.numero_op, r.codigo_produto, r.descricao_produto,
        r.origem, r.turno, r.status_apontamento, r.status_op, opLabel, apontLabel,
      ].some((f) => String(f ?? '').toLowerCase().includes(q));
    });
  }, [data, quickFilter]);

  const atualizarKpisApontGenius = useMemo(() => {
    if (!data) return null;
    const r = data.resumo;
    const rows = (data.dados || []) as any[];

    // Fallback: agrega contando Set de numop por status_op nativo (E900COP)
    // Ativas = { E, L, A, EM_ANDAMENTO } | Finalizadas = { F, FINALIZADO } | Canceladas = { C, CANCELADO }
    const opsSet = {
      EM_ANDAMENTO: new Set<string>(),
      FINALIZADO: new Set<string>(),
      CANCELADO: new Set<string>(),
      SEM_STATUS: new Set<string>(),
    };
    for (const row of rows) {
      const op = String(row.numero_op ?? row.numop ?? '');
      if (!op) continue;
      const st = normalizarStatusOp(row.status_op);
      if (STATUS_OP_ATIVOS.has(st)) opsSet.EM_ANDAMENTO.add(op);
      else if (STATUS_OP_FINALIZADOS.has(st)) opsSet.FINALIZADO.add(op);
      else if (STATUS_OP_CANCELADOS.has(st)) opsSet.CANCELADO.add(op);
      else opsSet.SEM_STATUS.add(op);
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
        ops_em_andamento: rAny.ops_em_andamento ?? rAny.total_ops_andamento ?? opsSet.EM_ANDAMENTO.size,
        ops_finalizadas: rAny.ops_finalizadas ?? rAny.total_ops_finalizadas ?? opsSet.FINALIZADO.size,
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
      const sa = String(row.status_apontamento ?? '').toUpperCase();
      if (sa && sa !== 'FECHADO') acc.total_discrepancias++;
      if (sa === 'SEM_APONTAMENTO') acc.sem_inicio++;
      if (sa === 'ABERTO') acc.sem_fim++;
      if (sa === 'DIVERGENTE') acc.fim_menor_inicio++;
      const horas = Number(row.horas_apontadas || 0);
      const totDia = Number(row.total_horas_dia_operador || 0);
      if (horas > 8 || totDia > 8) acc.acima_8h++;
      if (totDia > acc.maior_total_dia_operador) {
        acc.maior_total_dia_operador = totDia;
        acc.operador_maior_total = row.nome_usuario || '';
      }
    }
    return acc;
  }, [data]);

  const rowClassName = useCallback((row: any) => {
    const sa = String(row.status_apontamento ?? '').toUpperCase();
    const horas = Number(row.horas_apontadas || 0);
    const totDia = Number(row.total_horas_dia_operador || 0);
    if (sa === 'DIVERGENTE' || horas > 8 || totDia > 8) {
      return 'bg-destructive/5 hover:bg-destructive/10';
    }
    if (sa === 'ABERTO' || sa === 'SEM_APONTAMENTO') {
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
      { value: 'EM_ANDAMENTO', label: 'Em andamento (E + L + A)' },
      { value: 'FINALIZADO', label: 'Finalizadas (F)' },
      { value: 'SEM_STATUS', label: 'Sem status' },
    ],
    []
  );

  const exportParams = {
    data_ini: filters.data_ini,
    data_fim: filters.data_fim,
    numero_op: filters.numop,
    origem: filters.codori,
    codigo_produto: filters.codpro,
    operador: filters.operador,
    status_op: filters.status_op || 'TODOS',
    somente_discrepancia: filters.somente_discrepancia ? 1 : 0,
    somente_maior_8h: filters.somente_acima_8h ? 1 : 0,
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
        <div className="flex flex-col justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            title="Preenche o intervalo dos últimos 12 meses"
            onClick={() => {
              const hoje = new Date();
              const inicio = new Date();
              inicio.setMonth(inicio.getMonth() - 12);
              setFilters(f => ({
                ...f,
                data_ini: inicio.toISOString().slice(0, 10),
                data_fim: hoje.toISOString().slice(0, 10),
              }));
            }}
          >
            <CalendarRange className="mr-1 h-3 w-3" />
            Últimos 12 meses
          </Button>
        </div>
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
        <>
          <StatusOpGeniusCard
            opsEmAndamento={atualizarKpisApontGenius.ops_em_andamento}
            opsFinalizadas={atualizarKpisApontGenius.ops_finalizadas}
            totalDiscrepancias={atualizarKpisApontGenius.total_discrepancias}
            dataIni={filters.data_ini}
            dataFim={filters.data_fim}
          />
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
        </>
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

      {/* Painel de diagnóstico técnico — exibido APENAS quando o backend devolve o bloco `debug`.
          O backend novo (E900COP + E930MPR) não envia debug em operação normal; ele só aparece
          em modo investigação. Se o resultado vier vazio sem debug, mostramos um empty state amigável. */}
      {data && !loading && !endpointMissing && data.debug && (
        <DiagnosticoApontGeniusCard
          debug={data.debug}
          totalRetornado={data.dados?.length ?? 0}
          filtros={filters}
          origensGenius={ORIGENS_GENIUS}
        />
      )}

      {data && !loading && !endpointMissing && !data.debug && (data.dados?.length ?? 0) === 0 && (
        <Alert>
          <FileQuestion className="h-4 w-4" />
          <AlertTitle>Sem registros para os filtros aplicados</AlertTitle>
          <AlertDescription className="text-xs">
            Nenhum apontamento GENIUS encontrado no período {formatDate(filters.data_ini)} → {formatDate(filters.data_fim)}.
            Ajuste o intervalo de datas, a origem (CodOri) ou o status da OP e tente novamente.
          </AlertDescription>
        </Alert>
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

interface StatusOpGeniusCardProps {
  opsEmAndamento: number;
  opsFinalizadas: number;
  totalDiscrepancias: number;
  dataIni: string;
  dataFim: string;
}

function StatusOpGeniusCard({
  opsEmAndamento,
  opsFinalizadas,
  totalDiscrepancias,
  dataIni,
  dataFim,
}: StatusOpGeniusCardProps) {
  const totalOps = opsEmAndamento + opsFinalizadas;
  if (totalOps === 0) return null;

  const pctAndamento = (opsEmAndamento / totalOps) * 100;
  const pctFinalizadas = 100 - pctAndamento;

  return (
    <Card className="border-l-4 border-l-blue-600 p-4 space-y-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Status OP Genius
          </h3>
          <p className="text-xs text-muted-foreground">
            Período {formatDate(dataIni)} → {formatDate(dataFim)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground leading-none">
            {formatNumber(totalOps, 0)}
          </div>
          <div className="text-xs text-muted-foreground">OPs ativas no período</div>
        </div>
      </div>

      <div className="w-full h-3 rounded-full overflow-hidden bg-muted flex">
        <div
          className="h-full bg-blue-600 transition-all"
          style={{ width: `${pctAndamento}%` }}
          title={`Em andamento: ${pctAndamento.toFixed(1)}%`}
        />
        <div
          className="h-full bg-slate-400 transition-all"
          style={{ width: `${pctFinalizadas}%` }}
          title={`Finalizadas: ${pctFinalizadas.toFixed(1)}%`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
          <span className="font-medium text-foreground">{formatNumber(opsEmAndamento, 0)}</span>
          <span className="text-muted-foreground">em andamento ({pctAndamento.toFixed(0)}%)</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
          <span className="font-medium text-foreground">{formatNumber(opsFinalizadas, 0)}</span>
          <span className="text-muted-foreground">finalizadas ({pctFinalizadas.toFixed(0)}%)</span>
        </span>
        {totalDiscrepancias > 0 && (
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <span className="font-medium text-destructive">{formatNumber(totalDiscrepancias, 0)}</span>
            <span className="text-muted-foreground">com discrepância</span>
          </span>
        )}
      </div>
    </Card>
  );
}

// ─── Painel de diagnóstico técnico ────────────────────────────────────────
interface DiagnosticoApontGeniusCardProps {
  debug?: import('@/lib/api').AuditoriaApontGeniusDebug;
  totalRetornado: number;
  filtros: typeof initialFilters;
  origensGenius: string[];
}

function DiagnosticoApontGeniusCard({
  debug,
  totalRetornado,
  filtros,
  origensGenius,
}: DiagnosticoApontGeniusCardProps) {
  const etapas = debug?.etapas ?? [];
  const porOrigem = debug?.contagem_por_origem ?? [];
  const porStatusOp = debug?.contagem_por_status_op ?? [];
  const porOp = debug?.contagem_por_op ?? [];
  const apontPorOp = debug?.apontamentos_por_op ?? [];

  const semDebug = !debug;
  const semDados = totalRetornado === 0;

  return (
    <Card className="border-l-4 border-l-amber-500 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            Diagnóstico — Auditoria Apontamento Genius
          </h3>
          <p className="text-xs text-muted-foreground">
            {semDados
              ? 'O backend respondeu, mas a tela está sem linhas. Antes de assumir que não há apontamentos, valide o funil de filtragem abaixo.'
              : 'Funil de filtragem retornado pelo backend.'}
          </p>
        </div>
      </div>

      {/* Parâmetros aplicados */}
      <div className="rounded-md border bg-muted/30 p-3 space-y-1">
        <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Parâmetros enviados ao backend
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs">
          <span><strong>data_ini (DatMov):</strong> {filtros.data_ini || '—'}</span>
          <span><strong>data_fim (DatMov):</strong> {filtros.data_fim || '—'}</span>
          <span><strong>codori (CodOri):</strong> {filtros.codori || `(qualquer GENIUS: ${origensGenius.join(', ')})`}</span>
          <span><strong>numop (NumOrp):</strong> {filtros.numop || '—'}</span>
          <span><strong>codpro:</strong> {filtros.codpro || '—'}</span>
          <span><strong>operador:</strong> {filtros.operador || '—'}</span>
          <span><strong>status_op (E900COP):</strong> {filtros.status_op || '(todos)'}</span>
          <span><strong>somente_discrepancia:</strong> {filtros.somente_discrepancia ? '1' : '0'}</span>
          <span><strong>somente_acima_8h:</strong> {filtros.somente_acima_8h ? '1' : '0'}</span>
        </div>
      </div>

      {/* Etapas do funil */}
      {etapas.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Funil de filtragem (contagem por etapa)
          </div>
          <ol className="text-xs space-y-1 list-decimal list-inside">
            {etapas.map((e, i) => (
              <li key={i}>
                <span className="text-muted-foreground">{e.nome}:</span>{' '}
                <span className="font-medium text-foreground">{formatNumber(e.quantidade, 0)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Contagens auxiliares */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {porStatusOp.length > 0 && (
          <ContagemBlock title="Por status da OP (E900COP)" items={porStatusOp} />
        )}
        {porOrigem.length > 0 && (
          <ContagemBlock title="Por origem (CodOri)" items={porOrigem} />
        )}
        {porOp.length > 0 && (
          <ContagemBlock title="OPs encontradas (top)" items={porOp.slice(0, 10)} />
        )}
        {apontPorOp.length > 0 && (
          <ContagemBlock title="Apontamentos por OP (top)" items={apontPorOp.slice(0, 10)} />
        )}
      </div>

      {/* SQL final */}
      {debug?.sql_final && (
        <details className="rounded-md border bg-muted/30 p-3" open={semDados}>
          <summary className="text-xs font-semibold text-foreground uppercase tracking-wide cursor-pointer">
            SQL final montada
          </summary>
          <pre className="mt-2 text-[11px] leading-tight overflow-x-auto whitespace-pre-wrap text-foreground/90">
            {debug.sql_final}
          </pre>
        </details>
      )}

      {debug?.observacoes && debug.observacoes.length > 0 && (
        <ul className="text-xs text-muted-foreground list-disc list-inside">
          {debug.observacoes.map((o, i) => <li key={i}>{o}</li>)}
        </ul>
      )}

      {semDebug && semDados && (
        <Alert className="border-amber-500/50 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-xs">Backend não retornou bloco <code>debug</code></AlertTitle>
          <AlertDescription className="text-xs">
            Sem o bloco <code>debug</code> não é possível validar o funil. Solicite ao backend que retorne{' '}
            <code>debug.sql_final</code>, <code>debug.etapas</code>,{' '}
            <code>debug.contagem_por_origem</code> e <code>debug.contagem_por_status_op</code> conforme{' '}
            <code>docs/backend-auditoria-apontamento-genius.md</code>. Enquanto isso, valide manualmente:{' '}
            (1) quantas OPs GENIUS existem no período (DatMov), (2) quantos apontamentos por OP, (3) quantas por status (E/L/A/F/C), (4) quantas por origem ({origensGenius.join(', ')}).
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}

function ContagemBlock({
  title,
  items,
}: {
  title: string;
  items: { chave: string; label?: string; quantidade: number }[];
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-1">
      <div className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</div>
      <ul className="text-xs space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="text-muted-foreground truncate">{it.label || it.chave}</span>
            <span className="font-medium text-foreground">{formatNumber(it.quantidade, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

