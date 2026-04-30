import { Fragment, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KPICard } from '@/components/erp/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Plane, DollarSign, TrendingUp, Users, Pencil, Trash2, RotateCcw, X, Layers, Download, Check, ChevronsUpDown, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, ArrowUpDown, Filter } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/format';
import { ColaboradorCombobox } from '@/components/passagens/ColaboradorCombobox';
import { MapaDestinosCard } from '@/components/passagens/MapaDestinosCard';
import { VisualGate } from '@/components/VisualGate';
import { nomeNormalizado } from '@/components/passagens/cidadesBrasil';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePassagensLayout } from '@/hooks/usePassagensLayout';
import { PassagensLayoutGrid } from '@/components/passagens/PassagensLayoutGrid';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export interface Passagem {
  id: string;
  data_registro: string;
  colaborador: string;
  centro_custo: string | null;
  projeto_obra: string | null;
  fornecedor: string | null;
  cia_aerea: string | null;
  numero_bilhete: string | null;
  localizador: string | null;
  origem: string | null;
  destino: string | null;
  data_ida: string | null;
  data_volta: string | null;
  motivo_viagem: string | null;
  tipo_despesa: string;
  valor: number;
  observacoes: string | null;
  uf_destino: string | null;
}

export const TIPO_DESPESA_OPTIONS = [
  'Folha de Campo',
  'Demissão',
  'Viagem Administrativa',
  'Contratação',
  'Transferência de Obra',
  'Outros',
];

type GroupBy = 'centro_custo' | 'projeto_obra' | 'colaborador' | 'motivo_viagem' | 'cia_aerea' | 'tipo_despesa';

const GROUP_OPTIONS: { value: GroupBy; label: string; empty: string }[] = [
  { value: 'centro_custo', label: 'Centro de Custo', empty: 'Sem CC' },
  { value: 'projeto_obra', label: 'Projeto/Obra', empty: 'Sem projeto' },
  { value: 'colaborador', label: 'Colaborador', empty: 'Sem colaborador' },
  { value: 'motivo_viagem', label: 'Motivo da Viagem', empty: 'Não informado' },
  { value: 'cia_aerea', label: 'Cia Aérea', empty: 'Não informada' },
  { value: 'tipo_despesa', label: 'Tipo de Despesa', empty: 'Não informado' },
];

// Paleta inspirada no Power BI (azul, laranja, roxo, magenta, amarelo)
const COLORS = ['#1f9bff', '#1e3a8a', '#f97316', '#7c3aed', '#ec4899', '#eab308', '#06b6d4', '#10b981', '#ef4444', '#8b5cf6'];

interface Props {
  data: Passagem[];
  loading?: boolean;
  onEdit?: (p: Passagem) => void;
  onDelete?: (id: string) => void;
  onExport?: (rows: Passagem[]) => void;
  onExportXlsx?: (rows: Passagem[]) => void;
  readOnly?: boolean;
  /** Quando definido, carrega o layout via RPC pública (página de link compartilhado). */
  shareToken?: string | null;
}

export function PassagensDashboard({ data, loading, onEdit, onDelete, onExport, onExportXlsx, readOnly, shareToken }: Props) {
  const isMobile = useIsMobile();
  // Threshold "compact" para layouts até tablet inclusive (< 1024px):
  // KPI "Registros" e tabela usam a versão empilhada/cards para evitar
  // sobreposição do Select e overflow horizontal da tabela.
  const [isCompact, setIsCompact] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setIsCompact(window.innerWidth < 1024);
    mql.addEventListener('change', onChange);
    onChange();
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // === Layout customizável (drag & drop, salvo globalmente) ===
  const { widgets, isAdmin, saveLayout, resetLayout } = usePassagensLayout({
    shareToken: shareToken ?? null,
  });
  const [editingLayout, setEditingLayout] = useState(false);
  const [pendingLayout, setPendingLayout] = useState<
    { type: string; layout: { x: number; y: number; w: number; h: number } }[] | null
  >(null);
  const [savingLayout, setSavingLayout] = useState(false);
  const canEditLayout = !readOnly && isAdmin && !shareToken;

  const [filtroColaborador, setFiltroColaborador] = useState('');
  const [filtroCC, setFiltroCC] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroMes, setFiltroMes] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('passagens:filtros-aberto');
    if (saved !== null) return saved === '1';
    return false;
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('passagens:filtros-aberto', filtrosAbertos ? '1' : '0');
    }
  }, [filtrosAbertos]);
  // Cross-filters (clique nos gráficos)
  const [selectedMes, setSelectedMes] = useState<string | null>(null);
  const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);
  const [selectedCC, setSelectedCC] = useState<string | null>(null);
  const [selectedDestino, setSelectedDestino] = useState<string | null>(null);
  const [selectedUF, setSelectedUF] = useState<string | null>(null);
  // Agrupamento do card Registros
  const [groupBy, setGroupBy] = useState<GroupBy>('centro_custo');
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  // Controles do card Registros
  const [busca, setBusca] = useState('');
  const [agruparColab, setAgruparColab] = useState(false);
  const [ordenacao, setOrdenacao] = useState<'data_desc'|'data_asc'|'colab_az'|'colab_za'|'valor_desc'|'valor_asc'>('data_desc');
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());
  // Paginação do card Registros (modo lista, sem agrupamento)
  const [pageSize, setPageSize] = useState<number>(25); // 0 = "Todos"
  const [pageIndex, setPageIndex] = useState(0);
  const [outrosMotivoOpen, setOutrosMotivoOpen] = useState(false);
  const OUTROS_LABEL = 'Outros';

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => {
      const m = (r.data_registro ?? '').slice(0, 7);
      if (m) set.add(m);
    });
    return Array.from(set).sort();
  }, [data]);

  const ccsDisponiveis = useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => {
      const cc = (r.centro_custo ?? '').trim();
      if (cc) set.add(cc);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const motivosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => {
      const m = (r.motivo_viagem ?? '').trim();
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const [ccPopoverOpen, setCcPopoverOpen] = useState(false);

  const formatMesLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${nomes[Number(m) - 1] ?? m}/${y}`;
  };

  // Filtros do topo
  const filtered = useMemo(() => data.filter((r) => {
    if (filtroColaborador && !r.colaborador.toLowerCase().includes(filtroColaborador.toLowerCase())) return false;
    if (filtroCC && !(r.centro_custo ?? '').toLowerCase().includes(filtroCC.toLowerCase())) return false;
    if (filtroMotivo !== 'todos' && (r.motivo_viagem ?? '').trim() !== filtroMotivo) return false;
    if (filtroTipo !== 'todos' && r.tipo_despesa !== filtroTipo) return false;
    const dr = (r.data_registro ?? '').slice(0, 10);
    if (filtroMes !== 'todos' && dr.slice(0, 7) !== filtroMes) return false;
    if (dataInicio && dr < dataInicio) return false;
    if (dataFim && dr > dataFim) return false;
    return true;
  }), [data, filtroColaborador, filtroCC, filtroMotivo, filtroTipo, filtroMes, dataInicio, dataFim]);

  // Helper: aplica subset dos cross-filters
  const applyCross = (rows: Passagem[], opts: { mes?: boolean; motivo?: boolean; cc?: boolean; destino?: boolean; uf?: boolean }) => {
    return rows.filter((r) => {
      if (opts.mes && selectedMes && (r.data_registro ?? '').slice(0, 7) !== selectedMes) return false;
      if (opts.motivo && selectedMotivo) {
        const m = (r.motivo_viagem && r.motivo_viagem.trim()) || 'Não informado';
        if (m !== selectedMotivo) return false;
      }
      if (opts.cc && selectedCC) {
        const cc = r.centro_custo || 'Sem CC';
        if (cc !== selectedCC) return false;
      }
      if (opts.destino && selectedDestino) {
        if (!r.destino || nomeNormalizado(r.destino) !== nomeNormalizado(selectedDestino)) return false;
      }
      if (opts.uf && selectedUF) {
        if ((r.uf_destino ?? '').toUpperCase() !== selectedUF) return false;
      }
      return true;
    });
  };

  // Dados para KPIs e tabela: aplica TODOS os cross-filters
  const crossFiltered = useMemo(
    () => applyCross(filtered, { mes: true, motivo: true, cc: true, destino: true, uf: true }),
    [filtered, selectedMes, selectedMotivo, selectedCC, selectedDestino, selectedUF],
  );

  // Linhas exibidas no card Registros: aplica busca + ordenação
  const displayRows = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const filteredRows = q
      ? crossFiltered.filter((r) => {
          const hay = [
            r.colaborador, r.centro_custo, r.projeto_obra, r.fornecedor,
            r.cia_aerea, r.numero_bilhete, r.localizador,
            r.origem, r.destino, r.motivo_viagem, r.tipo_despesa,
          ].map((v) => (v ?? '').toString().toLowerCase()).join(' | ');
          return hay.includes(q);
        })
      : crossFiltered.slice();
    const sorted = filteredRows.sort((a, b) => {
      switch (ordenacao) {
        case 'data_asc': return (a.data_registro ?? '').localeCompare(b.data_registro ?? '');
        case 'data_desc': return (b.data_registro ?? '').localeCompare(a.data_registro ?? '');
        case 'colab_az': return (a.colaborador ?? '').localeCompare(b.colaborador ?? '');
        case 'colab_za': return (b.colaborador ?? '').localeCompare(a.colaborador ?? '');
        case 'valor_asc': return Number(a.valor || 0) - Number(b.valor || 0);
        case 'valor_desc': return Number(b.valor || 0) - Number(a.valor || 0);
        default: return 0;
      }
    });
    return sorted;
  }, [crossFiltered, busca, ordenacao]);

  const subtotalDisplay = useMemo(
    () => displayRows.reduce((s, r) => s + Number(r.valor || 0), 0),
    [displayRows],
  );

  // Paginação: aplicada apenas no modo lista (sem agrupar) e quando pageSize > 0
  const totalPages = useMemo(() => {
    if (agruparColab || pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(displayRows.length / pageSize));
  }, [agruparColab, pageSize, displayRows.length]);

  // Resetar página quando filtros/busca/ordenação/agrupamento/pageSize mudarem
  useEffect(() => {
    setPageIndex(0);
  }, [busca, ordenacao, agruparColab, pageSize, crossFiltered.length]);

  // Garantir que pageIndex não fique fora do range
  useEffect(() => {
    if (pageIndex > totalPages - 1) setPageIndex(Math.max(0, totalPages - 1));
  }, [pageIndex, totalPages]);

  const pagedRows = useMemo(() => {
    if (agruparColab || pageSize <= 0) return displayRows;
    const start = pageIndex * pageSize;
    return displayRows.slice(start, start + pageSize);
  }, [displayRows, agruparColab, pageSize, pageIndex]);

  const subtotalPagina = useMemo(
    () => pagedRows.reduce((s, r) => s + Number(r.valor || 0), 0),
    [pagedRows],
  );

  const showPagination = !agruparColab && pageSize > 0 && displayRows.length > pageSize;
  const pageStart = pagedRows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd = pageIndex * pageSize + pagedRows.length;

  // Agrupamento por colaborador para a visão expansível
  const gruposColab = useMemo(() => {
    const map = new Map<string, { colaborador: string; qtd: number; total: number; registros: Passagem[] }>();
    displayRows.forEach((r) => {
      const key = (r.colaborador ?? '').trim() || 'Sem colaborador';
      const cur = map.get(key) ?? { colaborador: key, qtd: 0, total: 0, registros: [] };
      cur.qtd += 1;
      cur.total += Number(r.valor || 0);
      cur.registros.push(r);
      map.set(key, cur);
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      switch (ordenacao) {
        case 'colab_za': return b.colaborador.localeCompare(a.colaborador);
        case 'valor_asc': return a.total - b.total;
        case 'valor_desc': return b.total - a.total;
        default: return a.colaborador.localeCompare(b.colaborador);
      }
    });
    return arr;
  }, [displayRows, ordenacao]);

  const toggleGrupo = (nome: string) => {
    setGruposAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome); else next.add(nome);
      return next;
    });
  };

  const totalGeral = crossFiltered.reduce((s, r) => s + Number(r.valor || 0), 0);
  const totalRegistros = crossFiltered.length;
  const ticketMedio = totalRegistros > 0 ? totalGeral / totalRegistros : 0;
  const colaboradoresUnicos = useMemo(
    () => new Set(crossFiltered.map((r) => r.colaborador).filter(Boolean)).size,
    [crossFiltered],
  );

  const groupOption = GROUP_OPTIONS.find((g) => g.value === groupBy)!;
  const grupos = useMemo(() => {
    const map = new Map<string, { qtd: number; valor: number }>();
    crossFiltered.forEach((r) => {
      const raw = (r as any)[groupBy];
      const key = (typeof raw === 'string' ? raw.trim() : raw) || groupOption.empty;
      const cur = map.get(key) ?? { qtd: 0, valor: 0 };
      cur.qtd += 1;
      cur.valor += Number(r.valor || 0);
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.valor - a.valor);
  }, [crossFiltered, groupBy, groupOption.empty]);
  const gruposCount = grupos.length;

  const exportGruposCsv = () => {
    const rows = [['Grupo', 'Qtd', 'Valor Total']];
    grupos.forEach((g) => rows.push([g.nome, String(g.qtd), g.valor.toFixed(2).replace('.', ',')]));
    rows.push(['Total', String(totalRegistros), totalGeral.toFixed(2).replace('.', ',')]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passagens-agrupado-${groupBy}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportGruposXlsx = () => {
    const header = [groupOption.label, 'Qtd', 'Valor Total', '% do total'];
    const body = grupos.map((g) => [
      g.nome,
      g.qtd,
      Number(g.valor || 0),
      totalGeral > 0 ? Number(((g.valor / totalGeral) * 100).toFixed(1)) : 0,
    ]);
    body.push(['Total', totalRegistros, Number(totalGeral || 0), 100]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    // Formatar coluna C (Valor) como moeda BRL e D como percentual
    const range = XLSX.utils.decode_range(ws['!ref'] as string);
    for (let R = 1; R <= range.e.r; R++) {
      const cValor = ws[XLSX.utils.encode_cell({ r: R, c: 2 })];
      if (cValor) { cValor.t = 'n'; cValor.z = 'R$ #,##0.00'; }
      const cPerc = ws[XLSX.utils.encode_cell({ r: R, c: 3 })];
      if (cPerc) { cPerc.t = 'n'; cPerc.z = '0.0"%"'; }
    }
    ws['!cols'] = [{ wch: 32 }, { wch: 8 }, { wch: 16 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agrupado');
    XLSX.writeFile(wb, `passagens-agrupado-${groupBy}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };


  // Gráfico Evolução Mensal: ignora apenas selectedMes (próprio eixo)
  const porMes = useMemo(() => {
    const base = applyCross(filtered, { motivo: true, cc: true, destino: true, uf: true });
    const map = new Map<string, number>();
    base.forEach((r) => {
      const mes = r.data_registro.slice(0, 7);
      map.set(mes, (map.get(mes) ?? 0) + Number(r.valor || 0));
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([mes, valor]) => ({ mes, valor }));
  }, [filtered, selectedMotivo, selectedCC, selectedDestino, selectedUF]);

  // Gráfico Motivo: ignora apenas selectedMotivo (próprio eixo).
  // Agrupa fatias <5% do total numa fatia "Outros" com drill-down.
  const { porMotivo, porMotivoOutros, totalMotivo } = useMemo(() => {
    const base = applyCross(filtered, { mes: true, cc: true, destino: true, uf: true });
    const map = new Map<string, number>();
    base.forEach((r) => {
      const m = (r.motivo_viagem && r.motivo_viagem.trim()) || 'Não informado';
      map.set(m, (map.get(m) ?? 0) + Number(r.valor || 0));
    });
    const all = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const total = all.reduce((s, e) => s + e.value, 0);
    const principais: { name: string; value: number }[] = [];
    const outros: { name: string; value: number }[] = [];
    all.forEach((e) => {
      const pct = total > 0 ? e.value / total : 0;
      if (pct < 0.05) outros.push(e);
      else principais.push(e);
    });
    if (outros.length >= 2) {
      const somaOutros = outros.reduce((s, e) => s + e.value, 0);
      principais.push({ name: OUTROS_LABEL, value: somaOutros });
      return { porMotivo: principais, porMotivoOutros: outros, totalMotivo: total };
    }
    return { porMotivo: all, porMotivoOutros: [] as { name: string; value: number }[], totalMotivo: total };
  }, [filtered, selectedMes, selectedCC, selectedDestino, selectedUF]);

  // Gráfico CC: ignora apenas selectedCC (próprio eixo)
  const porCentroCusto = useMemo(() => {
    const base = applyCross(filtered, { mes: true, motivo: true, destino: true, uf: true });
    const map = new Map<string, number>();
    base.forEach((r) => {
      const cc = r.centro_custo || 'Sem CC';
      map.set(cc, (map.get(cc) ?? 0) + Number(r.valor || 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 15);
  }, [filtered, selectedMes, selectedMotivo, selectedDestino, selectedUF]);

  const hasCrossFilter = !!(selectedMes || selectedMotivo || selectedCC || selectedDestino || selectedUF);
  const hasTopFilter = !!filtroColaborador || !!filtroCC || filtroTipo !== 'todos' || filtroMes !== 'todos' || !!dataInicio || !!dataFim;
  const countAtivos = (filtroColaborador ? 1 : 0) + (filtroCC ? 1 : 0) + (filtroTipo !== 'todos' ? 1 : 0) + (filtroMes !== 'todos' ? 1 : 0) + (dataInicio ? 1 : 0) + (dataFim ? 1 : 0);

  const limparTudo = () => {
    setFiltroColaborador('');
    setFiltroCC('');
    setFiltroTipo('todos');
    setFiltroMes('todos');
    setDataInicio('');
    setDataFim('');
    setSelectedMes(null);
    setSelectedMotivo(null);
    setSelectedCC(null);
    setSelectedDestino(null);
    setSelectedUF(null);
  };

  // Dados para o mapa: respeita filtros do topo + outros cross-filters, exceto o próprio destino
  const mapaData = useMemo(
    () => applyCross(filtered, { mes: true, motivo: true, cc: true }),
    [filtered, selectedMes, selectedMotivo, selectedCC],
  );

  // Cores para destaque condicional
  const primaryColor = 'hsl(var(--primary))';
  const dimOpacity = 0.3;

  return (
    <div className="space-y-4">
      <Card>
        <button
          type="button"
          onClick={() => setFiltrosAbertos((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-accent/40 rounded-t-lg"
          aria-expanded={filtrosAbertos}
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {hasTopFilter && (
              <Badge variant="secondary" className="ml-1 h-5 text-xs">
                {countAtivos} ativo{countAtivos === 1 ? '' : 's'}
              </Badge>
            )}
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {!filtrosAbertos && hasTopFilter && (
              <span className="hidden text-xs sm:inline">Mostrar</span>
            )}
            {filtrosAbertos
              ? <ChevronUp className="h-4 w-4" />
              : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
        {filtrosAbertos && (
          <CardContent className="space-y-3 p-4 pt-3 border-t">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
              <div>
                <Label className="text-xs">Colaborador</Label>
                <ColaboradorCombobox
                  value={filtroColaborador}
                  onChange={setFiltroColaborador}
                  placeholder="Todos"
                  allowCreate={false}
                />
              </div>
              <div>
                <Label className="text-xs">Centro de Custo</Label>
                <Popover open={ccPopoverOpen} onOpenChange={setCcPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={ccPopoverOpen}
                      className={cn('w-full justify-between font-normal', !filtroCC && 'text-muted-foreground')}
                    >
                      <span className="truncate">{filtroCC || 'Todos'}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar centro de custo..." />
                      <CommandList>
                        <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__todos__"
                            onSelect={() => { setFiltroCC(''); setCcPopoverOpen(false); }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', !filtroCC ? 'opacity-100' : 'opacity-0')} />
                            Todos
                          </CommandItem>
                          {ccsDisponiveis.map((cc) => (
                            <CommandItem
                              key={cc}
                              value={cc}
                              onSelect={() => { setFiltroCC(cc); setCcPopoverOpen(false); }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', filtroCC === cc ? 'opacity-100' : 'opacity-0')} />
                              {cc}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {TIPO_DESPESA_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Mês</Label>
                <Select value={filtroMes} onValueChange={setFiltroMes}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {mesesDisponiveis.map((m) => (
                      <SelectItem key={m} value={m}>{formatMesLabel(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data início</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Data fim</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={limparTudo}
                disabled={!hasTopFilter && !hasCrossFilter}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {hasCrossFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Filtros do gráfico:</span>
          {selectedMes && (
            <Badge variant="secondary" className="gap-1">
              Mês: {formatMesLabel(selectedMes)}
              <button onClick={() => setSelectedMes(null)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedMotivo && (
            <Badge variant="secondary" className="gap-1">
              Motivo: {selectedMotivo}
              <button onClick={() => setSelectedMotivo(null)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedCC && (
            <Badge variant="secondary" className="gap-1">
              CC: {selectedCC}
              <button onClick={() => setSelectedCC(null)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedDestino && (
            <Badge variant="secondary" className="gap-1">
              Destino: {selectedDestino}
              <button onClick={() => setSelectedDestino(null)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {canEditLayout && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          {!editingLayout ? (
            <Button size="sm" variant="outline" onClick={() => setEditingLayout(true)}>
              <Layers className="mr-1.5 h-4 w-4" />
              Editar layout
            </Button>
          ) : (
            <>
              <span className="text-xs font-medium text-primary">Modo edição: arraste ou redimensione os blocos</span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditingLayout(false); setPendingLayout(null); }} disabled={savingLayout}>Cancelar</Button>
                <Button size="sm" variant="outline" disabled={savingLayout} onClick={async () => {
                  if (!confirm('Restaurar o layout padrão para todos os usuários?')) return;
                  setSavingLayout(true);
                  try { await resetLayout(); setEditingLayout(false); setPendingLayout(null); toast.success('Layout restaurado.'); }
                  catch (e: any) { toast.error(e?.message ?? 'Falha ao restaurar layout'); }
                  finally { setSavingLayout(false); }
                }}>Restaurar padrão</Button>
                <Button size="sm" disabled={savingLayout} onClick={async () => {
                  if (!pendingLayout) { setEditingLayout(false); return; }
                  setSavingLayout(true);
                  try { await saveLayout(pendingLayout); setEditingLayout(false); setPendingLayout(null); toast.success('Layout salvo para todos os usuários.'); }
                  catch (e: any) { toast.error(e?.message ?? 'Falha ao salvar layout'); }
                  finally { setSavingLayout(false); }
                }}>{savingLayout ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </>
          )}
        </div>
      )}

      <PassagensLayoutGrid
        widgets={widgets}
        editing={editingLayout}
        onLayoutChange={setPendingLayout}
        blocks={{
          'kpis-row': (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        <KPICard title="Total Geral" value={formatCurrency(totalGeral)} icon={<DollarSign className="h-5 w-5" />} index={0} />
        {isCompact ? (
          <div className="flex flex-col gap-2">
            <KPICard
              title="Registros"
              value={totalRegistros}
              icon={<Plane className="h-5 w-5" />}
              variant="info"
              index={1}
              subtitle={`${gruposCount} ${groupOption.label}${gruposCount === 1 ? '' : 's'}`}
            />
            <div className="flex items-center gap-1 px-1">
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <SelectTrigger className="h-7 flex-1 text-xs" aria-label="Agrupar por">
                  <Layers className="mr-1 h-3 w-3 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value} className="text-xs">{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => setGroupSheetOpen(true)}
                disabled={gruposCount === 0}
                aria-label="Ver detalhes do agrupamento"
                title="Ver detalhes"
              >
                <Layers className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative h-full">
            <KPICard
              title="Registros"
              value={totalRegistros}
              icon={<Plane className="h-5 w-5" />}
              variant="info"
              index={1}
              subtitle={`${gruposCount} ${groupOption.label}${gruposCount === 1 ? '' : 's'}`}
            />
            <div className="absolute right-3 top-3 flex items-center gap-1">
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <SelectTrigger className="h-7 w-[130px] text-xs" aria-label="Agrupar por">
                  <Layers className="mr-1 h-3 w-3 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value} className="text-xs">{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => setGroupSheetOpen(true)}
                disabled={gruposCount === 0}
                aria-label="Ver detalhes do agrupamento"
                title="Ver detalhes"
              >
                <Layers className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <KPICard title="Colaboradores" value={colaboradoresUnicos} icon={<Users className="h-5 w-5" />} variant="success" index={2} />
        <KPICard title="Ticket Médio" value={formatCurrency(ticketMedio)} icon={<TrendingUp className="h-5 w-5" />} variant="warning" index={3} />
      </div>
          ),
          'mapa-destinos': (
      <VisualGate visualKey="passagens.mapa-destinos">
        <div className="grid grid-cols-1 gap-4">
          <MapaDestinosCard
            data={mapaData}
            selectedDestino={selectedDestino}
            onSelectDestino={setSelectedDestino}
          />
        </div>
      </VisualGate>
          ),
          'charts-row': (
      <VisualGate visualKey="passagens.kpis-charts">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Evolução Mensal {selectedMes && <span className="text-xs font-normal text-muted-foreground">(clique novamente para limpar)</span>}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porMes}>
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <RTooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar
                  dataKey="valor"
                  cursor="pointer"
                  onClick={(d: any) => setSelectedMes((prev) => (prev === d.mes ? null : d.mes))}
                >
                  {porMes.map((entry) => (
                    <Cell
                      key={entry.mes}
                      fill={primaryColor}
                      fillOpacity={selectedMes && selectedMes !== entry.mes ? dimOpacity : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Por Motivo de Viagem {selectedMotivo && <span className="text-xs font-normal text-muted-foreground">(clique novamente para limpar)</span>}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={isMobile ? 360 : 320}>
              <PieChart margin={isMobile ? { top: 8, right: 8, bottom: 8, left: 8 } : { top: 20, right: 30, bottom: 20, left: 30 }}>
                <Pie
                  data={porMotivo}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={isMobile ? 70 : 100}
                  cursor="pointer"
                  onClick={(d: any) => {
                    if (d.name === OUTROS_LABEL) {
                      setOutrosMotivoOpen(true);
                    } else {
                      setSelectedMotivo((prev) => (prev === d.name ? null : d.name));
                    }
                  }}
                  labelLine={isMobile ? false : { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                  label={isMobile
                    ? (e: any) => `${((e.percent ?? 0) * 100).toFixed(0)}%`
                    : (e: any) => {
                        const v = Number(e.value || 0);
                        const mil = `R$${(v / 1000).toFixed(0)} Mil`;
                        const pct = ((e.percent ?? 0) * 100).toFixed(1).replace('.', ',');
                        return `${e.name} ${mil} (${pct}%)`;
                      }}
                  style={{ fontSize: 11 }}
                >
                  {porMotivo.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.name === OUTROS_LABEL ? 'hsl(var(--muted-foreground))' : COLORS[i % COLORS.length]}
                      fillOpacity={selectedMotivo && selectedMotivo !== entry.name ? dimOpacity : 1}
                    />
                  ))}
                </Pie>
                <RTooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            {isMobile && porMotivo.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {porMotivo.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-1">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: entry.name === OUTROS_LABEL ? 'hsl(var(--muted-foreground))' : COLORS[i % COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            )}
            {porMotivoOutros.length > 0 && (
              <button
                type="button"
                onClick={() => setOutrosMotivoOpen(true)}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Ver detalhamento de "Outros" ({porMotivoOutros.length} motivos)
              </button>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Top {isMobile ? 10 : 15} Centros de Custo {selectedCC && <span className="text-xs font-normal text-muted-foreground">(clique novamente para limpar)</span>}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={isMobile ? 360 : 420}>
              <BarChart data={isMobile ? porCentroCusto.slice(0, 10) : porCentroCusto} layout="vertical">
                <XAxis type="number" fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  fontSize={isMobile ? 10 : 11}
                  width={isMobile ? 90 : 140}
                  tickFormatter={(v: string) => (isMobile && v.length > 12 ? `${v.slice(0, 12)}…` : v)}
                />
                <RTooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar
                  dataKey="value"
                  cursor="pointer"
                  onClick={(d: any) => setSelectedCC((prev) => (prev === d.name ? null : d.name))}
                >
                  {porCentroCusto.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={primaryColor}
                      fillOpacity={selectedCC && selectedCC !== entry.name ? dimOpacity : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      </VisualGate>
          ),
          'tabela-registros': (
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm">Registros ({displayRows.length})</CardTitle>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="h-8 w-full pl-7 text-xs sm:w-[200px]"
              />
            </div>
            <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as typeof ordenacao)}>
              <SelectTrigger className="h-8 w-full text-xs sm:w-[180px]" aria-label="Ordenar">
                <ArrowUpDown className="mr-1 h-3 w-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data_desc" className="text-xs">Data (mais recente)</SelectItem>
                <SelectItem value="data_asc" className="text-xs">Data (mais antiga)</SelectItem>
                <SelectItem value="colab_az" className="text-xs">Colaborador (A→Z)</SelectItem>
                <SelectItem value="colab_za" className="text-xs">Colaborador (Z→A)</SelectItem>
                <SelectItem value="valor_desc" className="text-xs">Valor (maior)</SelectItem>
                <SelectItem value="valor_asc" className="text-xs">Valor (menor)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={agruparColab ? 'default' : 'outline'}
              className="h-8 flex-1 text-xs sm:flex-none"
              onClick={() => setAgruparColab((v) => !v)}
            >
              <Users className="mr-1 h-3.5 w-3.5" />
              <span className="sm:hidden">Agrupar</span>
              <span className="hidden sm:inline">Agrupar Colaborador</span>
            </Button>
            {onExport && (
              <Button size="sm" variant="outline" className="h-8 flex-1 text-xs sm:flex-none" onClick={() => onExport(displayRows)} disabled={displayRows.length === 0}>
                <span className="sm:hidden">CSV</span>
                <span className="hidden sm:inline">Exportar CSV</span>
              </Button>
            )}
            {onExportXlsx && (
              <Button size="sm" variant="outline" className="h-8 flex-1 text-xs sm:flex-none" onClick={() => onExportXlsx(displayRows)} disabled={displayRows.length === 0}>
                <span className="sm:hidden">Excel</span>
                <span className="hidden sm:inline">Exportar Excel</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className={cn(isCompact ? 'p-3' : 'overflow-x-auto p-0')}>
          {isCompact ? (
            loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : displayRows.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhum registro</div>
            ) : agruparColab ? (
              <div className="space-y-2">
                {gruposColab.map((g) => {
                  const aberto = gruposAbertos.has(g.colaborador);
                  return (
                    <div key={g.colaborador} className="rounded-md border">
                      <button
                        type="button"
                        onClick={() => toggleGrupo(g.colaborador)}
                        className="flex w-full items-center justify-between gap-2 bg-muted/40 px-3 py-2 text-left hover:bg-muted/60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {aberto ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                          <span className="truncate text-sm font-medium">{g.colaborador}</span>
                          <Badge variant="secondary" className="text-[10px]">{g.qtd}</Badge>
                        </div>
                        <span className="shrink-0 text-sm font-semibold">{formatCurrency(g.total)}</span>
                      </button>
                      {aberto && (
                        <div className="space-y-2 p-2">
                          {g.registros.map((r) => (
                            <PassagemMobileCard
                              key={r.id}
                              p={r}
                              onEdit={!readOnly ? onEdit : undefined}
                              onDelete={!readOnly ? onDelete : undefined}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {pagedRows.map((r) => (
                  <PassagemMobileCard
                    key={r.id}
                    p={r}
                    onEdit={!readOnly ? onEdit : undefined}
                    onDelete={!readOnly ? onDelete : undefined}
                  />
                ))}
                {displayRows.length > 0 && (
                  <div className="flex items-center justify-between rounded-md border bg-muted/60 px-3 py-2 text-sm font-semibold">
                    <span>
                      Subtotal · {displayRows.length} {displayRows.length === 1 ? 'registro' : 'registros'}
                    </span>
                    <span>{formatCurrency(subtotalDisplay)}</span>
                  </div>
                )}
              </div>
            )
          ) : (() => {
            const hasActions = !readOnly && (onEdit || onDelete);
            const baseCols = agruparColab ? 6 : 7; // Data, [Colab?], C.Custo, Motivo da Viagem, O→D, Tipo, Valor
            const totalCols = baseCols + (hasActions ? 1 : 0);
            return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  {!agruparColab && <TableHead>Colaborador</TableHead>}
                  <TableHead>C. Custo</TableHead>
                  <TableHead>Motivo da Viagem</TableHead>
                  <TableHead>Origem → Destino</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  {hasActions && <TableHead className="w-24">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={totalCols} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : displayRows.length === 0 ? (
                  <TableRow><TableCell colSpan={totalCols} className="text-center py-8 text-muted-foreground">Nenhum registro</TableCell></TableRow>
                ) : agruparColab ? (
                  gruposColab.map((g) => {
                    const aberto = gruposAbertos.has(g.colaborador);
                    return (
                      <Fragment key={g.colaborador}>
                        <TableRow
                          className="cursor-pointer bg-muted/40 hover:bg-muted/60"
                          onClick={() => toggleGrupo(g.colaborador)}
                        >
                          <TableCell colSpan={baseCols - 1} className="font-medium">
                            <div className="flex items-center gap-2">
                              {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span>{g.colaborador}</span>
                              <Badge variant="secondary" className="text-[10px]">{g.qtd} {g.qtd === 1 ? 'registro' : 'registros'}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(g.total)}</TableCell>
                          {hasActions && <TableCell />}
                        </TableRow>
                        {aberto && g.registros.map((r) => (
                          <TableRow key={r.id} className="bg-background border-l-2 border-l-muted">
                            <TableCell>{formatDate(r.data_registro)}</TableCell>
                            <TableCell>{r.centro_custo ?? '-'}</TableCell>
                            <TableCell>{r.tipo_despesa}</TableCell>
                            <TableCell>{r.origem ?? '-'} → {r.destino ?? '-'}</TableCell>
                            <TableCell>{r.cia_aerea ?? '-'}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.valor)}</TableCell>
                            {hasActions && (
                              <TableCell>
                                <div className="flex gap-1">
                                  {onEdit && <Button size="icon" variant="ghost" onClick={() => onEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>}
                                  {onDelete && <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </Fragment>
                    );
                  })
                ) : pagedRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.data_registro)}</TableCell>
                    <TableCell className="font-medium">{r.colaborador}</TableCell>
                    <TableCell>{r.centro_custo ?? '-'}</TableCell>
                    <TableCell>{r.tipo_despesa}</TableCell>
                    <TableCell>{r.origem ?? '-'} → {r.destino ?? '-'}</TableCell>
                    <TableCell>{r.cia_aerea ?? '-'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.valor)}</TableCell>
                    {!readOnly && (onEdit || onDelete) && (
                      <TableCell>
                        <div className="flex gap-1">
                          {onEdit && <Button size="icon" variant="ghost" onClick={() => onEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>}
                          {onDelete && <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              {displayRows.length > 0 && (
                <TableFooter>
                  <TableRow className="font-semibold hover:bg-transparent">
                    <TableCell colSpan={baseCols - 1}>
                      Subtotal · {displayRows.length} {displayRows.length === 1 ? 'registro' : 'registros'}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(subtotalDisplay)}</TableCell>
                    {hasActions && <TableCell />}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
            );
          })()}
          {!agruparColab && displayRows.length > 0 && (
            <div className={cn(
              'flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2 text-xs',
              isCompact && 'mt-2 rounded-md border',
            )}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>
                  {pageSize > 0
                    ? `Mostrando ${pageStart}–${pageEnd} de ${displayRows.length}`
                    : `Mostrando todos · ${displayRows.length}`}
                </span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-7 w-[110px] text-xs" aria-label="Registros por página">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25" className="text-xs">25 por página</SelectItem>
                    <SelectItem value="50" className="text-xs">50 por página</SelectItem>
                    <SelectItem value="100" className="text-xs">100 por página</SelectItem>
                    <SelectItem value="0" className="text-xs">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {showPagination && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => setPageIndex(0)}
                    disabled={pageIndex === 0}
                    aria-label="Primeira página"
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                    disabled={pageIndex === 0}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2 text-muted-foreground">
                    Página {pageIndex + 1} de {totalPages}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={pageIndex >= totalPages - 1}
                    aria-label="Próxima página"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => setPageIndex(totalPages - 1)}
                    disabled={pageIndex >= totalPages - 1}
                    aria-label="Última página"
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
          ),
        }}
      />

      <Sheet open={groupSheetOpen} onOpenChange={setGroupSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Registros agrupados por {groupOption.label}</SheetTitle>
            <SheetDescription>
              {totalRegistros} registro{totalRegistros === 1 ? '' : 's'} em {gruposCount} grupo{gruposCount === 1 ? '' : 's'} — total {formatCurrency(totalGeral)}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={exportGruposCsv} disabled={gruposCount === 0}>
              <Download className="mr-1 h-4 w-4" /> Exportar CSV
            </Button>
            <Button size="sm" variant="outline" onClick={exportGruposXlsx} disabled={gruposCount === 0}>
              <Download className="mr-1 h-4 w-4" /> Exportar Excel
            </Button>
          </div>
          <div className="mt-2 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{groupOption.label}</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">% do total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.map((g) => (
                  <TableRow key={g.nome}>
                    <TableCell className="font-medium">{g.nome}</TableCell>
                    <TableCell className="text-right">{g.qtd}</TableCell>
                    <TableCell className="text-right">{formatCurrency(g.valor)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {totalGeral > 0 ? ((g.valor / totalGeral) * 100).toFixed(1) : '0.0'}%
                    </TableCell>
                  </TableRow>
                ))}
                {grupos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Sem dados</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {grupos.length > 0 && (
            <div className="mt-3 flex justify-between border-t pt-3 text-sm font-semibold">
              <span>Total</span>
              <span>{totalRegistros} registros · {formatCurrency(totalGeral)}</span>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={outrosMotivoOpen} onOpenChange={setOutrosMotivoOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detalhamento — Outros motivos</SheetTitle>
            <SheetDescription>
              Motivos com participação menor que 5% do total{porMotivoOutros.length > 0 && ` · ${porMotivoOutros.length} motivos`}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">% total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porMotivoOutros.map((m) => {
                  const pct = totalMotivo > 0 ? (m.value / totalMotivo) * 100 : 0;
                  return (
                    <TableRow
                      key={m.name}
                      className="cursor-pointer hover:bg-accent/40"
                      onClick={() => {
                        setSelectedMotivo(m.name);
                        setOutrosMotivoOpen(false);
                      }}
                    >
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.value)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {pct.toFixed(1).replace('.', ',')}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                {porMotivoOutros.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      Nenhum motivo agrupado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Clique em um motivo para filtrar todo o dashboard por ele.
          </p>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function exportPassagensCsv(rows: Passagem[]) {
  const headers = ['Data', 'Colaborador', 'Centro Custo', 'Projeto/Obra', 'Motivo da Viagem', 'Origem', 'Destino', 'Tipo', 'Bilhete', 'Valor'];
  const data = rows.map((r) => [
    r.data_registro, r.colaborador, r.centro_custo ?? '', r.projeto_obra ?? '',
    r.tipo_despesa, r.origem ?? '', r.destino ?? '', r.cia_aerea ?? '',
    r.numero_bilhete ?? '', r.valor,
  ]);
  const csv = [headers, ...data].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `passagens-aereas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  // Aceita 'YYYY-MM-DD' (puro) ou ISO. Mantém a data no fuso local sem deslocamento.
  const ymd = value.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function exportPassagensXlsx(rows: Passagem[]) {
  const headers = [
    'Data Registro', 'Colaborador', 'Centro Custo', 'Projeto/Obra', 'Fornecedor',
    'Cia Aérea', 'Nº Bilhete', 'Localizador', 'Origem', 'Destino',
    'Data Ida', 'Data Volta', 'Motivo Viagem', 'Tipo Despesa', 'Valor (R$)', 'Observações',
  ];
  const body = rows.map((r) => [
    parseDateOrNull(r.data_registro),
    r.colaborador,
    r.centro_custo ?? '',
    r.projeto_obra ?? '',
    r.fornecedor ?? '',
    r.cia_aerea ?? '',
    r.numero_bilhete ?? '',
    r.localizador ?? '',
    r.origem ?? '',
    r.destino ?? '',
    parseDateOrNull(r.data_ida),
    parseDateOrNull(r.data_volta),
    r.motivo_viagem ?? '',
    r.tipo_despesa,
    Number(r.valor || 0),
    r.observacoes ?? '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...body], { cellDates: true });

  // Total no final
  const totalRow = body.length + 1; // 0-based row index of total
  const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0);
  XLSX.utils.sheet_add_aoa(ws, [[
    '', '', '', '', '', '', '', '', '', '', '', '', '', 'Total', total, '',
  ]], { origin: { r: totalRow, c: 0 } });

  // Aplica formatos por coluna
  const range = XLSX.utils.decode_range(ws['!ref'] as string);
  const dateCols = [0, 10, 11]; // Data Registro, Data Ida, Data Volta
  const valorCol = 14; // Valor (R$)
  for (let R = 1; R <= range.e.r; R++) {
    for (const c of dateCols) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c })];
      if (cell && cell.v instanceof Date) {
        cell.t = 'd';
        cell.z = 'dd/mm/yyyy';
      }
    }
    const cValor = ws[XLSX.utils.encode_cell({ r: R, c: valorCol })];
    if (cValor && cValor.v !== '' && cValor.v != null) {
      cValor.t = 'n';
      cValor.z = 'R$ #,##0.00';
    }
  }

  ws['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 20 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 32 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Passagens');
  XLSX.writeFile(wb, `passagens-aereas-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

interface PassagemMobileCardProps {
  p: Passagem;
  onEdit?: (p: Passagem) => void;
  onDelete?: (id: string) => void;
}

function PassagemMobileCard({ p, onEdit, onDelete }: PassagemMobileCardProps) {
  return (
    <div className="rounded-md border bg-card p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{formatDate(p.data_registro)}</div>
          <div className="truncate font-medium">{p.colaborador}</div>
        </div>
        <div className="shrink-0 text-right font-semibold">{formatCurrency(p.valor)}</div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        {p.centro_custo && <Badge variant="outline" className="font-normal">{p.centro_custo}</Badge>}
        <Badge variant="secondary" className="font-normal">{p.tipo_despesa}</Badge>
        {p.cia_aerea && <Badge variant="outline" className="font-normal">{p.cia_aerea}</Badge>}
      </div>
      {(p.origem || p.destino) && (
        <div className="mt-2 text-xs text-muted-foreground">
          {p.origem ?? '-'} → {p.destino ?? '-'}
        </div>
      )}
      {(onEdit || onDelete) && (
        <div className="mt-2 flex justify-end gap-1 border-t pt-2">
          {onEdit && (
            <Button size="sm" variant="ghost" className="h-7" onClick={() => onEdit(p)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive" onClick={() => onDelete(p.id)}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
