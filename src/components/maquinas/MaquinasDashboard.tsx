import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  KpiGrid, KpiCard,
  BarChartCard, PieChartCard, RankingChartCard,
  FilterBar, MultiSelectFilter,
  DataTableBI, type Column,
  DrillDownTable,
  formatCurrency,
} from '@/components/bi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Pencil, Trash2, Wrench, DollarSign, Cog, Hash,
  X, Layers, Plus, Search, ArrowUpDown, Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { VisualGate } from '@/components/VisualGate';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useMaquinasLayout } from '@/hooks/useMaquinasLayout';
import { PassagensLayoutGrid } from '@/components/passagens/PassagensLayoutGrid';
import { AddChartDialog, type NewChartValue } from '@/components/passagens/AddChartDialog';
import { ConfigureChartDialog, type ConfigureChartValue } from '@/components/passagens/ConfigureChartDialog';
import { PageDataProvider } from '@/lib/bi/PageDataContext';
import { getComponent } from '@/lib/bi/componentRegistry';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ManutencaoMaquina {
  id: string;
  data: string;
  mes: string | null;
  fornecedor: string | null;
  descricao: string | null;
  quantidade: number | null;
  maquina: string;
  tipo_maquina: string | null;
  ordem_compra: string | null;
  nota_fiscal: string | null;
  valor: number;
  centro_custo: string | null;
  observacoes: string | null;
}

export const TIPO_MAQUINA_OPTIONS = [
  'PONTE ROLANTE', 'CORTE / LASER', 'SOLDA', 'COMPRESSOR', 'EMPILHADEIRA',
  'PINTURA', 'SERRA', 'CONFORMAÇÃO', 'USINAGEM', 'OUTROS',
] as const;

interface Props {
  data: ManutencaoMaquina[];
  loading?: boolean;
  onEdit?: (r: ManutencaoMaquina) => void;
  onDelete?: (id: string) => void;
  shareToken?: string | null;
  readOnly?: boolean;
}

const MESES_ORDER = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const ALL_DRILL_LEVELS: { key: keyof ManutencaoMaquina; label: string }[] = [
  { key: 'tipo_maquina', label: 'Tipo de Máquina' },
  { key: 'maquina', label: 'Máquina' },
  { key: 'centro_custo', label: 'Centro de Custo' },
  { key: 'fornecedor', label: 'Fornecedor' },
  { key: 'descricao', label: 'Descrição' },
];

const CONFIGURABLE_CANONICAL = [
  'chart-evolucao-mensal', 'chart-tipo-maquina', 'chart-top-maquinas',
  'chart-top-fornecedores', 'chart-top-cc', 'chart-top-descricoes',
];

function toggleItem(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function MaquinasDashboard({ data, loading, onEdit, onDelete, shareToken, readOnly }: Props) {
  const { widgets, canEdit, saveLayout, resetLayout, deleteWidget } = useMaquinasLayout({ shareToken: shareToken ?? null });
  const canEditLayout = !readOnly && canEdit && !shareToken;

  const [editingLayout, setEditingLayout] = useState(false);
  const [pendingLayout, setPendingLayout] = useState<{ type: string; layout: { x: number; y: number; w: number; h: number } }[] | null>(null);
  const [pendingHidden, setPendingHidden] = useState<Set<string> | null>(null);
  const [pendingConfig, setPendingConfig] = useState<Record<string, Partial<ConfigureChartValue> | null>>({});
  const [pendingNewWidgets, setPendingNewWidgets] = useState<NewChartValue[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [savingLayout, setSavingLayout] = useState(false);
  const [configureType, setConfigureType] = useState<string | null>(null);
  const [addChartOpen, setAddChartOpen] = useState(false);

  const effectiveWidgets = useMemo(() => {
    const base = widgets.map((w) => {
      const hidden = pendingHidden ? pendingHidden.has(w.type) : Boolean(w.hidden);
      const cfg = pendingConfig?.[w.type];
      if (cfg === null || cfg === undefined) return { ...w, hidden };
      return { ...w, hidden, componentId: cfg.componentId ?? w.componentId, mapping: cfg.mapping ?? w.mapping, options: cfg.options ?? w.options, customTitle: cfg.customTitle ?? w.customTitle };
    });
    const filtered = base.filter((w) => !pendingDeletes?.has(w.type));
    const maxPos = filtered.reduce((m, w) => Math.max(m, w.position), 0);
    const news = (pendingNewWidgets ?? []).map((nw, i) => ({
      id: nw.type, type: nw.type, title: nw.title,
      position: maxPos + 1 + i,
      layout: { x: 0, y: 999 + i * 8, w: 6, h: 8 },
      hidden: false,
      componentId: nw.componentId, mapping: nw.mapping, options: nw.options, customTitle: nw.title,
    }));
    return [...filtered, ...news];
  }, [widgets, pendingHidden, pendingConfig, pendingNewWidgets, pendingDeletes]);

  const hiddenList = useMemo(() => effectiveWidgets.filter((w) => w.hidden), [effectiveWidgets]);

  // Filtros
  const [tipoMaquina, setTipoMaquina] = useState<string[]>([]);
  const [maquinaFilter, setMaquinaFilter] = useState<string[]>([]);
  const [centroCusto, setCentroCusto] = useState<string[]>([]);
  const [fornecedorFilter, setFornecedorFilter] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState<'data_desc' | 'data_asc' | 'maq_az' | 'maq_za' | 'valor_desc' | 'valor_asc'>('data_desc');

  // Cross-filter
  const [selMes, setSelMes] = useState<string[]>([]);
  const [selTipo, setSelTipo] = useState<string[]>([]);
  const [selMaquina, setSelMaquina] = useState<string[]>([]);
  const [selFornecedor, setSelFornecedor] = useState<string[]>([]);
  const [selCC, setSelCC] = useState<string[]>([]);
  const [selDesc, setSelDesc] = useState<string[]>([]);

  const [drillLevels, setDrillLevels] = useState<string[]>(['tipo_maquina', 'maquina', 'fornecedor']);
  const toggleDrillLevel = (key: string) => {
    setDrillLevels((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const optsTipo = useMemo(() => uniqueOpts(data.map((r) => r.tipo_maquina)), [data]);
  const optsMaquina = useMemo(() => uniqueOpts(data.map((r) => r.maquina)), [data]);
  const optsCC = useMemo(() => uniqueOpts(data.map((r) => r.centro_custo)), [data]);
  const optsForn = useMemo(() => uniqueOpts(data.map((r) => r.fornecedor)), [data]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return data.filter((r) => {
      if (tipoMaquina.length && !tipoMaquina.includes(r.tipo_maquina ?? '')) return false;
      if (maquinaFilter.length && !maquinaFilter.includes(r.maquina)) return false;
      if (centroCusto.length && !centroCusto.includes(r.centro_custo ?? '')) return false;
      if (fornecedorFilter.length && !fornecedorFilter.includes(r.fornecedor ?? '')) return false;
      if (q) {
        const hay = [r.maquina, r.fornecedor, r.descricao, r.centro_custo, r.tipo_maquina, r.ordem_compra, r.nota_fiscal]
          .map((v) => (v ?? '').toLowerCase()).join(' | ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, tipoMaquina, maquinaFilter, centroCusto, fornecedorFilter, busca]);

  const crossFiltered = useMemo(() => filtered.filter((r) => {
    if (selMes.length && !selMes.includes(r.mes ?? '?')) return false;
    if (selTipo.length && !selTipo.includes(r.tipo_maquina ?? 'NÃO INFORMADO')) return false;
    if (selMaquina.length && !selMaquina.includes(r.maquina ?? '—')) return false;
    if (selFornecedor.length && !selFornecedor.includes(r.fornecedor ?? '—')) return false;
    if (selCC.length && !selCC.includes(r.centro_custo ?? '—')) return false;
    if (selDesc.length && !selDesc.includes(r.descricao ?? '—')) return false;
    return true;
  }), [filtered, selMes, selTipo, selMaquina, selFornecedor, selCC, selDesc]);

  const totalAtivos = selMes.length + selTipo.length + selMaquina.length + selFornecedor.length + selCC.length + selDesc.length;

  const limparTudo = () => {
    setSelMes([]); setSelTipo([]); setSelMaquina([]); setSelFornecedor([]); setSelCC([]); setSelDesc([]);
    setTipoMaquina([]); setMaquinaFilter([]); setCentroCusto([]); setFornecedorFilter([]); setBusca('');
  };

  const kpis = useMemo(() => {
    const total = crossFiltered.reduce((s, r) => s + (r.valor || 0), 0);
    const maquinas = new Set(crossFiltered.map((r) => r.maquina)).size;
    const ticket = crossFiltered.length > 0 ? total / crossFiltered.length : 0;
    return { total, qtd: crossFiltered.length, ticket, maquinas };
  }, [crossFiltered]);

  const porMes = useMemo(() => {
    const m = new Map<string, number>();
    crossFiltered.forEach((r) => m.set(r.mes ?? '?', (m.get(r.mes ?? '?') ?? 0) + (r.valor || 0)));
    return Array.from(m.entries())
      .sort((a, b) => MESES_ORDER.indexOf(a[0]) - MESES_ORDER.indexOf(b[0]))
      .map(([label, valor]) => ({ label, valor }));
  }, [crossFiltered]);

  const porTipo = useMemo(() => {
    const m = new Map<string, number>();
    crossFiltered.forEach((r) => {
      const k = r.tipo_maquina || 'NÃO INFORMADO';
      m.set(k, (m.get(k) ?? 0) + (r.valor || 0));
    });
    return Array.from(m.entries()).map(([label, valor]) => ({ label, valor }));
  }, [crossFiltered]);

  const topMaquinas = useMemo(() => topBy(crossFiltered, (r) => r.maquina || '—'), [crossFiltered]);
  const topFornecedores = useMemo(() => topBy(crossFiltered, (r) => r.fornecedor || '—'), [crossFiltered]);
  const topCC = useMemo(() => topBy(crossFiltered, (r) => r.centro_custo || '—'), [crossFiltered]);
  const topDescricoes = useMemo(() => topBy(crossFiltered, (r) => r.descricao || '—'), [crossFiltered]);

  const kpiPayload = useMemo(() => ({
    total_gasto: kpis.total, total_manutencoes: kpis.qtd,
    ticket_medio: kpis.ticket, maquinas_atendidas: kpis.maquinas,
  }), [kpis]);

  const seriesPayload = useMemo(() => ({
    evolucao_mensal: porMes.map((p) => ({ name: p.label, value: p.valor })),
    por_tipo_maquina: porTipo.map((p) => ({ name: p.label, value: p.valor })),
    top_maquinas: topMaquinas.map((p) => ({ name: p.label, value: p.valor })),
    top_fornecedores: topFornecedores.map((p) => ({ name: p.label, value: p.valor })),
    top_centros_custo: topCC.map((p) => ({ name: p.label, value: p.valor })),
    top_descricoes: topDescricoes.map((p) => ({ name: p.label, value: p.valor })),
  }), [porMes, porTipo, topMaquinas, topFornecedores, topCC, topDescricoes]);

  const drillLevelsConfig = useMemo(
    () => drillLevels.map((k) => ALL_DRILL_LEVELS.find((l) => l.key === k))
      .filter(Boolean).map((l) => ({ key: l!.key as string, label: l!.label })),
    [drillLevels],
  );

  const cols: Column<ManutencaoMaquina>[] = [
    { key: 'data', header: 'Data', sortable: true, render: (_v, r) => formatDate(r.data) },
    { key: 'maquina', header: 'Máquina', sortable: true, render: (_v, r) => (
      <div className="flex flex-col">
        <span className="font-medium">{r.maquina}</span>
        {r.tipo_maquina && <span className="text-[11px] text-muted-foreground">{r.tipo_maquina}</span>}
      </div>
    ) },
    { key: 'fornecedor', header: 'Fornecedor', sortable: true },
    { key: 'descricao', header: 'Descrição', render: (_v, r) => (
      <span className="block max-w-[300px] truncate" title={r.descricao ?? ''}>{r.descricao}</span>
    ) },
    { key: 'quantidade', header: 'Qtd', align: 'right', sortable: true,
      render: (_v, r) => r.quantidade != null ? Number(r.quantidade).toLocaleString('pt-BR') : '—' },
    { key: 'valor', header: 'Valor', align: 'right', sortable: true, render: (_v, r) => formatCurrency(r.valor) },
    { key: 'ordem_compra', header: 'OC' },
    { key: 'nota_fiscal', header: 'NF' },
    { key: 'centro_custo', header: 'C.Custo' },
    ...((onEdit || onDelete) ? [{
      key: '__acoes' as any, header: 'Ações', align: 'right' as const,
      render: (_v: any, r: ManutencaoMaquina) => (
        <div className="flex justify-end gap-1">
          {onEdit && <Button size="icon" variant="ghost" onClick={() => onEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>}
          {onDelete && <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
        </div>
      ),
    }] : []),
  ];

  const configureTarget = useMemo(() => {
    if (!configureType) return null;
    const pending = pendingConfig[configureType];
    const widget = effectiveWidgets.find((w) => w.type === configureType);
    return {
      widget,
      initial: pending !== undefined
        ? (pending ?? {}) as Partial<ConfigureChartValue>
        : ({ componentId: widget?.componentId, mapping: widget?.mapping, customTitle: widget?.customTitle, options: widget?.options } as Partial<ConfigureChartValue>),
    };
  }, [configureType, pendingConfig, effectiveWidgets]);

  const displayRows = useMemo(() => {
    const arr = [...crossFiltered];
    const cmpDate = (a: ManutencaoMaquina, b: ManutencaoMaquina) => (a.data || '').localeCompare(b.data || '');
    const cmpStr = (av?: string | null, bv?: string | null) => (av ?? '').localeCompare(bv ?? '', 'pt-BR');
    switch (ordenacao) {
      case 'data_asc': arr.sort(cmpDate); break;
      case 'data_desc': arr.sort((a, b) => cmpDate(b, a)); break;
      case 'maq_az': arr.sort((a, b) => cmpStr(a.maquina, b.maquina)); break;
      case 'maq_za': arr.sort((a, b) => cmpStr(b.maquina, a.maquina)); break;
      case 'valor_desc': arr.sort((a, b) => (b.valor || 0) - (a.valor || 0)); break;
      case 'valor_asc': arr.sort((a, b) => (a.valor || 0) - (b.valor || 0)); break;
    }
    return arr;
  }, [crossFiltered, ordenacao]);

  const exportRowsToObjects = (rows: ManutencaoMaquina[]) =>
    rows.map((r) => ({
      Data: r.data ? formatDate(r.data) : '',
      Máquina: r.maquina,
      'Tipo de Máquina': r.tipo_maquina ?? '',
      Fornecedor: r.fornecedor ?? '',
      Descrição: r.descricao ?? '',
      Quantidade: r.quantidade ?? '',
      Valor: r.valor ?? 0,
      'Ordem de Compra': r.ordem_compra ?? '',
      'Nota Fiscal': r.nota_fiscal ?? '',
      'Centro de Custo': r.centro_custo ?? '',
    }));

  const exportXLSX = () => {
    const data = exportRowsToObjects(displayRows);
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');
    XLSX.writeFile(wb, `manutencao-maquinas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const blocks: Record<string, React.ReactNode> = {
    'kpis-row': (
      <KpiGrid cols={4}>
        <KpiCard title="Total gasto" value={kpis.total} format="currency" variant="info" icon={<DollarSign className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Manutenções" value={kpis.qtd} format="number" variant="default" icon={<Wrench className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Ticket médio" value={kpis.ticket} format="currency" variant="default" icon={<Hash className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Máquinas atendidas" value={kpis.maquinas} format="number" variant="success" icon={<Cog className="h-4 w-4" />} loading={loading} />
      </KpiGrid>
    ),
    'chart-evolucao-mensal': (
      <VisualGate visualKey="maquinas.chart-evolucao-mensal">
        <BarChartCard title="Evolução mensal (R$)" subtitle="Clique numa barra para filtrar pelo mês"
          data={porMes} loading={loading}
          onItemClick={(d) => setSelMes((prev) => toggleItem(prev, d.label))} />
      </VisualGate>
    ),
    'chart-tipo-maquina': (
      <VisualGate visualKey="maquinas.chart-tipo-maquina">
        <PieChartCard title="Distribuição por Tipo de Máquina" subtitle="Clique numa fatia para filtrar"
          data={porTipo} loading={loading} donut
          onItemClick={(d) => setSelTipo((prev) => toggleItem(prev, d.label))} />
      </VisualGate>
    ),
    'chart-top-maquinas': (
      <VisualGate visualKey="maquinas.chart-top-maquinas">
        <RankingChartCard title="Top Máquinas por Valor" subtitle="Clique para filtrar pela máquina"
          data={topMaquinas} topN={10} loading={loading}
          onItemClick={(d) => setSelMaquina((prev) => toggleItem(prev, d.label))} />
      </VisualGate>
    ),
    'chart-top-fornecedores': (
      <VisualGate visualKey="maquinas.chart-top-fornecedores">
        <RankingChartCard title="Top Fornecedores" subtitle="Clique para filtrar pelo fornecedor"
          data={topFornecedores} topN={10} loading={loading}
          onItemClick={(d) => setSelFornecedor((prev) => toggleItem(prev, d.label))} />
      </VisualGate>
    ),
    'chart-top-cc': (
      <VisualGate visualKey="maquinas.chart-top-cc">
        <RankingChartCard title="Top Centros de Custo" subtitle="Clique para filtrar pelo C.Custo"
          data={topCC} topN={10} loading={loading}
          onItemClick={(d) => setSelCC((prev) => toggleItem(prev, d.label))} />
      </VisualGate>
    ),
    'chart-top-descricoes': (
      <VisualGate visualKey="maquinas.chart-top-descricoes">
        <RankingChartCard title="Top Descrições / Itens" subtitle="Clique para filtrar pela descrição"
          data={topDescricoes} topN={10} loading={loading}
          onItemClick={(d) => setSelDesc((prev) => toggleItem(prev, d.label))} />
      </VisualGate>
    ),
    'tabela-registros': (
      <Card>
        <CardHeader className="flex flex-col gap-3 p-3 sm:p-6 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm min-w-0 truncate">Registros ({displayRows.length})</CardTitle>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 md:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="h-8 w-full pl-7 text-xs sm:w-[200px]" />
            </div>
            <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as typeof ordenacao)}>
              <SelectTrigger className="h-8 w-full text-xs sm:w-[180px]"><ArrowUpDown className="mr-1 h-3 w-3" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="data_desc" className="text-xs">Data (mais recente)</SelectItem>
                <SelectItem value="data_asc" className="text-xs">Data (mais antiga)</SelectItem>
                <SelectItem value="maq_az" className="text-xs">Máquina (A→Z)</SelectItem>
                <SelectItem value="maq_za" className="text-xs">Máquina (Z→A)</SelectItem>
                <SelectItem value="valor_desc" className="text-xs">Valor (maior)</SelectItem>
                <SelectItem value="valor_asc" className="text-xs">Valor (menor)</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 flex-1 text-xs sm:flex-none" onClick={exportXLSX} disabled={displayRows.length === 0}>
              <Download className="mr-1 h-3.5 w-3.5" /><span className="sm:hidden">Excel</span><span className="hidden sm:inline">Exportar Excel</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <DataTableBI columns={cols} data={displayRows} loading={loading} emptyMessage="Nenhum registro encontrado" />
        </CardContent>
      </Card>
    ),
    ...Object.fromEntries(
      effectiveWidgets.filter((w) => Boolean(w.componentId)).map((w) => {
        const def = getComponent(w.componentId!);
        if (!def) return [w.type, null];
        const node = def.render({
          title: w.customTitle || w.title,
          mapping: w.mapping ?? {},
          ctx: {
            kpis: kpiPayload, series: seriesPayload, rows: crossFiltered,
            onItemClick: (seriesKey, datum) => {
              const name = String(datum?.name ?? datum?.label ?? '');
              if (!name) return;
              switch (seriesKey) {
                case 'evolucao_mensal':    setSelMes((p) => toggleItem(p, name)); break;
                case 'por_tipo_maquina':   setSelTipo((p) => toggleItem(p, name)); break;
                case 'top_maquinas':       setSelMaquina((p) => toggleItem(p, name)); break;
                case 'top_fornecedores':   setSelFornecedor((p) => toggleItem(p, name)); break;
                case 'top_centros_custo':  setSelCC((p) => toggleItem(p, name)); break;
                case 'top_descricoes':     setSelDesc((p) => toggleItem(p, name)); break;
                default: break;
              }
            },
          } as any,
          options: w.options ?? {},
        });
        return [w.type, node];
      }),
    ),
  };

  return (
    <div className="space-y-4">
      <FilterBar>
        <MultiSelectFilter label="Tipo de Máquina" values={tipoMaquina} onChange={setTipoMaquina} options={optsTipo} placeholder="Todos" />
        <MultiSelectFilter label="Máquina" values={maquinaFilter} onChange={setMaquinaFilter} options={optsMaquina} placeholder="Todas" />
        <MultiSelectFilter label="Fornecedor" values={fornecedorFilter} onChange={setFornecedorFilter} options={optsForn} placeholder="Todos" />
        <MultiSelectFilter label="Centro de Custo" values={centroCusto} onChange={setCentroCusto} options={optsCC} placeholder="Todos" />
        <div className="flex items-end">
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={limparTudo}
            disabled={tipoMaquina.length + maquinaFilter.length + fornecedorFilter.length + centroCusto.length + busca.length + totalAtivos === 0}>
            <X className="h-3 w-3" /> Limpar filtros
          </Button>
        </div>
      </FilterBar>

      {totalAtivos > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
          <span className="font-semibold text-muted-foreground">Filtros ativos:</span>
          {renderChips('Mês', selMes, (v) => setSelMes((p) => p.filter((x) => x !== v)))}
          {renderChips('Tipo', selTipo, (v) => setSelTipo((p) => p.filter((x) => x !== v)))}
          {renderChips('Máquina', selMaquina, (v) => setSelMaquina((p) => p.filter((x) => x !== v)))}
          {renderChips('Fornecedor', selFornecedor, (v) => setSelFornecedor((p) => p.filter((x) => x !== v)))}
          {renderChips('C.Custo', selCC, (v) => setSelCC((p) => p.filter((x) => x !== v)))}
          {renderChips('Descrição', selDesc, (v) => setSelDesc((p) => p.filter((x) => x !== v)))}
          <Button size="sm" variant="ghost" className="ml-auto h-6 gap-1 px-2 text-xs" onClick={limparTudo}><X className="h-3 w-3" /> Limpar tudo</Button>
        </div>
      )}

      {canEditLayout && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          {!editingLayout ? (
            <Button size="sm" variant="outline" onClick={() => {
              setPendingHidden(new Set(widgets.filter((w) => w.hidden).map((w) => w.type)));
              setEditingLayout(true);
            }}><Layers className="mr-1.5 h-4 w-4" /> Editar layout</Button>
          ) : (
            <>
              <span className="text-xs font-medium text-primary">Modo edição: arraste, redimensione, configure ou oculte blocos</span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setAddChartOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Novo gráfico</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={hiddenList.length === 0}><Plus className="mr-1.5 h-4 w-4" /> Restaurar bloco{hiddenList.length > 0 ? ` (${hiddenList.length})` : ''}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {hiddenList.map((w) => (
                      <DropdownMenuItem key={w.type} onClick={() => {
                        setPendingHidden((prev) => { const next = new Set(prev ?? []); next.delete(w.type); return next; });
                      }}>{w.title || w.type}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditingLayout(false);
                  setPendingLayout(null); setPendingHidden(null);
                  setPendingConfig({}); setPendingNewWidgets([]); setPendingDeletes(new Set());
                }} disabled={savingLayout}>Cancelar</Button>
                <Button size="sm" variant="outline" disabled={savingLayout} onClick={async () => {
                  if (!confirm('Restaurar o layout padrão?')) return;
                  setSavingLayout(true);
                  try {
                    await resetLayout();
                    setEditingLayout(false);
                    setPendingLayout(null); setPendingHidden(null);
                    setPendingConfig({}); setPendingNewWidgets([]); setPendingDeletes(new Set());
                    toast.success('Layout restaurado.');
                  } catch (e: any) { toast.error(e?.message ?? 'Falha ao restaurar layout'); }
                  finally { setSavingLayout(false); }
                }}>Restaurar padrão</Button>
                <Button size="sm" disabled={savingLayout} onClick={async () => {
                  setSavingLayout(true);
                  try {
                    const overrides = new Map((pendingLayout ?? []).map((b) => [b.type, b.layout] as const));
                    const baseLayout = effectiveWidgets.map((w) => ({ type: w.type, layout: overrides.get(w.type) ?? w.layout }));
                    const hiddenSet = pendingHidden ?? new Set<string>();
                    const layoutByType = new Map(baseLayout.map((b) => [b.type, b.layout]));
                    const allTypes = new Set<string>([...layoutByType.keys(), ...effectiveWidgets.map((w) => w.type)]);
                    pendingDeletes.forEach((t) => allTypes.delete(t));
                    const newWidgetsByType = new Map(pendingNewWidgets.map((nw) => [nw.type, nw]));
                    const orderedTypes = Array.from(allTypes).sort((a, b) => {
                      const la = layoutByType.get(a) ?? effectiveWidgets.find((w) => w.type === a)?.layout ?? { x: 0, y: 0, w: 12, h: 4 };
                      const lb = layoutByType.get(b) ?? effectiveWidgets.find((w) => w.type === b)?.layout ?? { x: 0, y: 0, w: 12, h: 4 };
                      if (la.y !== lb.y) return la.y - lb.y;
                      return la.x - lb.x;
                    });
                    const positionByType = new Map(orderedTypes.map((t, i) => [t, i] as const));
                    const payload = orderedTypes.map((type) => {
                      const layout = layoutByType.get(type) ?? effectiveWidgets.find((w) => w.type === type)?.layout ?? { x: 0, y: 0, w: 12, h: 4 };
                      const cfg = pendingConfig[type];
                      const nw = newWidgetsByType.get(type);
                      const ew = effectiveWidgets.find((w) => w.type === type);
                      return {
                        type, layout, hidden: hiddenSet.has(type),
                        componentId: cfg === null ? null : (cfg?.componentId ?? nw?.componentId),
                        mapping: cfg === null ? null : (cfg?.mapping ?? nw?.mapping ?? undefined),
                        options: cfg === null ? null : (cfg?.options ?? nw?.options ?? undefined),
                        customTitle: cfg === null ? null : (cfg?.customTitle ?? nw?.title ?? undefined),
                        title: nw?.title ?? ew?.title,
                        position: positionByType.get(type) ?? ew?.position ?? 99,
                      };
                    });
                    await saveLayout(payload);
                    for (const t of pendingDeletes) {
                      const w = widgets.find((x) => x.type === t);
                      if (w?.id) await deleteWidget(w.id);
                    }
                    setEditingLayout(false);
                    setPendingLayout(null); setPendingHidden(null);
                    setPendingConfig({}); setPendingNewWidgets([]); setPendingDeletes(new Set());
                    toast.success('Layout salvo.');
                  } catch (e: any) { toast.error(e?.message ?? 'Falha ao salvar layout'); }
                  finally { setSavingLayout(false); }
                }}>{savingLayout ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </>
          )}
        </div>
      )}

      <PageDataProvider pageKey="manutencao-maquinas" kpis={kpiPayload} series={seriesPayload} rows={crossFiltered}>
        <PassagensLayoutGrid
          widgets={effectiveWidgets as any}
          editing={editingLayout}
          onLayoutChange={setPendingLayout}
          onHide={editingLayout ? (type) => {
            setPendingHidden((prev) => { const next = new Set(prev ?? []); next.add(type); return next; });
          } : undefined}
          configurableTypes={CONFIGURABLE_CANONICAL}
          onConfigure={editingLayout ? (type) => setConfigureType(type) : undefined}
          onDelete={editingLayout ? (type) => {
            if (type.startsWith('custom-')) {
              const isNew = pendingNewWidgets.some((nw) => nw.type === type);
              if (isNew) setPendingNewWidgets((prev) => prev.filter((nw) => nw.type !== type));
              else setPendingDeletes((prev) => { const next = new Set(prev); next.add(type); return next; });
            }
          } : undefined}
          blocks={blocks}
        />

        {configureTarget && (
          <ConfigureChartDialog
            open={Boolean(configureType)}
            onOpenChange={(v) => { if (!v) setConfigureType(null); }}
            initial={configureTarget.initial}
            blockType={configureType ?? ''}
            fallbackTitle={configureTarget.widget?.title}
            canResetToDefault={configureType ? CONFIGURABLE_CANONICAL.includes(configureType) : false}
            kpis={kpiPayload} series={seriesPayload} rows={crossFiltered}
            pageKey="manutencao-maquinas"
            onApply={(next) => {
              if (!configureType) return;
              const t = configureType;
              setPendingConfig((prev) => ({ ...prev, [t]: next }));
              setPendingNewWidgets((prev) => prev.map((nw) =>
                nw.type === t ? { ...nw, componentId: next.componentId, mapping: next.mapping, options: next.options, title: next.customTitle || nw.title } : nw,
              ));
            }}
            onResetToDefault={() => { if (!configureType) return; const t = configureType; setPendingConfig((prev) => ({ ...prev, [t]: null })); }}
          />
        )}
        <AddChartDialog
          open={addChartOpen} onOpenChange={setAddChartOpen}
          kpis={kpiPayload} series={seriesPayload} rows={crossFiltered}
          pageKey="manutencao-maquinas"
          onAdd={(nw) => setPendingNewWidgets((prev) => [...prev, nw])}
        />
      </PageDataProvider>

      <VisualGate visualKey="maquinas.drill-hierarquico">
        <Card className="p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Layers className="h-4 w-4 text-muted-foreground" /> Drill-down hierárquico
            </div>
            <span className="text-xs text-muted-foreground">— clique nos níveis:</span>
            <div className="flex flex-wrap gap-1">
              {ALL_DRILL_LEVELS.map((lv) => {
                const idx = drillLevels.indexOf(lv.key as string);
                const active = idx >= 0;
                return (
                  <Badge key={lv.key as string} variant={active ? 'default' : 'outline'}
                    className={cn('cursor-pointer select-none text-[11px]', active && 'gap-1')}
                    onClick={() => toggleDrillLevel(lv.key as string)}>
                    {active && <span className="font-bold">{idx + 1}.</span>}{lv.label}
                  </Badge>
                );
              })}
            </div>
          </div>
          {drillLevelsConfig.length === 0 ? (
            <p className="text-xs text-muted-foreground">Selecione pelo menos um nível.</p>
          ) : (
            <DrillDownTable data={crossFiltered} levels={drillLevelsConfig} valueKey="valor" valueFormatter={formatCurrency} />
          )}
        </Card>
      </VisualGate>
    </div>
  );
}

function renderChips(label: string, values: string[], onRemove: (v: string) => void) {
  if (!values.length) return null;
  return values.map((v) => (
    <Badge key={`${label}-${v}`} variant="secondary" className="gap-1 text-[11px]">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{v}</span>
      <button onClick={() => onRemove(v)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
    </Badge>
  ));
}

function uniqueOpts(values: (string | null | undefined)[]) {
  const set = new Set<string>();
  values.forEach((v) => { if (v && v.trim()) set.add(v); });
  return Array.from(set).sort().map((v) => ({ value: v, label: v }));
}

function topBy(rows: ManutencaoMaquina[], keyFn: (r: ManutencaoMaquina) => string) {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const k = keyFn(r);
    m.set(k, (m.get(k) ?? 0) + (r.valor || 0));
  });
  return Array.from(m.entries()).map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor);
}
