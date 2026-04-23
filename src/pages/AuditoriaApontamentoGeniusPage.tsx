import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, AlertCircle, Clock, UserCheck, ListChecks, FileQuestion, Timer,
  Activity, CheckCircle2, CalendarRange, Info, ChevronDown, ChevronRight, Search,
  ExternalLink, Filter as FilterIcon, Copy,
} from 'lucide-react';
import { Card as UICard, CardContent as UICardContent } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// ─── Normalizador do payload da API /api/apontamentos-producao ─────────────
// O backend pode variar nomes de campos entre versões. Esta função garante
// que o restante da página leia sempre os mesmos nomes (data_movimento,
// hora_inicial, hora_final, horas_realizadas em MINUTOS, etc.).
function normalizeRowApont(r: any): any {
  if (!r || typeof r !== 'object') return r;

  // Datas: descartar placeholders 1900-xx-xx do ERP Senior
  const isPlaceholderDate = (v: any) =>
    typeof v === 'string' && /^1[89]\d{2}-/.test(v);
  const pickDate = (...vals: any[]) => {
    for (const v of vals) {
      if (v && !isPlaceholderDate(v)) return v;
    }
    return null;
  };

  // Horas: descartar strings vazias / "00:00" inválidas
  const pickHora = (...vals: any[]) => {
    for (const v of vals) {
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return null;
  };

  const dataMov = pickDate(r.data_movimento, r.data, r.data_apontamento);
  const dataIni = pickDate(r.data_inicio, r.data_inicial) ?? dataMov;
  const dataFim = pickDate(r.data_fim, r.data_final) ?? dataMov;

  const horaIni = pickHora(r.hora_inicial, r.hora_inicio, r.hora_movimento);
  const horaFim = pickHora(r.hora_final, r.hora_fim);

  // Horas: backend pode mandar em decimal (horas) ou já em minutos.
  // Heurística: se vier o campo `horas_apontadas` é decimal-horas; se vier
  // `horas_realizadas` assumimos minutos (já é o que a API atual entrega).
  let horasMin = 0;
  if (r.horas_apontadas != null) {
    horasMin = Math.round(Number(r.horas_apontadas) * 60);
  } else if (r.horas_realizadas != null) {
    horasMin = Number(r.horas_realizadas) || 0;
  }

  let totDiaMin = 0;
  if (r.total_horas_dia_operador != null) {
    totDiaMin = Number(r.total_horas_dia_operador) || 0;
  } else if (r.total_dia_operador != null) {
    totDiaMin = Math.round(Number(r.total_dia_operador) * 60);
  }

  return {
    ...r,
    data_movimento: dataMov,
    data_inicial: dataIni,
    data_final: dataFim,
    hora_inicial: horaIni,
    hora_final: horaFim,
    horas_realizadas: horasMin,
    total_horas_dia_operador: totDiaMin,
    nome_operador: r.nome_operador ?? r.operador ?? '',
    numcad: r.numcad ?? r.codigo_operador ?? '',
    status_movimento: r.status_movimento ?? r.status ?? '',
    sitorp: r.sitorp ?? r.status_op ?? '',
    centro_trabalho: r.centro_trabalho ?? r.codigo_centro_trabalho ?? r.estagio ?? '',
    estagio: r.estagio ?? r.operacao ?? r.codigo_operacao ?? '',
    numero_op: r.numero_op ?? r.numop ?? '',
    codigo_produto: r.codigo_produto ?? r.codpro ?? '',
    descricao_produto: r.descricao_produto ?? r.despro ?? '',
    origem: r.origem ?? r.codori ?? '',
  };
}

// ─── Tipo agregado por OP usado no drill profundo dos cards de status ──────
type OpAgg = {
  numero_op: string;
  produto: string;
  codigo_produto: string;
  origem: string;
  apontamentos: number;
  total_horas: number;
  inconsistencias: number;
  sem_inicio: number;
  sem_fim: number;
  divergentes: number;
  acima_8h: number;
  operadores: Set<string>;
  ultimo_apontamento: string;
  linhas: any[];
  sitorp: string;
};

// ─── Tipos de drill por KPI ────────────────────────────────────────────────
type KpiDrillKind =
  | { kind: 'status'; letra: 'E'|'L'|'A'|'F'|'C' }
  | { kind: 'total' }
  | { kind: 'discrepancias' }
  | { kind: 'semInicio' }
  | { kind: 'semFim' }
  | { kind: 'fimMenorInicio' }
  | { kind: 'acima8h' }
  | { kind: 'abaixo5min' }
  | { kind: 'maiorTotalDia' }
  | { kind: 'emAndamento' }
  | { kind: 'finalizadas' };

// ─── Helpers de tempo: backend devolve tempos em MINUTOS ───────────────────
const minToHours = (m: number | null | undefined) => (Number(m) || 0) / 60;
const fmtMinHoras = (m: number | null | undefined, dec = 2) => {
  const min = Number(m) || 0;
  return `${formatNumber(min, 0)} min · ${formatNumber(min / 60, dec)} h`;
};
const fmtHoras = (m: number | null | undefined, dec = 2) =>
  `${formatNumber((Number(m) || 0) / 60, dec)} h`;

const STATUS_LETRA_LABEL: Record<'E'|'L'|'A'|'F'|'C', string> = {
  E: 'Emitida', L: 'Liberada', A: 'Andamento', F: 'Finalizada', C: 'Cancelada',
};
const STATUS_LETRA_VARIANT: Record<'E'|'L'|'A'|'F'|'C', 'default'|'success'|'warning'|'destructive'|'info'> = {
  E: 'info', L: 'info', A: 'info', F: 'default', C: 'destructive',
};
const STATUS_LETRA_BORDER: Record<'E'|'L'|'A'|'F'|'C', string> = {
  E: 'border-l-[hsl(var(--info))]',
  L: 'border-l-[hsl(var(--info))]',
  A: 'border-l-[hsl(var(--info))]',
  F: 'border-l-primary',
  C: 'border-l-destructive',
};

const KPI_VARIANT_BORDER: Record<'default'|'success'|'warning'|'destructive'|'info', string> = {
  default: 'border-l-primary',
  success: 'border-l-[hsl(var(--success))]',
  warning: 'border-l-[hsl(var(--warning))]',
  destructive: 'border-l-destructive',
  info: 'border-l-[hsl(var(--info))]',
};

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

function normSitorpRow(row: any): 'E'|'L'|'A'|'F'|'C'|'' {
  const real = String(row?.sitorp ?? '').trim().toUpperCase();
  if (real === 'E' || real === 'L' || real === 'A' || real === 'F' || real === 'C') return real;
  const st = normalizarStatusOp(row?.status_op);
  if (STATUS_OP_FINALIZADOS.has(st)) return 'F';
  if (STATUS_OP_CANCELADOS.has(st)) return 'C';
  if (STATUS_OP_ATIVOS.has(st)) return 'A';
  return '';
}

function isLinhaDiscrepante(row: any): boolean {
  const sa = String(row?.status_movimento ?? '').toUpperCase();
  if (sa && sa !== 'FECHADO') return true;
  const horas = minToHours(row?.horas_realizadas);
  const totDia = minToHours(row?.total_horas_dia_operador);
  if (horas > 8 || totDia > 8) return true;
  if (!row?.hora_inicial) return true;
  if (!row?.hora_final) return true;
  if (row?.hora_inicial && row?.hora_final && String(row.hora_final) < String(row.hora_inicial)) return true;
  const min = Number(row?.horas_realizadas) || 0;
  if (min > 0 && min < 5) return true;
  return false;
}

// Agrega linhas brutas em OpAgg[] (reutilizado pelo Sheet genérico)
function agregarPorOp(linhas: any[]): OpAgg[] {
  const map = new Map<string, OpAgg>();
  for (const row of linhas) {
    const numop = String(row.numero_op ?? row.numop ?? '').trim();
    if (!numop) continue;
    const operador = String(row.nome_operador ?? row.operador ?? '').trim();
    const produto = String(row.descricao_produto ?? row.produto ?? row.codigo_produto ?? '').trim();
    const origem = String(row.origem ?? row.codori ?? '').trim();
    const letra = normSitorpRow(row) || '';

    let agg = map.get(numop);
    if (!agg) {
      agg = {
        numero_op: numop,
        produto: produto || '—',
        codigo_produto: String(row.codigo_produto ?? '').trim(),
        origem,
        apontamentos: 0,
        total_horas: 0,
        inconsistencias: 0,
        sem_inicio: 0,
        sem_fim: 0,
        divergentes: 0,
        acima_8h: 0,
        operadores: new Set<string>(),
        ultimo_apontamento: '',
        linhas: [],
        sitorp: letra,
      };
      map.set(numop, agg);
    }
    agg.apontamentos += 1;
    agg.total_horas += Number(row.horas_realizadas || 0);
    if (operador) agg.operadores.add(operador);
    const dt = String(row.data_movimento ?? row.data_apontamento ?? row.data ?? '');
    if (dt && dt > agg.ultimo_apontamento) agg.ultimo_apontamento = dt;
    agg.linhas.push(row);

    const sa = String(row.status_movimento ?? '').toUpperCase();
    const horas = minToHours(row.horas_realizadas);
    const totDia = minToHours(row.total_horas_dia_operador);
    if (sa === 'SEM_APONTAMENTO' || !row.hora_inicial) agg.sem_inicio += 1;
    if (sa === 'ABERTO' || !row.hora_final) agg.sem_fim += 1;
    if (sa === 'DIVERGENTE' || (row.hora_inicial && row.hora_final && String(row.hora_final) < String(row.hora_inicial))) agg.divergentes += 1;
    if (horas > 8 || totDia > 8) agg.acima_8h += 1;
    agg.inconsistencias = agg.sem_inicio + agg.sem_fim + agg.divergentes + agg.acima_8h;
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.inconsistencias !== a.inconsistencias) return b.inconsistencias - a.inconsistencias;
    if (b.total_horas !== a.total_horas) return b.total_horas - a.total_horas;
    return a.numero_op.localeCompare(b.numero_op);
  });
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

function buildColumns(onOpClick: (row: any) => void): Column<any>[] {
  return [
    {
      key: 'numero_op',
      header: 'OP',
      sticky: true,
      stickyWidth: 100,
      render: (v, row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpClick(row);
          }}
          className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium"
          title="Ver detalhes da OP e apontamentos"
        >
          {v ?? '—'}
        </button>
      ),
    },
    { key: 'origem', header: 'Origem' },
    {
      key: 'data_movimento',
      header: 'Data',
      render: (v) => v ? formatDate(v) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'hora_movimento',
      header: 'Hora',
      render: (v) => v ? String(v) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'nome_operador',
      header: 'Operador',
      render: (v, row) => {
        if (v && String(v).trim()) return v;
        const cod = row?.numcad;
        return <span className="text-muted-foreground">— (cód: {cod ?? 0})</span>;
      },
    },
    { key: 'estagio', header: 'Estágio' },
    { key: 'seqrot', header: 'Seq. Rot.', align: 'right' },
    { key: 'seq_apontamento', header: 'Seq. Apont.', align: 'right' },
    { key: 'numcad', header: 'Numcad', align: 'right' },
    { key: 'turno', header: 'Turno' },
    { key: 'codigo_produto', header: 'Produto' },
    { key: 'descricao_produto', header: 'Descrição', render: (v) => <span className="block max-w-[260px] truncate" title={v}>{v || '-'}</span> },
    {
      key: 'horas_realizadas',
      header: 'Tempo (min · h)',
      align: 'right',
      render: (v) => {
        const n = Number(v) || 0;
        if (n === 0) return <span className="text-destructive font-medium">{fmtMinHoras(0)}</span>;
        return fmtMinHoras(n);
      },
    },
    { key: 'total_horas_dia_operador', header: 'Total Dia Op. (min · h)', align: 'right', render: (v) => fmtMinHoras(v) },
    {
      key: 'status_op',
      header: 'Status OP',
      render: (v: string, row: any) => {
        const real = String(row?.sitorp ?? '').trim().toUpperCase();
        const key = real || String(v ?? '').toUpperCase();
        const cfg = statusOpVariants[key];
        if (!cfg) return <span className="text-muted-foreground">—</span>;
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'status_movimento',
      header: 'Status Mov.',
      render: (v: string) => {
        const key = ((v as StatusApont) in statusApontVariants ? v : 'FECHADO') as StatusApont;
        const cfg = statusApontVariants[key];
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },
    },
  ];
}

export default function AuditoriaApontamentoGeniusPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<AuditoriaApontamentoGeniusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  
  const [quickFilter, setQuickFilter] = useState('');
  const [forcarDiagnostico, setForcarDiagnostico] = useState(false);
  const [opSelecionada, setOpSelecionada] = useState<any | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  // Drill profundo genérico — válido para todos os KPIs
  const [kpiDrillAberto, setKpiDrillAberto] = useState(false);
  const [kpiDrillKind, setKpiDrillKind] = useState<KpiDrillKind | null>(null);
  const [statusDrillSomenteInconsist, setStatusDrillSomenteInconsist] = useState(false);
  const [statusDrillBusca, setStatusDrillBusca] = useState('');
  const [statusDrillOrdem, setStatusDrillOrdem] = useState<'inconsist'|'horas'|'apt'|'op'>('inconsist');
  const [opExpandidaNoDrill, setOpExpandidaNoDrill] = useState<string | null>(null);

  const abrirKpiDrill = useCallback((k: KpiDrillKind) => {
    const isProblema = ['discrepancias','semInicio','semFim','fimMenorInicio','acima8h','abaixo5min'].includes(k.kind);
    setStatusDrillSomenteInconsist(isProblema);
    setStatusDrillBusca('');
    setOpExpandidaNoDrill(null);
    setStatusDrillOrdem('inconsist');
    setKpiDrillKind(k);
    setKpiDrillAberto(true);
  }, []);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [intervaloRefresh, setIntervaloRefresh] = useState<30 | 60 | 120>(60);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [agora, setAgora] = useState<Date>(new Date());

  const loadingRef = useRef(false);
  loadingRef.current = loading;
  const buscarRef = useRef<(page?: number) => Promise<void>>();

  const abrirDetalhesOp = useCallback((row: any) => {
    setOpSelecionada(row);
    setDrawerAberto(true);
  }, []);

  const columns = useMemo(() => buildColumns(abrirDetalhesOp), [abrirDetalhesOp]);

  const erpReady = useErpReady();

  const buscarAuditoriaApontamentoGenius = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.', { id: 'erp-not-ready' }); return; }
    setLoading(true);
    try {
      const result = await api.get<AuditoriaApontamentoGeniusResponse>('/api/apontamentos-producao', {
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
      setUltimaAtualizacao(new Date());
    } catch (e: any) {
      toast.error(e.message, { id: 'err-apont-genius' });
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  // Mantém ref atualizada da função de busca para uso no intervalo
  useEffect(() => {
    buscarRef.current = buscarAuditoriaApontamentoGenius;
  }, [buscarAuditoriaApontamentoGenius]);

  // Auto-refresh no intervalo selecionado quando ligado
  useEffect(() => {
    if (!autoRefresh) return;
    // Dispara imediatamente se ainda não houver dados
    if (!data && !loadingRef.current && !document.hidden) {
      buscarRef.current?.(1);
    }
    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (loadingRef.current) return;
      buscarRef.current?.(pagina);
    }, intervaloRefresh * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, intervaloRefresh]);

  // Tick local para recomputar "há Xs"
  useEffect(() => {
    if (!ultimaAtualizacao) return;
    const id = window.setInterval(() => setAgora(new Date()), 5_000);
    return () => window.clearInterval(id);
  }, [ultimaAtualizacao]);

  // Ao voltar a ficar visível, força refresh se passou >60s
  useEffect(() => {
    if (!autoRefresh) return;
    const onVis = () => {
      if (document.hidden) return;
      if (loadingRef.current) return;
      const idade = ultimaAtualizacao ? Date.now() - ultimaAtualizacao.getTime() : Infinity;
      if (idade > intervaloRefresh * 1000) buscarRef.current?.(pagina);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [autoRefresh, ultimaAtualizacao, pagina, intervaloRefresh]);

  const limparTelaAuditoriaApontamentoGenius = useCallback(() => {
    setFilters(initialFilters);
    setData(null);
    setPagina(1);
    setQuickFilter('');
    setForcarDiagnostico(false);
    setOpSelecionada(null);
    setDrawerAberto(false);
    setUltimaAtualizacao(null);
  }, []);

  const tempoDesdeAtualizacao = useMemo(() => {
    if (!ultimaAtualizacao) return null;
    const diffMs = agora.getTime() - ultimaAtualizacao.getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 5) return 'agora';
    if (diffSec < 60) return `há ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    return `há ${diffMin} min`;
  }, [agora, ultimaAtualizacao]);

  // Apontamentos vinculados à OP selecionada (mesmo numero_op + origem)
  const apontamentosDaOp = useMemo(() => {
    if (!opSelecionada) return [] as any[];
    const rows = (data?.dados || []) as any[];
    return rows.filter((r) =>
      String(r.numero_op) === String(opSelecionada.numero_op) &&
      String(r.origem) === String(opSelecionada.origem),
    );
  }, [opSelecionada, data]);

  const totaisApontamentosDaOp = useMemo(() => {
    const totalHoras = apontamentosDaOp.reduce((acc, r) => acc + (Number(r.horas_realizadas) || 0), 0);
    const porStatus: Record<string, number> = {};
    for (const r of apontamentosDaOp) {
      const k = String(r.status_movimento ?? 'FECHADO').toUpperCase();
      porStatus[k] = (porStatus[k] ?? 0) + 1;
    }
    const todosZerados = apontamentosDaOp.length > 0 && totalHoras === 0;
    return { totalHoras, porStatus, todosZerados };
  }, [apontamentosDaOp]);

  const aplicarFiltroListaApontGenius = useMemo(() => {
    const rows = (data?.dados || []) as any[];
    const q = quickFilter.trim().toLowerCase();
    const filtered = !q ? rows : rows.filter((r) => {
      const opLabel = statusOpVariants[r.status_op]?.label || r.status_op || '';
      const apontLabel = statusApontVariants[r.status_movimento as StatusApont]?.label || r.status_movimento || '';
      return [
        r.nome_operador, r.numero_op, r.codigo_produto, r.descricao_produto,
        r.origem, r.turno, r.status_movimento, r.status_op, opLabel, apontLabel,
      ].some((f) => String(f ?? '').toLowerCase().includes(q));
    });
    // Ordenar: registros com horas_realizadas > 0 primeiro
    return [...filtered].sort((a, b) => {
      const ha = Number(a.horas_realizadas || 0) > 0 ? 1 : 0;
      const hb = Number(b.horas_realizadas || 0) > 0 ? 1 : 0;
      return hb - ha;
    });
  }, [data, quickFilter]);

  // Detecta cenário onde o backend devolveu OPs mas NENHUM apontamento foi vinculado
  // (sintoma do JOIN com E930MPR estar quebrado no backend).
  const todosApontamentosZerados = useMemo(() => {
    if (!data) return false;
    const rows = (data.dados || []) as any[];
    if (rows.length === 0) return false;
    const algumComHora = rows.some((r) => Number(r.horas_realizadas || 0) > 0);
    if (algumComHora) return false;
    const r = data.resumo as any;
    const totalReg = r?.total_registros ?? rows.length;
    const semInicio = r?.total_sem_inicio ?? r?.sem_inicio ?? 0;
    // Se ≥95% dos registros estão "sem início", o JOIN do apontamento falhou
    return totalReg > 0 && semInicio / totalReg >= 0.95;
  }, [data]);

  const atualizarKpisApontGenius = useMemo(() => {
    if (!data) return null;
    const r = data.resumo as any;
    const rows = (data.dados || []) as any[];

    // Fallback: agrega contando Set de numop por sitorp nativo (E900COP)
    const opsPorLetra: Record<string, Set<string>> = {
      E: new Set<string>(),
      L: new Set<string>(),
      A: new Set<string>(),
      F: new Set<string>(),
      C: new Set<string>(),
      SEM_STATUS: new Set<string>(),
    };

    // Agregação local de discrepâncias (sempre executa, sobre a página atual)
    let localDiscrepancias = 0;
    let localSemInicio = 0;
    let localSemFim = 0;
    let localFimMenorInicio = 0;
    let localAcima8h = 0;
    let localAbaixo5min = 0;
    let localMaiorDia = 0;
    let localOperadorMaior = '';

    for (const row of rows) {
      const op = String(row.numero_op ?? row.numop ?? '');
      if (op) {
        const real = String(row.sitorp ?? '').trim().toUpperCase();
        if (real && opsPorLetra[real]) {
          opsPorLetra[real].add(op);
        } else {
          // fallback pelo agrupado legado
          const st = normalizarStatusOp(row.status_op);
          if (STATUS_OP_FINALIZADOS.has(st)) opsPorLetra.F.add(op);
          else if (STATUS_OP_CANCELADOS.has(st)) opsPorLetra.C.add(op);
          else if (STATUS_OP_ATIVOS.has(st)) opsPorLetra.A.add(op);
          else opsPorLetra.SEM_STATUS.add(op);
        }
      }

      const sa = String(row.status_movimento ?? '').toUpperCase();
      const minRaw = Number(row.horas_realizadas) || 0;
      const horas = minToHours(row.horas_realizadas);
      const totDia = minToHours(row.total_horas_dia_operador);
      const abaixo5 = minRaw > 0 && minRaw < 5;
      if ((sa && sa !== 'FECHADO') || abaixo5) localDiscrepancias++;
      if (sa === 'SEM_APONTAMENTO') localSemInicio++;
      if (sa === 'ABERTO') localSemFim++;
      if (sa === 'DIVERGENTE') localFimMenorInicio++;
      if (horas > 8 || totDia > 8) localAcima8h++;
      if (abaixo5) localAbaixo5min++;
      if (totDia > localMaiorDia) {
        localMaiorDia = totDia;
        localOperadorMaior = row.nome_operador || '';
      }
    }

    // Detecta se backend mandou algum campo de discrepância no resumo
    const backendTrouxeDiscrepancias = !!r && (
      r.total_discrepancias != null ||
      r.sem_inicio != null || r.total_sem_inicio != null ||
      r.sem_fim != null || r.total_sem_fim != null ||
      r.fim_menor_inicio != null || r.total_fim_menor_inicio != null ||
      r.acima_8h != null || r.total_apontamento_maior_8h != null || r.total_operador_maior_8h_dia != null ||
      r.maior_total_dia_operador != null
    );

    const totalRegistros = r?.total_registros ?? rows.length;
    const acimaBackend = r?.acima_8h
      ?? ((r?.total_apontamento_maior_8h != null || r?.total_operador_maior_8h_dia != null)
            ? ((r?.total_apontamento_maior_8h ?? 0) + (r?.total_operador_maior_8h_dia ?? 0))
            : undefined);

    const discrepanciasParciais =
      !backendTrouxeDiscrepancias && rows.length > 0 && rows.length < totalRegistros;

    const totalEmAndamentoBackend = r?.ops_em_andamento ?? r?.total_ops_andamento;
    const totalFinalizadasBackend = r?.ops_finalizadas ?? r?.total_ops_finalizadas;

    return {
      total_registros: totalRegistros,
      total_discrepancias: r?.total_discrepancias ?? localDiscrepancias,
      sem_inicio: r?.sem_inicio ?? r?.total_sem_inicio ?? localSemInicio,
      sem_fim: r?.sem_fim ?? r?.total_sem_fim ?? localSemFim,
      fim_menor_inicio: r?.fim_menor_inicio ?? r?.total_fim_menor_inicio ?? localFimMenorInicio,
      acima_8h: acimaBackend ?? localAcima8h,
      abaixo_5min: r?.abaixo_5min ?? r?.total_abaixo_5min ?? localAbaixo5min,
      maior_total_dia_operador: r?.maior_total_dia_operador ?? localMaiorDia,
      operador_maior_total: r?.operador_maior_total ?? localOperadorMaior,
      ops_em_andamento: totalEmAndamentoBackend ?? (opsPorLetra.E.size + opsPorLetra.L.size + opsPorLetra.A.size),
      ops_finalizadas: totalFinalizadasBackend ?? opsPorLetra.F.size,
      ops_emitidas: opsPorLetra.E.size,
      ops_liberadas: opsPorLetra.L.size,
      ops_andamento: opsPorLetra.A.size,
      ops_canceladas: opsPorLetra.C.size,
      discrepanciasParciais,
    };
  }, [data]);

  const kpiDrilldowns = useMemo(() => {
    const empty = {
      totalRegistros: [] as { label: string; value: string }[],
      opsPorStatus: {
        E: [] as OpAgg[],
        L: [] as OpAgg[],
        A: [] as OpAgg[],
        F: [] as OpAgg[],
        C: [] as OpAgg[],
      },
      discrepancias: [] as { label: string; value: string }[],
      semInicio: [] as { label: string; value: string }[],
      semFim: [] as { label: string; value: string }[],
      fimMenorInicio: [] as { label: string; value: string }[],
      acima8h: [] as { label: string; value: string }[],
      maiorTotalDia: [] as { label: string; value: string }[],
    };
    if (!data?.dados) return empty;
    const rows = data.dados as any[];

    // Total Registros: top 10 origens
    const origemCount = new Map<string, number>();
    // OPs únicas por sitorp nativo — agregação completa
    const opsByLetra: Record<'E'|'L'|'A'|'F'|'C', Map<string, OpAgg>> = {
      E: new Map(), L: new Map(), A: new Map(), F: new Map(), C: new Map(),
    };
    // Discrepâncias
    const discrep: { label: string; value: string }[] = [];
    const semInicio: { label: string; value: string }[] = [];
    const semFim: { label: string; value: string }[] = [];
    const fimMenorInicio: { label: string; value: string }[] = [];
    const acima8hRaw: { label: string; value: string; horas: number; key: string }[] = [];
    const maiorDiaRaw: { label: string; value: string; total: number; key: string }[] = [];
    const acima8hSeen = new Set<string>();
    const maiorDiaSeen = new Set<string>();

    for (const row of rows) {
      const numop = String(row.numero_op ?? row.numop ?? '').trim();
      const operador = String(row.nome_operador ?? row.operador ?? '').trim();
      const produto = String(row.descricao_produto ?? row.produto ?? row.codigo_produto ?? '').trim();
      const origem = String(row.origem ?? row.codori ?? '').trim();

      if (origem) origemCount.set(origem, (origemCount.get(origem) ?? 0) + 1);

      const real = String(row.sitorp ?? '').trim().toUpperCase();
      let letra: 'E'|'L'|'A'|'F'|'C'|'' = (real === 'E' || real === 'L' || real === 'A' || real === 'F' || real === 'C') ? real : '';
      if (!letra) {
        const st = normalizarStatusOp(row.status_op);
        if (STATUS_OP_FINALIZADOS.has(st)) letra = 'F';
        else if (STATUS_OP_CANCELADOS.has(st)) letra = 'C';
        else if (STATUS_OP_ATIVOS.has(st)) letra = 'A';
      }
      if (numop && letra) {
        let agg = opsByLetra[letra].get(numop);
        if (!agg) {
          agg = {
            numero_op: numop,
            produto: produto || '—',
            codigo_produto: String(row.codigo_produto ?? '').trim(),
            origem,
            apontamentos: 0,
            total_horas: 0,
            inconsistencias: 0,
            sem_inicio: 0,
            sem_fim: 0,
            divergentes: 0,
            acima_8h: 0,
            operadores: new Set<string>(),
            ultimo_apontamento: '',
            linhas: [],
            sitorp: letra,
          };
          opsByLetra[letra].set(numop, agg);
        }
        agg.apontamentos += 1;
        agg.total_horas += Number(row.horas_realizadas || 0);
        if (operador) agg.operadores.add(operador);
        const dt = String(row.data_movimento ?? row.data_apontamento ?? row.data ?? '');
        if (dt && dt > agg.ultimo_apontamento) agg.ultimo_apontamento = dt;
        agg.linhas.push(row);

        const sa = String(row.status_movimento ?? '').toUpperCase();
        const horas = minToHours(row.horas_realizadas);
        const totDia = minToHours(row.total_horas_dia_operador);
        if (sa === 'SEM_APONTAMENTO') agg.sem_inicio += 1;
        if (sa === 'ABERTO') agg.sem_fim += 1;
        if (sa === 'DIVERGENTE') agg.divergentes += 1;
        if (horas > 8 || totDia > 8) agg.acima_8h += 1;
        agg.inconsistencias = agg.sem_inicio + agg.sem_fim + agg.divergentes + agg.acima_8h;
      }

      const sa = String(row.status_movimento ?? '').toUpperCase();
      const horas = minToHours(row.horas_realizadas);
      const totDia = minToHours(row.total_horas_dia_operador);

      const opOpStr = numop || operador ? `OP ${numop || '—'} · ${operador || '—'}` : '—';

      if (sa && sa !== 'FECHADO') {
        const variant = statusApontVariants[derivarStatusApont(row)];
        discrep.push({ label: opOpStr, value: variant?.label ?? sa });
      }
      if (sa === 'SEM_APONTAMONTO' || sa === 'SEM_APONTAMENTO') {
        const dt = formatDate(row.data_apontamento ?? row.data);
        const hr = String(row.hora_inicio ?? row.hora ?? '').trim();
        semInicio.push({ label: opOpStr, value: `${dt}${hr ? ' ' + hr : ''}` });
      }
      if (sa === 'ABERTO') {
        const dt = formatDate(row.data_apontamento ?? row.data);
        const hr = String(row.hora_inicio ?? row.hora ?? '').trim();
        semFim.push({ label: opOpStr, value: `${dt}${hr ? ' ' + hr : ''}` });
      }
      if (sa === 'DIVERGENTE') {
        fimMenorInicio.push({ label: opOpStr, value: fmtMinHoras(row.horas_realizadas, 2) });
      }
      if (horas > 8 || totDia > 8) {
        const key = `${operador}::${numop}`;
        if (!acima8hSeen.has(key)) {
          acima8hSeen.add(key);
          const minutos = horas > 8 ? Number(row.horas_realizadas || 0) : Number(row.total_horas_dia_operador || 0);
          acima8hRaw.push({ label: operador || '—', value: fmtMinHoras(minutos, 2), horas: horas > 8 ? horas : totDia, key });
        }
      }
      if (totDia > 0) {
        const key = `${operador}::${formatDate(row.data_apontamento ?? row.data)}`;
        if (!maiorDiaSeen.has(key)) {
          maiorDiaSeen.add(key);
          maiorDiaRaw.push({ label: operador || '—', value: fmtMinHoras(row.total_horas_dia_operador, 2), total: totDia, key });
        }
      }
    }

    const totalRegistros = Array.from(origemCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([o, c]) => ({ label: `Origem ${o}`, value: formatNumber(c, 0) }));

    // Ordenar OPs por status: inconsistencias desc → horas desc → numop asc; top 30
    const ordenarOps = (m: Map<string, OpAgg>): OpAgg[] =>
      Array.from(m.values()).sort((a, b) => {
        if (b.inconsistencias !== a.inconsistencias) return b.inconsistencias - a.inconsistencias;
        if (b.total_horas !== a.total_horas) return b.total_horas - a.total_horas;
        return a.numero_op.localeCompare(b.numero_op);
      });

    const acima8h = acima8hRaw.sort((a, b) => b.horas - a.horas).slice(0, 15)
      .map(({ label, value }) => ({ label, value }));

    const maiorTotalDia = maiorDiaRaw.sort((a, b) => b.total - a.total).slice(0, 10)
      .map(({ label, value }) => ({ label, value }));

    return {
      totalRegistros,
      opsPorStatus: {
        E: ordenarOps(opsByLetra.E),
        L: ordenarOps(opsByLetra.L),
        A: ordenarOps(opsByLetra.A),
        F: ordenarOps(opsByLetra.F),
        C: ordenarOps(opsByLetra.C),
      },
      discrepancias: discrep.slice(0, 15),
      semInicio: semInicio.slice(0, 15),
      semFim: semFim.slice(0, 15),
      fimMenorInicio: fimMenorInicio.slice(0, 15),
      acima8h,
      maiorTotalDia,
    };
  }, [data]);

  const rowClassName = useCallback((row: any) => {
    const sa = String(row.status_movimento ?? '').toUpperCase();
    const horas = minToHours(row.horas_realizadas);
    const totDia = minToHours(row.total_horas_dia_operador);
    const minRaw = Number(row.horas_realizadas) || 0;
    if (sa === 'DIVERGENTE' || horas > 8 || totDia > 8) {
      return 'bg-destructive/5 hover:bg-destructive/10';
    }
    if (minRaw > 0 && minRaw < 5) {
      return 'bg-amber-500/10 hover:bg-amber-500/20';
    }
    if (sa === 'ABERTO' || sa === 'SEM_APONTAMENTO') {
      return 'bg-amber-500/5 hover:bg-amber-500/10';
    }
    return '';
  }, []);

  // Maior total dia (em minutos) — usado pelo drill do KPI "Maior Total Dia"
  const maxTotalDiaMin = useMemo(() => {
    const rows = (data?.dados ?? []) as any[];
    let max = 0;
    for (const r of rows) {
      const v = Number(r.total_horas_dia_operador || 0);
      if (v > max) max = v;
    }
    return max;
  }, [data]);

  // Filtra linhas brutas conforme o KPI selecionado
  const linhasDoKpi = useCallback((k: KpiDrillKind): any[] => {
    const all = (data?.dados ?? []) as any[];
    switch (k.kind) {
      case 'total':           return all;
      case 'status':          return all.filter((r) => normSitorpRow(r) === k.letra);
      case 'emAndamento':     return all.filter((r) => ['E','L','A'].includes(normSitorpRow(r)));
      case 'finalizadas':     return all.filter((r) => normSitorpRow(r) === 'F');
      case 'semInicio':       return all.filter((r) => !r.hora_inicial || String(r.status_movimento ?? '').toUpperCase() === 'SEM_APONTAMENTO');
      case 'semFim':          return all.filter((r) => !r.hora_final || String(r.status_movimento ?? '').toUpperCase() === 'ABERTO');
      case 'fimMenorInicio':  return all.filter((r) => (r.hora_inicial && r.hora_final && String(r.hora_final) < String(r.hora_inicial)) || String(r.status_movimento ?? '').toUpperCase() === 'DIVERGENTE');
      case 'acima8h':         return all.filter((r) => minToHours(r.horas_realizadas) > 8 || minToHours(r.total_horas_dia_operador) > 8);
      case 'abaixo5min':      return all.filter((r) => { const m = Number(r.horas_realizadas) || 0; return m > 0 && m < 5; });
      case 'discrepancias':   return all.filter(isLinhaDiscrepante);
      case 'maiorTotalDia':   return maxTotalDiaMin > 0 ? all.filter((r) => Number(r.total_horas_dia_operador || 0) === maxTotalDiaMin) : [];
    }
  }, [data, maxTotalDiaMin]);

  const origensOptions = useMemo(
    () => ORIGENS_GENIUS.map((o) => ({ value: o, label: o })),
    []
  );

  const statusOpOptions = useMemo(
    () => [
      { value: 'E', label: 'Emitida (E)' },
      { value: 'L', label: 'Liberada (L)' },
      { value: 'A', label: 'Andamento (A)' },
      { value: 'F', label: 'Finalizada (F)' },
      { value: 'C', label: 'Cancelada (C)' },
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
      <PageHeader
        title="Auditoria Apontamento Genius"
        description="Conferência de apontamentos da operação GENIUS — destaca apontamentos > 8h e totais diários > 8h por operador"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh-apont"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh-apont" className="text-xs cursor-pointer">
                Auto-atualizar
              </Label>
              <Select
                value={String(intervaloRefresh)}
                onValueChange={(v) => setIntervaloRefresh(Number(v) as 30 | 60 | 120)}
              >
                <SelectTrigger className={`h-8 w-[88px] text-xs ${!autoRefresh ? 'opacity-60' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30" className="text-xs">30s</SelectItem>
                  <SelectItem value="60" className="text-xs">1 min</SelectItem>
                  <SelectItem value="120" className="text-xs">2 min</SelectItem>
                </SelectContent>
              </Select>
              {tempoDesdeAtualizacao && (
                <span className="text-xs text-muted-foreground">
                  · Atualizado {tempoDesdeAtualizacao}
                </span>
              )}
            </div>
            <ExportButton endpoint="/api/export/apontamentos-producao" params={exportParams} />
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-4">
            <KpiDrillCard title="Total Registros" value={formatNumber(atualizarKpisApontGenius.total_registros, 0)} icon={<ListChecks className="h-5 w-5" />} variant="default" index={0} kind={{ kind: 'total' }} ops={agregarPorOp(linhasDoKpi({ kind: 'total' }))} onVerTudo={abrirKpiDrill} />
            <KpiDrillCard title="Emitidas (E)" value={formatNumber(atualizarKpisApontGenius.ops_emitidas, 0)} icon={<Activity className="h-5 w-5" />} variant="info" index={1} kind={{ kind: 'status', letra: 'E' }} ops={kpiDrilldowns.opsPorStatus.E} onVerTudo={abrirKpiDrill} />
            <KpiDrillCard title="Liberadas (L)" value={formatNumber(atualizarKpisApontGenius.ops_liberadas, 0)} icon={<Activity className="h-5 w-5" />} variant="info" index={2} kind={{ kind: 'status', letra: 'L' }} ops={kpiDrilldowns.opsPorStatus.L} onVerTudo={abrirKpiDrill} />
            <KpiDrillCard title="Em Andamento (A)" value={formatNumber(atualizarKpisApontGenius.ops_andamento, 0)} icon={<Activity className="h-5 w-5" />} variant="info" index={3} kind={{ kind: 'status', letra: 'A' }} ops={kpiDrilldowns.opsPorStatus.A} onVerTudo={abrirKpiDrill} />
            <KpiDrillCard title="Finalizadas (F)" value={formatNumber(atualizarKpisApontGenius.ops_finalizadas, 0)} icon={<CheckCircle2 className="h-5 w-5" />} variant="default" index={4} kind={{ kind: 'status', letra: 'F' }} ops={kpiDrilldowns.opsPorStatus.F} onVerTudo={abrirKpiDrill} />
            <KpiDrillCard title="Canceladas (C)" value={formatNumber(atualizarKpisApontGenius.ops_canceladas, 0)} icon={<AlertCircle className="h-5 w-5" />} variant="destructive" index={5} kind={{ kind: 'status', letra: 'C' }} ops={kpiDrilldowns.opsPorStatus.C} onVerTudo={abrirKpiDrill} />
            <KpiDrillCard title="Discrepâncias" value={formatNumber(atualizarKpisApontGenius.total_discrepancias, 0)} icon={<AlertCircle className="h-5 w-5" />} variant="destructive" index={6} kind={{ kind: 'discrepancias' }} ops={agregarPorOp(linhasDoKpi({ kind: 'discrepancias' }))} onVerTudo={abrirKpiDrill} />
            <KpiDrillCard title="Sem Início" value={formatNumber(atualizarKpisApontGenius.sem_inicio, 0)} icon={<FileQuestion className="h-5 w-5" />} variant="warning" index={7} kind={{ kind: 'semInicio' }} ops={agregarPorOp(linhasDoKpi({ kind: 'semInicio' }))} onVerTudo={abrirKpiDrill} />
            <KpiDrillCard title="Sem Fim" value={formatNumber(atualizarKpisApontGenius.sem_fim, 0)} icon={<FileQuestion className="h-5 w-5" />} variant="warning" index={8} kind={{ kind: 'semFim' }} ops={agregarPorOp(linhasDoKpi({ kind: 'semFim' }))} onVerTudo={abrirKpiDrill} />
            <KpiDrillCard title="Fim < Início" value={formatNumber(atualizarKpisApontGenius.fim_menor_inicio, 0)} icon={<Timer className="h-5 w-5" />} variant="destructive" index={9} kind={{ kind: 'fimMenorInicio' }} ops={agregarPorOp(linhasDoKpi({ kind: 'fimMenorInicio' }))} onVerTudo={abrirKpiDrill} />
            <KpiDrillCard title="Acima de 8h" value={formatNumber(atualizarKpisApontGenius.acima_8h, 0)} icon={<Clock className="h-5 w-5" />} variant="destructive" index={10} kind={{ kind: 'acima8h' }} ops={agregarPorOp(linhasDoKpi({ kind: 'acima8h' }))} onVerTudo={abrirKpiDrill} />
            <KpiDrillCard title="Abaixo de 5 min" value={formatNumber((atualizarKpisApontGenius as any).abaixo_5min ?? 0, 0)} icon={<AlertTriangle className="h-5 w-5" />} variant="warning" index={11} kind={{ kind: 'abaixo5min' }} ops={agregarPorOp(linhasDoKpi({ kind: 'abaixo5min' }))} onVerTudo={abrirKpiDrill} />
            <KpiDrillCard
              title="Maior Total Dia"
              value={fmtMinHoras(atualizarKpisApontGenius.maior_total_dia_operador, 2)}
              subtitle={atualizarKpisApontGenius.operador_maior_total || undefined}
              icon={<UserCheck className="h-5 w-5" />}
              variant="info"
              index={11}
              kind={{ kind: 'maiorTotalDia' }}
              ops={agregarPorOp(linhasDoKpi({ kind: 'maiorTotalDia' }))}
              onVerTudo={abrirKpiDrill}
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

      {/* Alerta crítico — backend devolveu OPs mas todos os apontamentos vieram zerados.
          Indica falha no JOIN com E930MPR no backend (chaves CODETG/SEQROT/HORINI/HORFIM
          ou cálculo de horas em HHMM). */}
      {todosApontamentosZerados && !forcarDiagnostico && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Apontamentos não vinculados — verificar backend</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <p>
              O backend retornou <strong>{formatNumber(data?.dados?.length ?? 0, 0)} OPs</strong> mas{' '}
              <strong>nenhum apontamento de produção foi vinculado</strong> (todas as horas vieram zeradas
              e quase todos os registros estão como "Sem início").
            </p>
            <p>
              Provável causa: o <code>LEFT JOIN</code> com <code>E930MPR</code> no endpoint
              <code> /api/apontamentos-producao</code> não está casando.
              Verificar no backend: (1) chaves do JOIN (<code>CODETG/SEQROT/HORINI/HORFIM</code> em <code>E930MPR</code>),
              (2) cálculo de horas em formato HHMM, (3) JOIN de operador (<code>U.NUMCAD = M.USU_NUMCAD</code>).
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setForcarDiagnostico(true)}
            >
              Ver diagnóstico técnico
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Painel de diagnóstico técnico — exibido quando o backend devolve `debug`
          OU quando o usuário clica em "Ver diagnóstico técnico". */}
      {data && !loading && (data.debug || forcarDiagnostico) && (
        <DiagnosticoApontGeniusCard
          debug={data.debug}
          totalRetornado={data.dados?.length ?? 0}
          filtros={filters}
          origensGenius={ORIGENS_GENIUS}
        />
      )}

      {data && !loading && !data.debug && (data.dados?.length ?? 0) === 0 && (
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
        emptyMessage="Nenhum apontamento encontrado para os filtros."
      />

      {data && data.total_paginas > 1 && (
        <PaginationControl
          pagina={pagina}
          totalPaginas={data.total_paginas}
          totalRegistros={data.total_registros}
          onPageChange={(p) => buscarAuditoriaApontamentoGenius(p)}
        />
      )}

      <Sheet open={drawerAberto} onOpenChange={setDrawerAberto}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          {opSelecionada && (
            <>
              <SheetHeader className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-base">
                    OP {opSelecionada.numero_op}
                  </SheetTitle>
                  <Badge variant="outline" className="text-xs">Origem {opSelecionada.origem ?? '—'}</Badge>
                  {(() => {
                    const key = String(opSelecionada.sitorp ?? opSelecionada.status_op ?? '').toUpperCase();
                    const cfg = statusOpVariants[key];
                    return cfg ? <Badge className={cfg.className}>{cfg.label}</Badge> : null;
                  })()}
                </div>
                <SheetDescription className="text-xs">
                  {opSelecionada.codigo_produto ? (
                    <>
                      <strong>{opSelecionada.codigo_produto}</strong>
                      {opSelecionada.descricao_produto ? ` — ${opSelecionada.descricao_produto}` : ''}
                    </>
                  ) : '—'}
                </SheetDescription>
              </SheetHeader>

              {/* Bloco: Dados da OP */}
              <div className="mt-4 rounded-md border bg-muted/30 p-3 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Dados da OP
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span><strong>Número OP:</strong> {opSelecionada.numero_op ?? '—'}</span>
                  <span><strong>Origem:</strong> {opSelecionada.origem ?? '—'}</span>
                  <span><strong>Cód. produto:</strong> {opSelecionada.codigo_produto ?? '—'}</span>
                  <span><strong>Status OP:</strong> {(() => { const k = String(opSelecionada.sitorp ?? opSelecionada.status_op ?? '').toUpperCase(); return statusOpVariants[k]?.label ?? k ?? '—'; })()}</span>
                  {'quantidade' in (opSelecionada || {}) && (
                    <span><strong>Quantidade:</strong> {formatNumber(Number(opSelecionada.quantidade) || 0, 2)}</span>
                  )}
                  {opSelecionada.data_inicio && (
                    <span><strong>Data início:</strong> {formatDate(opSelecionada.data_inicio)}</span>
                  )}
                  {opSelecionada.data_fim && (
                    <span><strong>Data fim:</strong> {formatDate(opSelecionada.data_fim)}</span>
                  )}
                  {opSelecionada.descricao_produto && (
                    <span className="col-span-2"><strong>Descrição:</strong> {opSelecionada.descricao_produto}</span>
                  )}
                </div>
              </div>

              {/* Bloco: Apontamentos vinculados */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                    Apontamentos vinculados
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {apontamentosDaOp.length} apont. · {formatNumber(totaisApontamentosDaOp.totalHoras, 2)} h totais
                  </span>
                </div>

                {totaisApontamentosDaOp.todosZerados && (
                  <Alert className="border-amber-500/50 bg-amber-500/10 py-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs">
                      Apontamentos sem horas vinculadas — verifique o backend <code>/api/apontamentos-producao</code>.
                    </AlertDescription>
                  </Alert>
                )}

                {apontamentosDaOp.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum apontamento vinculado.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr className="text-left">
                          <th className="px-2 py-1 font-medium">#</th>
                          <th className="px-2 py-1 font-medium">Operação</th>
                          <th className="px-2 py-1 font-medium">Operador</th>
                          <th className="px-2 py-1 font-medium">Centro</th>
                          <th className="px-2 py-1 font-medium">Início (data + hora)</th>
                          <th className="px-2 py-1 font-medium">Fim (data + hora)</th>
                          <th className="px-2 py-1 font-medium text-right">Apontado (min · h)</th>
                          <th className="px-2 py-1 font-medium text-right">Tot. Dia</th>
                          <th className="px-2 py-1 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...apontamentosDaOp].sort((a: any, b: any) => {
                          const da = String(a.data_movimento ?? '');
                          const db = String(b.data_movimento ?? '');
                          if (da !== db) return da.localeCompare(db);
                          const ha = String(a.hora_inicial ?? a.hora_movimento ?? '');
                          const hb = String(b.hora_inicial ?? b.hora_movimento ?? '');
                          return ha.localeCompare(hb);
                        }).map((r: any, i: number) => {
                          const minRaw = Number(r.horas_realizadas) || 0;
                          const horas = minToHours(r.horas_realizadas);
                          const totDia = minToHours(r.total_horas_dia_operador);
                          const saKey = ((r.status_movimento as StatusApont) in statusApontVariants
                            ? r.status_movimento
                            : 'FECHADO') as StatusApont;
                          const saCfg = statusApontVariants[saKey];

                          const semInicio = !r.hora_inicial;
                          const semFim = !r.hora_final;
                          const fimMenor = !!(r.hora_inicial && r.hora_final && String(r.hora_final) < String(r.hora_inicial));
                          const abaixo5 = minRaw > 0 && minRaw < 5;
                          const acima8h = horas > 8 || totDia > 8;
                          const rowBg = acima8h
                            ? 'bg-red-500/10'
                            : (semInicio || semFim || fimMenor)
                              ? 'bg-orange-500/10'
                              : abaixo5
                                ? 'bg-amber-500/10'
                                : '';
                          const dataFmt = r.data_movimento ? formatDate(r.data_movimento) : '—';

                          return (
                            <tr key={i} className={cn('border-t align-top', rowBg)}>
                              <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                              <td className="px-2 py-1">{r.estagio ?? r.operacao ?? '—'}</td>
                              <td className="px-2 py-1">
                                {r.nome_operador && String(r.nome_operador).trim()
                                  ? r.nome_operador
                                  : <span className="text-muted-foreground">— (cód: {r.numcad ?? 0})</span>}
                              </td>
                              <td className="px-2 py-1">{r.centro_trabalho ?? r.codigo_centro_trabalho ?? '—'}</td>
                              <td className="px-2 py-1">
                                {semInicio ? (
                                  <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Sem início</Badge>
                                ) : (
                                  <div className="leading-tight">
                                    <div>{dataFmt}</div>
                                    <div className="text-muted-foreground">{r.hora_inicial}</div>
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-1">
                                {semFim ? (
                                  <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Sem fim</Badge>
                                ) : fimMenor ? (
                                  <div className="leading-tight">
                                    <div>{dataFmt}</div>
                                    <div className="text-muted-foreground">{r.hora_final}</div>
                                    <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/30 text-[10px] mt-0.5">Fim &lt; Início</Badge>
                                  </div>
                                ) : (
                                  <div className="leading-tight">
                                    <div>{dataFmt}</div>
                                    <div className="text-muted-foreground">{r.hora_final}</div>
                                  </div>
                                )}
                              </td>
                              <td className={cn(
                                'px-2 py-1 text-right tabular-nums',
                                minRaw === 0 && 'text-destructive font-medium',
                                abaixo5 && 'text-amber-700 font-semibold',
                                horas > 8 && 'text-destructive font-bold',
                              )}>
                                {fmtMinHoras(r.horas_realizadas)}
                              </td>
                              <td className={cn(
                                'px-2 py-1 text-right tabular-nums',
                                totDia > 8 && 'text-destructive font-bold',
                              )}>
                                {fmtMinHoras(r.total_horas_dia_operador)}
                              </td>
                              <td className="px-2 py-1">
                                <Badge className={`${saCfg.className} text-[10px]`}>{saCfg.label}</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {Object.keys(totaisApontamentosDaOp.porStatus).length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
                    {Object.entries(totaisApontamentosDaOp.porStatus).map(([k, n]) => {
                      const cfg = statusApontVariants[k as StatusApont];
                      return (
                        <span key={k} className="flex items-center gap-1">
                          <Badge className={`${cfg?.className ?? ''} text-[10px]`}>
                            {cfg?.label ?? k}
                          </Badge>
                          <span>{n}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <KpiDeepSheet
        open={kpiDrillAberto}
        onOpenChange={setKpiDrillAberto}
        kind={kpiDrillKind}
        linhas={kpiDrillKind ? linhasDoKpi(kpiDrillKind) : []}
        somenteInconsist={statusDrillSomenteInconsist}
        setSomenteInconsist={setStatusDrillSomenteInconsist}
        busca={statusDrillBusca}
        setBusca={setStatusDrillBusca}
        ordem={statusDrillOrdem}
        setOrdem={setStatusDrillOrdem}
        opExpandida={opExpandidaNoDrill}
        setOpExpandida={setOpExpandidaNoDrill}
        discrepanciasParciais={!!atualizarKpisApontGenius?.discrepanciasParciais}
        totalRegistros={atualizarKpisApontGenius?.total_registros ?? 0}
        paginaCarregada={data?.dados?.length ?? 0}
        onAbrirDrawerOp={(row) => { setKpiDrillAberto(false); abrirDetalhesOp(row); }}
        onFiltrarGridPorOp={(numop) => {
          setFilters((f) => ({ ...f, numop }));
          setKpiDrillAberto(false);
          setTimeout(() => buscarRef.current?.(1), 0);
        }}
      />
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


// ─── Card de KPI genérico com drill profundo ───────────────────────────────
interface KpiDrillCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default'|'success'|'warning'|'destructive'|'info';
  ops: OpAgg[];
  index?: number;
  kind: KpiDrillKind;
  onVerTudo: (k: KpiDrillKind) => void;
}

function shortStr(s: string, n: number) {
  if (!s) return '—';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function KpiDrillCard({ title, value, subtitle, icon, variant = 'default', ops, index = 0, kind, onVerTudo }: KpiDrillCardProps) {
  const borderClass = kind.kind === 'status' ? STATUS_LETRA_BORDER[kind.letra] : KPI_VARIANT_BORDER[variant];
  const hasOps = ops.length > 0;
  const totalInconsist = ops.reduce((acc, o) => acc + (o.inconsistencias > 0 ? 1 : 0), 0);
  const top = ops.slice(0, 30);

  const tooltipText = `OPs únicas (página atual)${totalInconsist > 0 ? ` · ${totalInconsist} com inconsistência` : ''}`;

  const cardInner = (
    <UICard className={cn('transition-shadow hover:shadow-md border-l-4', borderClass, hasOps && 'cursor-pointer')}>
      <UICardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
              <Info className="h-3 w-3 text-muted-foreground/50" />
            </div>
            <p className="text-xl font-bold text-foreground">{typeof value === 'number' ? formatNumber(value, 0) : value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {totalInconsist > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {totalInconsist} c/ inconsistência
              </p>
            )}
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </UICardContent>
    </UICard>
  );

  const wrapped = (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{cardInner}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: 'easeOut' }}
    >
      {hasOps ? (
        <Popover>
          <PopoverTrigger asChild>
            <div>{wrapped}</div>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" side="bottom" align="start">
            <div className="border-b px-4 py-2">
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">
                {ops.length} OP{ops.length !== 1 ? 's' : ''} (página atual) · top {top.length}
              </p>
            </div>
            <div className="divide-y max-h-[420px] overflow-y-auto">
              {top.map((op) => {
                const inconsist = op.inconsistencias > 0;
                return (
                  <div key={op.numero_op} className={cn('px-4 py-2 text-xs', inconsist && 'bg-destructive/5')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground flex items-center gap-1">
                          {inconsist && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                          OP {op.numero_op}
                        </div>
                        <div className="text-muted-foreground truncate" title={op.produto}>
                          {shortStr(op.produto, 36)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-medium">{op.apontamentos} apt · {fmtMinHoras(op.total_horas, 1)}</div>
                        {inconsist && (
                          <div className="text-destructive">⚠ {op.inconsistencias}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t p-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => onVerTudo(kind)}
              >
                Ver tudo · detalhamento completo →
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        wrapped
      )}
    </motion.div>
  );
}

// ─── Sheet de drill profundo: 3 níveis (header + tabela OPs + accordion linhas)
const KPI_TITLES: Record<KpiDrillKind['kind'], string> = {
  status: 'Status da OP',
  total: 'Total Registros',
  discrepancias: 'Discrepâncias',
  semInicio: 'Sem Início',
  semFim: 'Sem Fim',
  fimMenorInicio: 'Fim < Início',
  acima8h: 'Acima de 8h',
  abaixo5min: 'Abaixo de 5 min',
  maiorTotalDia: 'Maior Total Dia',
  emAndamento: 'Em Andamento (E + L + A)',
  finalizadas: 'Finalizadas (F)',
};

interface KpiDeepSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: KpiDrillKind | null;
  linhas: any[];
  somenteInconsist: boolean;
  setSomenteInconsist: (v: boolean) => void;
  busca: string;
  setBusca: (v: string) => void;
  ordem: 'inconsist'|'horas'|'apt'|'op';
  setOrdem: (v: 'inconsist'|'horas'|'apt'|'op') => void;
  opExpandida: string | null;
  setOpExpandida: (v: string | null) => void;
  discrepanciasParciais: boolean;
  totalRegistros: number;
  paginaCarregada: number;
  onAbrirDrawerOp: (row: any) => void;
  onFiltrarGridPorOp: (numop: string) => void;
}

function KpiDeepSheet({
  open, onOpenChange, kind, linhas,
  somenteInconsist, setSomenteInconsist,
  busca, setBusca,
  ordem, setOrdem,
  opExpandida, setOpExpandida,
  discrepanciasParciais, totalRegistros, paginaCarregada,
  onAbrirDrawerOp, onFiltrarGridPorOp,
}: KpiDeepSheetProps) {
  const ops = useMemo(() => agregarPorOp(linhas), [linhas]);
  const titulo = kind ? (kind.kind === 'status' ? `${STATUS_LETRA_LABEL[kind.letra]} (${kind.letra})` : KPI_TITLES[kind.kind]) : '';
  const variantCfg = kind?.kind === 'status' ? statusOpVariants[kind.letra] : null;
  // Inconsistências por padrão para KPIs problemáticos
  const isProblema = kind && ['discrepancias','semInicio','semFim','fimMenorInicio','acima8h','abaixo5min'].includes(kind.kind);

  const opsFiltradas = useMemo(() => {
    let arr = ops;
    if (somenteInconsist) arr = arr.filter((o) => o.inconsistencias > 0);
    const q = busca.trim().toLowerCase();
    if (q) {
      arr = arr.filter((o) => {
        if (o.numero_op.toLowerCase().includes(q)) return true;
        if (o.produto.toLowerCase().includes(q)) return true;
        if (o.codigo_produto.toLowerCase().includes(q)) return true;
        for (const op of o.operadores) if (op.toLowerCase().includes(q)) return true;
        return false;
      });
    }
    arr = [...arr].sort((a, b) => {
      switch (ordem) {
        case 'horas': return b.total_horas - a.total_horas;
        case 'apt': return b.apontamentos - a.apontamentos;
        case 'op': return a.numero_op.localeCompare(b.numero_op);
        case 'inconsist':
        default:
          if (b.inconsistencias !== a.inconsistencias) return b.inconsistencias - a.inconsistencias;
          return b.total_horas - a.total_horas;
      }
    });
    return arr;
  }, [ops, somenteInconsist, busca, ordem]);

  // Mini-KPIs do recorte
  const totaisStatus = useMemo(() => {
    let totalApt = 0, totalHoras = 0, totalInconsist = 0, opsComInconsist = 0;
    const operadores = new Set<string>();
    const origens = new Map<string, number>();
    for (const o of ops) {
      totalApt += o.apontamentos;
      totalHoras += o.total_horas;
      totalInconsist += o.inconsistencias;
      if (o.inconsistencias > 0) opsComInconsist++;
      o.operadores.forEach((op) => operadores.add(op));
      if (o.origem) origens.set(o.origem, (origens.get(o.origem) ?? 0) + o.apontamentos);
    }
    const topOrigens = Array.from(origens.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { totalApt, totalHoras, totalInconsist, opsComInconsist, totalOperadores: operadores.size, topOrigens };
  }, [ops]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[920px] overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle className="text-base">Detalhes · {titulo}</SheetTitle>
            {variantCfg && <Badge className={variantCfg.className}>{variantCfg.label}</Badge>}
            {isProblema && <Badge variant="destructive">Inconsistência</Badge>}
          </div>
          <SheetDescription className="text-xs">
            {ops.length} OP{ops.length !== 1 ? 's' : ''} · {linhas.length} apontamento{linhas.length !== 1 ? 's' : ''} · página atual ({paginaCarregada} linhas
            {totalRegistros > paginaCarregada ? ` de ${totalRegistros}` : ''})
          </SheetDescription>
        </SheetHeader>

        {discrepanciasParciais && (
          <Alert className="mt-3">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-xs">Detalhamento da página atual</AlertTitle>
            <AlertDescription className="text-xs">
              Os valores cobrem apenas {paginaCarregada} de {totalRegistros} registros. Para análise completa, percorra as páginas.
            </AlertDescription>
          </Alert>
        )}

        {/* Nível 1 — Mini KPIs */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <MiniKpi label="Total OPs" value={formatNumber(ops.length, 0)} />
          <MiniKpi label="OPs c/ inconsistência" value={formatNumber(totaisStatus.opsComInconsist, 0)} destaque={totaisStatus.opsComInconsist > 0} />
          <MiniKpi label="Apontamentos" value={formatNumber(totaisStatus.totalApt, 0)} />
          <MiniKpi label="Tempo total (min · h)" value={fmtMinHoras(totaisStatus.totalHoras, 2)} />
          <MiniKpi label="Operadores únicos" value={formatNumber(totaisStatus.totalOperadores, 0)} />
          <MiniKpi
            label="Top origens"
            value={totaisStatus.topOrigens.length ? totaisStatus.topOrigens.map(([o, n]) => `${o} (${n})`).join(', ') : '—'}
          />
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar OP, produto, operador…"
              className="h-8 text-xs pl-7"
            />
          </div>
          <Select value={ordem} onValueChange={(v) => setOrdem(v as any)}>
            <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inconsist" className="text-xs">Inconsistências (desc)</SelectItem>
              <SelectItem value="horas" className="text-xs">Horas (desc)</SelectItem>
              <SelectItem value="apt" className="text-xs">Apontamentos (desc)</SelectItem>
              <SelectItem value="op" className="text-xs">OP (asc)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="somente-inconsist-drill" checked={somenteInconsist} onCheckedChange={setSomenteInconsist} />
            <Label htmlFor="somente-inconsist-drill" className="text-xs cursor-pointer">Só c/ inconsistência</Label>
          </div>
        </div>

        {/* Nível 2 — Tabela de OPs */}
        <div className="mt-3 rounded-md border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-2 py-1 font-medium w-6"></th>
                <th className="px-2 py-1 font-medium">OP</th>
                <th className="px-2 py-1 font-medium">Produto</th>
                <th className="px-2 py-1 font-medium">Origem</th>
                <th className="px-2 py-1 font-medium text-right">Apt.</th>
                <th className="px-2 py-1 font-medium text-right">Tempo (min · h)</th>
                <th className="px-2 py-1 font-medium text-right">Operadores</th>
                <th className="px-2 py-1 font-medium">Último apont.</th>
                <th className="px-2 py-1 font-medium">Inconsistências</th>
              </tr>
            </thead>
            <tbody>
              {opsFiltradas.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-4 text-center text-muted-foreground">Nenhuma OP para os filtros.</td></tr>
              )}
              {opsFiltradas.map((op) => {
                const expandida = opExpandida === op.numero_op;
                const temInconsist = op.inconsistencias > 0;
                return (
                  <>
                    <tr
                      key={op.numero_op}
                      className={cn('border-t cursor-pointer hover:bg-muted/40', temInconsist && 'bg-destructive/5')}
                      onClick={() => setOpExpandida(expandida ? null : op.numero_op)}
                    >
                      <td className="px-2 py-1">
                        {expandida ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                      <td className="px-2 py-1 font-medium">{op.numero_op}</td>
                      <td className="px-2 py-1 max-w-[220px] truncate" title={op.produto}>{op.produto}</td>
                      <td className="px-2 py-1">{op.origem || '—'}</td>
                      <td className="px-2 py-1 text-right">{op.apontamentos}</td>
                      <td className="px-2 py-1 text-right">{fmtMinHoras(op.total_horas, 2)}</td>
                      <td className="px-2 py-1 text-right">{op.operadores.size}</td>
                      <td className="px-2 py-1">{op.ultimo_apontamento ? formatDate(op.ultimo_apontamento) : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-2 py-1">
                        <div className="flex flex-wrap gap-1">
                          {op.sem_inicio > 0 && <Badge className="bg-amber-500 text-white text-[10px]">SI {op.sem_inicio}</Badge>}
                          {op.sem_fim > 0 && <Badge className="bg-amber-500 text-white text-[10px]">SF {op.sem_fim}</Badge>}
                          {op.divergentes > 0 && <Badge className="bg-destructive text-destructive-foreground text-[10px]">DIV {op.divergentes}</Badge>}
                          {op.acima_8h > 0 && <Badge className="bg-red-700 text-white text-[10px]">&gt;8h {op.acima_8h}</Badge>}
                          {!temInconsist && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>
                    </tr>
                    {expandida && (
                      <tr key={`${op.numero_op}-exp`} className="border-t bg-muted/30">
                        <td colSpan={9} className="px-3 py-3">
                          <OpLinhasInline
                            op={op}
                            onAbrirDrawerOp={onAbrirDrawerOp}
                            onFiltrarGridPorOp={onFiltrarGridPorOp}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MiniKpi({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className={cn('rounded-md border p-2 bg-muted/30', destaque && 'border-destructive/40 bg-destructive/5')}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('text-sm font-semibold text-foreground', destaque && 'text-destructive')}>{value}</div>
    </div>
  );
}

// ─── Nível 3: tabela de apontamentos brutos da OP ──────────────────────────
function OpLinhasInline({
  op,
  onAbrirDrawerOp,
  onFiltrarGridPorOp,
}: {
  op: OpAgg;
  onAbrirDrawerOp: (row: any) => void;
  onFiltrarGridPorOp: (numop: string) => void;
}) {
  // Ordenar por linha do tempo (data + hora inicial)
  const linhas = useMemo(() => {
    return [...op.linhas].sort((a, b) => {
      const da = String(a.data_movimento ?? '');
      const db = String(b.data_movimento ?? '');
      if (da !== db) return da.localeCompare(db);
      const ha = String(a.hora_inicial ?? a.hora_movimento ?? '');
      const hb = String(b.hora_inicial ?? b.hora_movimento ?? '');
      return ha.localeCompare(hb);
    });
  }, [op.linhas]);

  const primeira = linhas[0];

  // Resumo da OP
  const resumo = useMemo(() => {
    let totalMin = 0;
    let inconsist = 0;
    const operadores = new Set<string>();
    const centros = new Set<string>();
    let dataMin: string | null = null;
    let dataMax: string | null = null;
    linhas.forEach((r: any) => {
      const m = Number(r.horas_realizadas) || 0;
      totalMin += m;
      if (isLinhaDiscrepante(r) || (m > 0 && m < 5)) inconsist += 1;
      const op2 = String(r.nome_operador ?? r.numcad ?? '').trim();
      if (op2) operadores.add(op2);
      const ct = String(r.centro_trabalho ?? r.codigo_centro_trabalho ?? r.estagio ?? '').trim();
      if (ct) centros.add(ct);
      const d = String(r.data_movimento ?? '');
      if (d) {
        if (!dataMin || d < dataMin) dataMin = d;
        if (!dataMax || d > dataMax) dataMax = d;
      }
    });
    return { totalMin, inconsist, operadores: operadores.size, centros: centros.size, dataMin, dataMax };
  }, [linhas]);

  const copiarJson = useCallback(() => {
    try {
      navigator.clipboard.writeText(JSON.stringify(linhas, null, 2));
      toast.success(`JSON da OP ${op.numero_op} copiado`);
    } catch {
      toast.error('Falha ao copiar JSON');
    }
  }, [linhas, op.numero_op]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs font-semibold text-foreground">
          Apontamentos brutos · OP {op.numero_op} ({linhas.length} linha{linhas.length !== 1 ? 's' : ''})
        </div>
        <div className="flex flex-wrap gap-1 ml-auto">
          {primeira && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onAbrirDrawerOp(primeira)}
            >
              <ExternalLink className="h-3 w-3 mr-1" /> Abrir no drawer da OP
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onFiltrarGridPorOp(op.numero_op)}
          >
            <FilterIcon className="h-3 w-3 mr-1" /> Filtrar grid principal
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={copiarJson}
          >
            <Copy className="h-3 w-3 mr-1" /> Copiar JSON
          </Button>
        </div>
      </div>

      {/* Resumo da OP */}
      <div className="rounded-md border bg-muted/30 px-3 py-2 grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-1 text-[11px]">
        <div>
          <div className="text-muted-foreground">Período</div>
          <div className="font-medium">
            {resumo.dataMin ? formatDate(resumo.dataMin) : '—'} → {resumo.dataMax ? formatDate(resumo.dataMax) : '—'}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Total apontado</div>
          <div className="font-medium">{fmtMinHoras(resumo.totalMin)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Movimentos</div>
          <div className="font-medium">{linhas.length}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Operadores · Centros</div>
          <div className="font-medium">{resumo.operadores} · {resumo.centros}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Inconsistências</div>
          <div className={cn('font-semibold', resumo.inconsist > 0 ? 'text-destructive' : 'text-emerald-600')}>
            {resumo.inconsist}
          </div>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto bg-background">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-2 py-1 font-medium">#</th>
              <th className="px-2 py-1 font-medium">Operação</th>
              <th className="px-2 py-1 font-medium">Operador</th>
              <th className="px-2 py-1 font-medium">Centro Trab.</th>
              <th className="px-2 py-1 font-medium">Início (data + hora)</th>
              <th className="px-2 py-1 font-medium">Fim (data + hora)</th>
              <th className="px-2 py-1 font-medium text-right">Apontado (min · h)</th>
              <th className="px-2 py-1 font-medium text-right">Total Dia Op.</th>
              <th className="px-2 py-1 font-medium">Status Mov.</th>
              <th className="px-2 py-1 font-medium">Sitorp</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((r: any, i: number) => {
              const minRaw = Number(r.horas_realizadas) || 0;
              const horas = minToHours(r.horas_realizadas);
              const totDia = minToHours(r.total_horas_dia_operador);
              const sa = String(r.status_movimento ?? 'FECHADO').toUpperCase();
              const saCfg = statusApontVariants[(sa in statusApontVariants ? sa : 'FECHADO') as StatusApont];
              const realKey = String(r.sitorp ?? '').toUpperCase();
              const realCfg = realKey ? statusOpVariants[realKey] : null;

              const semInicio = !r.hora_inicial;
              const semFim = !r.hora_final;
              const fimMenor = !!(r.hora_inicial && r.hora_final && String(r.hora_final) < String(r.hora_inicial));
              const abaixo5 = minRaw > 0 && minRaw < 5;
              const acima8h = horas > 8 || totDia > 8;

              const rowBg = acima8h
                ? 'bg-red-500/10'
                : (semInicio || semFim || fimMenor)
                  ? 'bg-orange-500/10'
                  : abaixo5
                    ? 'bg-amber-500/10'
                    : '';

              const dataFmt = r.data_movimento ? formatDate(r.data_movimento) : '—';

              return (
                <tr key={i} className={cn('border-t align-top', rowBg)}>
                  <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-1">{r.estagio ?? r.operacao ?? '—'}</td>
                  <td className="px-2 py-1">
                    {r.nome_operador && String(r.nome_operador).trim()
                      ? <>{r.nome_operador} <span className="text-muted-foreground">({r.numcad ?? 0})</span></>
                      : <span className="text-muted-foreground">— ({r.numcad ?? 0})</span>}
                  </td>
                  <td className="px-2 py-1">{r.centro_trabalho ?? r.codigo_centro_trabalho ?? '—'}</td>
                  <td className="px-2 py-1">
                    {semInicio ? (
                      <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Sem início</Badge>
                    ) : (
                      <div className="leading-tight">
                        <div>{dataFmt}</div>
                        <div className="text-muted-foreground">{r.hora_inicial}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1">
                    {semFim ? (
                      <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Sem fim</Badge>
                    ) : fimMenor ? (
                      <div className="leading-tight">
                        <div>{dataFmt}</div>
                        <div className="text-muted-foreground">{r.hora_final}</div>
                        <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/30 text-[10px] mt-0.5">Fim &lt; Início</Badge>
                      </div>
                    ) : (
                      <div className="leading-tight">
                        <div>{dataFmt}</div>
                        <div className="text-muted-foreground">{r.hora_final}</div>
                      </div>
                    )}
                  </td>
                  <td className={cn(
                    'px-2 py-1 text-right tabular-nums',
                    minRaw === 0 && 'text-destructive font-medium',
                    abaixo5 && 'text-amber-700 font-semibold',
                    horas > 8 && 'text-destructive font-bold',
                  )}>
                    {fmtMinHoras(r.horas_realizadas)}
                  </td>
                  <td className={cn(
                    'px-2 py-1 text-right tabular-nums',
                    totDia > 8 && 'text-destructive font-bold',
                  )}>
                    {fmtMinHoras(r.total_horas_dia_operador)}
                  </td>
                  <td className="px-2 py-1">
                    <Badge className={cn(saCfg?.className ?? '', 'text-[10px]')}>{saCfg?.label ?? sa}</Badge>
                  </td>
                  <td className="px-2 py-1">
                    {realCfg ? <Badge className={cn(realCfg.className, 'text-[10px]')}>{realCfg.label}</Badge> : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
