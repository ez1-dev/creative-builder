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
  Activity, CheckCircle2, CalendarRange, Info,
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
      header: 'H. Realizadas',
      align: 'right',
      render: (v) => {
        const n = Number(v) || 0;
        if (n === 0) return <span className="text-destructive font-medium">{formatNumber(0, 2)}</span>;
        return formatNumber(n, 2);
      },
    },
    { key: 'total_horas_dia_operador', header: 'Total Dia Operador', align: 'right', render: (v) => formatNumber(v, 2) },
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
      if (sa && sa !== 'FECHADO') localDiscrepancias++;
      if (sa === 'SEM_APONTAMENTO') localSemInicio++;
      if (sa === 'ABERTO') localSemFim++;
      if (sa === 'DIVERGENTE') localFimMenorInicio++;
      const horas = Number(row.horas_realizadas || 0);
      const totDia = Number(row.total_horas_dia_operador || 0);
      if (horas > 8 || totDia > 8) localAcima8h++;
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
        E: [] as { label: string; value: string }[],
        L: [] as { label: string; value: string }[],
        A: [] as { label: string; value: string }[],
        F: [] as { label: string; value: string }[],
        C: [] as { label: string; value: string }[],
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
    // OPs únicas por sitorp nativo
    const opsByLetra: Record<string, Map<string, string>> = {
      E: new Map(),
      L: new Map(),
      A: new Map(),
      F: new Map(),
      C: new Map(),
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
      let letra = real && opsByLetra[real] ? real : '';
      if (!letra) {
        const st = normalizarStatusOp(row.status_op);
        if (STATUS_OP_FINALIZADOS.has(st)) letra = 'F';
        else if (STATUS_OP_CANCELADOS.has(st)) letra = 'C';
        else if (STATUS_OP_ATIVOS.has(st)) letra = 'A';
      }
      if (numop && letra && !opsByLetra[letra].has(numop)) {
        opsByLetra[letra].set(numop, produto || '—');
      }

      const sa = String(row.status_movimento ?? '').toUpperCase();
      const horas = Number(row.horas_realizadas || 0);
      const totDia = Number(row.total_horas_dia_operador || 0);

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
        fimMenorInicio.push({ label: opOpStr, value: `${formatNumber(horas, 2)}h` });
      }
      if (horas > 8 || totDia > 8) {
        const key = `${operador}::${numop}`;
        if (!acima8hSeen.has(key)) {
          acima8hSeen.add(key);
          const h = horas > 8 ? horas : totDia;
          acima8hRaw.push({ label: operador || '—', value: `${formatNumber(h, 2)}h`, horas: h, key });
        }
      }
      if (totDia > 0) {
        const key = `${operador}::${formatDate(row.data_apontamento ?? row.data)}`;
        if (!maiorDiaSeen.has(key)) {
          maiorDiaSeen.add(key);
          maiorDiaRaw.push({ label: operador || '—', value: `${formatNumber(totDia, 2)}h`, total: totDia, key });
        }
      }
    }

    const totalRegistros = Array.from(origemCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([o, c]) => ({ label: `Origem ${o}`, value: formatNumber(c, 0) }));

    const toList = (m: Map<string, string>) =>
      Array.from(m.entries()).slice(0, 15).map(([op, prod]) => ({ label: `OP ${op}`, value: prod }));

    const acima8h = acima8hRaw.sort((a, b) => b.horas - a.horas).slice(0, 15)
      .map(({ label, value }) => ({ label, value }));

    const maiorTotalDia = maiorDiaRaw.sort((a, b) => b.total - a.total).slice(0, 10)
      .map(({ label, value }) => ({ label, value }));

    return {
      totalRegistros,
      opsPorStatus: {
        E: toList(opsByLetra.E),
        L: toList(opsByLetra.L),
        A: toList(opsByLetra.A),
        F: toList(opsByLetra.F),
        C: toList(opsByLetra.C),
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
    const horas = Number(row.horas_realizadas || 0);
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
          {atualizarKpisApontGenius.discrepanciasParciais && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>KPIs de discrepância calculados sobre a página atual</AlertTitle>
              <AlertDescription>
                O backend não enviou totais consolidados; os valores de "Discrepâncias", "Sem Início", "Sem Fim",
                "Fim &lt; Início", "Acima de 8h" e "Maior Total Dia" refletem apenas as {data?.dados?.length ?? 0} linhas exibidas
                (de {atualizarKpisApontGenius.total_registros} no total).
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-4">
            <KPICard title="Total Registros" value={formatNumber(atualizarKpisApontGenius.total_registros, 0)} icon={<ListChecks className="h-5 w-5" />} variant="default" index={0} details={kpiDrilldowns.totalRegistros.length ? kpiDrilldowns.totalRegistros : undefined} tooltip="Top da página atual" />
            <KPICard title="Emitidas (E)" value={formatNumber(atualizarKpisApontGenius.ops_emitidas, 0)} icon={<Activity className="h-5 w-5" />} variant="info" index={1} details={kpiDrilldowns.opsPorStatus.E.length ? kpiDrilldowns.opsPorStatus.E : undefined} tooltip="OPs únicas (página atual)" />
            <KPICard title="Liberadas (L)" value={formatNumber(atualizarKpisApontGenius.ops_liberadas, 0)} icon={<Activity className="h-5 w-5" />} variant="info" index={2} details={kpiDrilldowns.opsPorStatus.L.length ? kpiDrilldowns.opsPorStatus.L : undefined} tooltip="OPs únicas (página atual)" />
            <KPICard title="Em Andamento (A)" value={formatNumber(atualizarKpisApontGenius.ops_andamento, 0)} icon={<Activity className="h-5 w-5" />} variant="info" index={3} details={kpiDrilldowns.opsPorStatus.A.length ? kpiDrilldowns.opsPorStatus.A : undefined} tooltip="OPs únicas (página atual)" />
            <KPICard title="Finalizadas (F)" value={formatNumber(atualizarKpisApontGenius.ops_finalizadas, 0)} icon={<CheckCircle2 className="h-5 w-5" />} variant="default" index={4} details={kpiDrilldowns.opsPorStatus.F.length ? kpiDrilldowns.opsPorStatus.F : undefined} tooltip="OPs únicas (página atual)" />
            <KPICard title="Canceladas (C)" value={formatNumber(atualizarKpisApontGenius.ops_canceladas, 0)} icon={<AlertCircle className="h-5 w-5" />} variant="destructive" index={5} details={kpiDrilldowns.opsPorStatus.C.length ? kpiDrilldowns.opsPorStatus.C : undefined} tooltip="OPs únicas (página atual)" />
            <KPICard title="Discrepâncias" value={formatNumber(atualizarKpisApontGenius.total_discrepancias, 0)} icon={<AlertCircle className="h-5 w-5" />} variant="destructive" index={6} details={kpiDrilldowns.discrepancias.length ? kpiDrilldowns.discrepancias : undefined} tooltip={atualizarKpisApontGenius.discrepanciasParciais ? 'Detalhamento da página atual' : undefined} />
            <KPICard title="Sem Início" value={formatNumber(atualizarKpisApontGenius.sem_inicio, 0)} icon={<FileQuestion className="h-5 w-5" />} variant="warning" index={7} details={kpiDrilldowns.semInicio.length ? kpiDrilldowns.semInicio : undefined} tooltip={atualizarKpisApontGenius.discrepanciasParciais ? 'Detalhamento da página atual' : undefined} />
            <KPICard title="Sem Fim" value={formatNumber(atualizarKpisApontGenius.sem_fim, 0)} icon={<FileQuestion className="h-5 w-5" />} variant="warning" index={8} details={kpiDrilldowns.semFim.length ? kpiDrilldowns.semFim : undefined} tooltip={atualizarKpisApontGenius.discrepanciasParciais ? 'Detalhamento da página atual' : undefined} />
            <KPICard title="Fim < Início" value={formatNumber(atualizarKpisApontGenius.fim_menor_inicio, 0)} icon={<Timer className="h-5 w-5" />} variant="destructive" index={9} details={kpiDrilldowns.fimMenorInicio.length ? kpiDrilldowns.fimMenorInicio : undefined} tooltip={atualizarKpisApontGenius.discrepanciasParciais ? 'Detalhamento da página atual' : undefined} />
            <KPICard title="Acima de 8h" value={formatNumber(atualizarKpisApontGenius.acima_8h, 0)} icon={<Clock className="h-5 w-5" />} variant="destructive" index={10} details={kpiDrilldowns.acima8h.length ? kpiDrilldowns.acima8h : undefined} tooltip={atualizarKpisApontGenius.discrepanciasParciais ? 'Detalhamento da página atual' : undefined} />
            <KPICard
              title="Maior Total Dia"
              value={`${formatNumber(atualizarKpisApontGenius.maior_total_dia_operador, 2)} h`}
              subtitle={atualizarKpisApontGenius.operador_maior_total || undefined}
              icon={<UserCheck className="h-5 w-5" />}
              variant="info"
              index={8}
              details={kpiDrilldowns.maiorTotalDia.length ? kpiDrilldowns.maiorTotalDia : undefined}
              tooltip={atualizarKpisApontGenius.discrepanciasParciais ? 'Detalhamento da página atual' : undefined}
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
                    const cfg = statusOpVariants[opSelecionada.status_op];
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
                  <span><strong>Status OP:</strong> {statusOpVariants[opSelecionada.status_op]?.label ?? opSelecionada.status_op ?? '—'}</span>
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
                          <th className="px-2 py-1 font-medium">Data</th>
                          <th className="px-2 py-1 font-medium">Hora</th>
                          <th className="px-2 py-1 font-medium text-right">Horas</th>
                          <th className="px-2 py-1 font-medium">Operador</th>
                          <th className="px-2 py-1 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apontamentosDaOp.map((r, i) => {
                          const horas = Number(r.horas_realizadas) || 0;
                          const saKey = ((r.status_movimento as StatusApont) in statusApontVariants
                            ? r.status_movimento
                            : 'FECHADO') as StatusApont;
                          const saCfg = statusApontVariants[saKey];
                          return (
                            <tr key={i} className="border-t">
                              <td className="px-2 py-1">{r.data_movimento ? formatDate(r.data_movimento) : <span className="text-muted-foreground">—</span>}</td>
                              <td className="px-2 py-1">{r.hora_movimento || <span className="text-muted-foreground">—</span>}</td>
                              <td className={`px-2 py-1 text-right ${horas === 0 ? 'text-destructive font-medium' : ''}`}>
                                {formatNumber(horas, 2)}
                              </td>
                              <td className="px-2 py-1">
                                {r.nome_operador && String(r.nome_operador).trim()
                                  ? r.nome_operador
                                  : <span className="text-muted-foreground">— (cód: {r.numcad ?? 0})</span>}
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

