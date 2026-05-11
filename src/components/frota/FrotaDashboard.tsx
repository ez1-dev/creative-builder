import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  KpiGrid, KpiCard,
  BarChartCard, PieChartCard, RankingChartCard,
  FilterBar, MultiSelectFilter, SearchFilter,
  DataTableBI, type Column,
  DrillDownTable,
  formatCurrency,
} from '@/components/bi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Pencil, Trash2, Wrench, DollarSign, Truck, Hash,
  X, Layers, Plus,
} from 'lucide-react';
import { VisualGate } from '@/components/VisualGate';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFrotaLayout } from '@/hooks/useFrotaLayout';
import { PassagensLayoutGrid } from '@/components/passagens/PassagensLayoutGrid';
import { AddChartDialog, type NewChartValue } from '@/components/passagens/AddChartDialog';
import { ConfigureChartDialog, type ConfigureChartValue } from '@/components/passagens/ConfigureChartDialog';
import { PageDataProvider } from '@/lib/bi/PageDataContext';
import { getComponent } from '@/lib/bi/componentRegistry';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ManutencaoFrota {
  id: string;
  data: string;
  mes: string | null;
  placa: string;
  veiculo_descricao: string | null;
  fornecedor: string | null;
  descricao: string | null;
  quilometragem: number | null;
  valor: number;
  motorista: string | null;
  centro_custo: string | null;
  segmento: string | null;
  observacoes: string | null;
}

interface Props {
  data: ManutencaoFrota[];
  loading?: boolean;
  onEdit?: (r: ManutencaoFrota) => void;
  onDelete?: (id: string) => void;
  /** Quando definido, carrega o layout via RPC pública. */
  shareToken?: string | null;
  /** Página é apenas leitura (link compartilhado). */
  readOnly?: boolean;
}

const MESES_ORDER = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const ALL_DRILL_LEVELS: { key: keyof ManutencaoFrota; label: string }[] = [
  { key: 'segmento', label: 'Segmento' },
  { key: 'centro_custo', label: 'Centro de Custo' },
  { key: 'placa', label: 'Placa' },
  { key: 'fornecedor', label: 'Fornecedor' },
  { key: 'motorista', label: 'Motorista' },
  { key: 'descricao', label: 'Descrição' },
];

const CONFIGURABLE_CANONICAL = [
  'chart-evolucao-mensal',
  'chart-segmento',
  'chart-top-veiculos',
  'chart-top-fornecedores',
  'chart-top-cc',
  'chart-top-motoristas',
];

function toggleItem(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function FrotaDashboard({ data, loading, onEdit, onDelete, shareToken, readOnly }: Props) {
  // ===== Layout customizável =====
  const { widgets, canEdit, saveLayout, resetLayout, deleteWidget } = useFrotaLayout({
    shareToken: shareToken ?? null,
  });
  const canEditLayout = !readOnly && canEdit && !shareToken;

  const [editingLayout, setEditingLayout] = useState(false);
  const [pendingLayout, setPendingLayout] = useState<
    { type: string; layout: { x: number; y: number; w: number; h: number } }[] | null
  >(null);
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
      return {
        ...w, hidden,
        componentId: cfg.componentId ?? w.componentId,
        mapping: cfg.mapping ?? w.mapping,
        options: cfg.options ?? w.options,
        customTitle: cfg.customTitle ?? w.customTitle,
      };
    });
    const filtered = base.filter((w) => !pendingDeletes?.has(w.type));
    const maxPos = filtered.reduce((m, w) => Math.max(m, w.position), 0);
    const news = (pendingNewWidgets ?? []).map((nw, i) => ({
      id: nw.type, type: nw.type, title: nw.title,
      position: maxPos + 1 + i,
      layout: { x: 0, y: 999 + i * 8, w: 6, h: 8 },
      hidden: false,
      componentId: nw.componentId, mapping: nw.mapping, options: nw.options,
      customTitle: nw.title,
    }));
    return [...filtered, ...news];
  }, [widgets, pendingHidden, pendingConfig, pendingNewWidgets, pendingDeletes]);

  const hiddenList = useMemo(() => effectiveWidgets.filter((w) => w.hidden), [effectiveWidgets]);

  // ===== Filtros da FilterBar =====
  const [segmento, setSegmento] = useState<string[]>([]);
  const [centroCusto, setCentroCusto] = useState<string[]>([]);
  const [placa, setPlaca] = useState<string[]>([]);
  const [motorista, setMotorista] = useState<string[]>([]);
  const [busca, setBusca] = useState('');

  // ===== Cross-filter =====
  const [selMes, setSelMes] = useState<string[]>([]);
  const [selSegmento, setSelSegmento] = useState<string[]>([]);
  const [selPlaca, setSelPlaca] = useState<string[]>([]);
  const [selFornecedor, setSelFornecedor] = useState<string[]>([]);
  const [selCC, setSelCC] = useState<string[]>([]);
  const [selMotorista, setSelMotorista] = useState<string[]>([]);

  // ===== Drill-down =====
  const [drillLevels, setDrillLevels] = useState<string[]>([
    'segmento', 'centro_custo', 'placa', 'fornecedor',
  ]);
  const toggleDrillLevel = (key: string) => {
    setDrillLevels((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const optsSeg = useMemo(() => uniqueOpts(data.map((r) => r.segmento)), [data]);
  const optsCC = useMemo(() => uniqueOpts(data.map((r) => r.centro_custo)), [data]);
  const optsPlaca = useMemo(() => uniqueOpts(data.map((r) => r.placa)), [data]);
  const optsMot = useMemo(() => uniqueOpts(data.map((r) => r.motorista)), [data]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return data.filter((r) => {
      if (segmento.length && !segmento.includes(r.segmento ?? '')) return false;
      if (centroCusto.length && !centroCusto.includes(r.centro_custo ?? '')) return false;
      if (placa.length && !placa.includes(r.placa)) return false;
      if (motorista.length && !motorista.includes(r.motorista ?? '')) return false;
      if (q) {
        const hay = [r.placa, r.veiculo_descricao, r.fornecedor, r.descricao, r.motorista, r.centro_custo]
          .map((v) => (v ?? '').toLowerCase()).join(' | ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, segmento, centroCusto, placa, motorista, busca]);

  const crossFiltered = useMemo(() => filtered.filter((r) => {
    if (selMes.length && !selMes.includes(r.mes ?? '?')) return false;
    if (selSegmento.length && !selSegmento.includes(r.segmento ?? 'NÃO INFORMADO')) return false;
    if (selPlaca.length && !selPlaca.includes(r.placa ?? '—')) return false;
    if (selFornecedor.length && !selFornecedor.includes(r.fornecedor ?? '—')) return false;
    if (selCC.length && !selCC.includes(r.centro_custo ?? '—')) return false;
    if (selMotorista.length && !selMotorista.includes(r.motorista ?? '—')) return false;
    return true;
  }), [filtered, selMes, selSegmento, selPlaca, selFornecedor, selCC, selMotorista]);

  const totalAtivos =
    selMes.length + selSegmento.length + selPlaca.length +
    selFornecedor.length + selCC.length + selMotorista.length;

  const limparTudo = () => {
    setSelMes([]); setSelSegmento([]); setSelPlaca([]);
    setSelFornecedor([]); setSelCC([]); setSelMotorista([]);
    setSegmento([]); setCentroCusto([]); setPlaca([]); setMotorista([]);
    setBusca('');
  };

  const kpis = useMemo(() => {
    const total = crossFiltered.reduce((s, r) => s + (r.valor || 0), 0);
    const veiculos = new Set(crossFiltered.map((r) => r.placa)).size;
    const ticket = crossFiltered.length > 0 ? total / crossFiltered.length : 0;
    return { total, qtd: crossFiltered.length, ticket, veiculos };
  }, [crossFiltered]);

  const porMes = useMemo(() => {
    const m = new Map<string, number>();
    crossFiltered.forEach((r) => m.set(r.mes ?? '?', (m.get(r.mes ?? '?') ?? 0) + (r.valor || 0)));
    return Array.from(m.entries())
      .sort((a, b) => MESES_ORDER.indexOf(a[0]) - MESES_ORDER.indexOf(b[0]))
      .map(([label, valor]) => ({ label, valor }));
  }, [crossFiltered]);

  const porSegmento = useMemo(() => {
    const m = new Map<string, number>();
    crossFiltered.forEach((r) => {
      const k = r.segmento || 'NÃO INFORMADO';
      m.set(k, (m.get(k) ?? 0) + (r.valor || 0));
    });
    return Array.from(m.entries()).map(([label, valor]) => ({ label, valor }));
  }, [crossFiltered]);

  const topVeiculos = useMemo(() => topBy(crossFiltered, (r) => r.placa || '—'), [crossFiltered]);
  const topFornecedores = useMemo(() => topBy(crossFiltered, (r) => r.fornecedor || '—'), [crossFiltered]);
  const topCC = useMemo(() => topBy(crossFiltered, (r) => r.centro_custo || '—'), [crossFiltered]);
  const topMotoristas = useMemo(() => topBy(crossFiltered, (r) => r.motorista || '—'), [crossFiltered]);

  const kpiPayload = useMemo(() => ({
    total_gasto: kpis.total,
    total_manutencoes: kpis.qtd,
    ticket_medio: kpis.ticket,
    veiculos_atendidos: kpis.veiculos,
  }), [kpis]);

  const seriesPayload = useMemo(() => ({
    evolucao_mensal: porMes.map((p) => ({ name: p.label, value: p.valor })),
    por_segmento: porSegmento.map((p) => ({ name: p.label, value: p.valor })),
    top_veiculos: topVeiculos.map((p) => ({ name: p.label, value: p.valor })),
    top_fornecedores: topFornecedores.map((p) => ({ name: p.label, value: p.valor })),
    top_centros_custo: topCC.map((p) => ({ name: p.label, value: p.valor })),
    top_motoristas: topMotoristas.map((p) => ({ name: p.label, value: p.valor })),
  }), [porMes, porSegmento, topVeiculos, topFornecedores, topCC, topMotoristas]);

  const drillLevelsConfig = useMemo(
    () => drillLevels
      .map((k) => ALL_DRILL_LEVELS.find((l) => l.key === k))
      .filter(Boolean)
      .map((l) => ({ key: l!.key as string, label: l!.label })),
    [drillLevels],
  );

  const cols: Column<ManutencaoFrota>[] = [
    { key: 'data', header: 'Data', sortable: true, render: (_v, r) => formatDate(r.data) },
    { key: 'placa', header: 'Placa', sortable: true, render: (_v, r) => (
      <div className="flex flex-col">
        <span className="font-medium">{r.placa}</span>
        {r.veiculo_descricao && <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">{r.veiculo_descricao}</span>}
      </div>
    ) },
    { key: 'fornecedor', header: 'Fornecedor', sortable: true },
    { key: 'descricao', header: 'Descrição', render: (_v, r) => (
      <span className="block max-w-[300px] truncate" title={r.descricao ?? ''}>{r.descricao}</span>
    ) },
    { key: 'quilometragem', header: 'KM', align: 'right', sortable: true,
      render: (_v, r) => r.quilometragem != null ? r.quilometragem.toLocaleString('pt-BR') : '—' },
    { key: 'valor', header: 'Valor', align: 'right', sortable: true, render: (_v, r) => formatCurrency(r.valor) },
    { key: 'motorista', header: 'Motorista', sortable: true },
    { key: 'centro_custo', header: 'C.Custo' },
    { key: 'segmento', header: 'Segmento' },
    ...((onEdit || onDelete) ? [{
      key: '__acoes' as any, header: 'Ações', align: 'right' as const,
      render: (_v: any, r: ManutencaoFrota) => (
        <div className="flex justify-end gap-1">
          {onEdit && <Button size="icon" variant="ghost" onClick={() => onEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>}
          {onDelete && <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
        </div>
      ),
    }] : []),
  ];

  // configureTarget para o ConfigureChartDialog
  const configureTarget = useMemo(() => {
    if (!configureType) return null;
    const pending = pendingConfig[configureType];
    const widget = effectiveWidgets.find((w) => w.type === configureType);
    return {
      widget,
      initial: pending !== undefined
        ? (pending ?? {}) as Partial<ConfigureChartValue>
        : ({
            componentId: widget?.componentId,
            mapping: widget?.mapping,
            customTitle: widget?.customTitle,
            options: widget?.options,
          } as Partial<ConfigureChartValue>),
    };
  }, [configureType, pendingConfig, effectiveWidgets]);

  // ===== Blocos =====
  const blocks: Record<string, React.ReactNode> = {
    'kpis-row': (
      <KpiGrid cols={4}>
        <KpiCard title="Total gasto" value={kpis.total} format="currency"
          variant="info" icon={<DollarSign className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Manutenções" value={kpis.qtd} format="number"
          variant="default" icon={<Wrench className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Ticket médio" value={kpis.ticket} format="currency"
          variant="default" icon={<Hash className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Veículos atendidos" value={kpis.veiculos} format="number"
          variant="success" icon={<Truck className="h-4 w-4" />} loading={loading} />
      </KpiGrid>
    ),
    'chart-evolucao-mensal': (
      <VisualGate visualKey="frota.chart-evolucao-mensal">
        <BarChartCard
          title="Evolução mensal (R$)"
          subtitle="Clique numa barra para filtrar pelo mês"
          data={porMes} loading={loading}
          onItemClick={(d) => setSelMes((prev) => toggleItem(prev, d.label))}
        />
      </VisualGate>
    ),
    'chart-segmento': (
      <VisualGate visualKey="frota.chart-segmento">
        <PieChartCard
          title="Distribuição por Segmento"
          subtitle="Clique numa fatia para filtrar"
          data={porSegmento} loading={loading} donut
          onItemClick={(d) => setSelSegmento((prev) => toggleItem(prev, d.label))}
        />
      </VisualGate>
    ),
    'chart-top-veiculos': (
      <VisualGate visualKey="frota.chart-top-veiculos">
        <RankingChartCard
          title="Top Veículos por Valor"
          subtitle="Clique para filtrar pelo veículo"
          data={topVeiculos} topN={10} loading={loading}
          onItemClick={(d) => setSelPlaca((prev) => toggleItem(prev, d.label))}
        />
      </VisualGate>
    ),
    'chart-top-fornecedores': (
      <VisualGate visualKey="frota.chart-top-fornecedores">
        <RankingChartCard
          title="Top Fornecedores"
          subtitle="Clique para filtrar pelo fornecedor"
          data={topFornecedores} topN={10} loading={loading}
          onItemClick={(d) => setSelFornecedor((prev) => toggleItem(prev, d.label))}
        />
      </VisualGate>
    ),
    'chart-top-cc': (
      <VisualGate visualKey="frota.chart-top-cc">
        <RankingChartCard
          title="Top Centros de Custo"
          subtitle="Clique para filtrar pelo C.Custo"
          data={topCC} topN={10} loading={loading}
          onItemClick={(d) => setSelCC((prev) => toggleItem(prev, d.label))}
        />
      </VisualGate>
    ),
    'chart-top-motoristas': (
      <VisualGate visualKey="frota.chart-top-motoristas">
        <RankingChartCard
          title="Top Motoristas"
          subtitle="Clique para filtrar pelo motorista"
          data={topMotoristas} topN={10} loading={loading}
          onItemClick={(d) => setSelMotorista((prev) => toggleItem(prev, d.label))}
        />
      </VisualGate>
    ),
    'tabela-registros': (
      <Card className="p-3">
        <DataTableBI columns={cols} data={crossFiltered} loading={loading}
          emptyMessage="Nenhum registro de manutenção encontrado" />
      </Card>
    ),
    // Widgets customizados / overrides via registry
    ...Object.fromEntries(
      effectiveWidgets
        .filter((w) => Boolean(w.componentId))
        .map((w) => {
          const def = getComponent(w.componentId!);
          if (!def) return [w.type, null];
          const node = def.render({
            title: w.customTitle || w.title,
            mapping: w.mapping ?? {},
            ctx: {
              kpis: kpiPayload,
              series: seriesPayload,
              rows: crossFiltered,
              onItemClick: (seriesKey, datum) => {
                const name = String(datum?.name ?? datum?.label ?? '');
                if (!name) return;
                switch (seriesKey) {
                  case 'evolucao_mensal':    setSelMes((p) => toggleItem(p, name)); break;
                  case 'por_segmento':       setSelSegmento((p) => toggleItem(p, name)); break;
                  case 'top_veiculos':       setSelPlaca((p) => toggleItem(p, name)); break;
                  case 'top_fornecedores':   setSelFornecedor((p) => toggleItem(p, name)); break;
                  case 'top_centros_custo':  setSelCC((p) => toggleItem(p, name)); break;
                  case 'top_motoristas':     setSelMotorista((p) => toggleItem(p, name)); break;
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
      {/* FilterBar */}
      <FilterBar>
        <MultiSelectFilter label="Segmento" values={segmento} onChange={setSegmento}
          options={optsSeg} placeholder="Todos" />
        <MultiSelectFilter label="Placa" values={placa} onChange={setPlaca}
          options={optsPlaca} placeholder="Todas" />
        <MultiSelectFilter label="Centro de Custo" values={centroCusto} onChange={setCentroCusto}
          options={optsCC} placeholder="Todos" />
        <MultiSelectFilter label="Motorista" values={motorista} onChange={setMotorista}
          options={optsMot} placeholder="Todos" />
        <SearchFilter value={busca} onChange={setBusca} placeholder="Buscar..." />
        <div className="flex items-end">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            onClick={limparTudo}
            disabled={segmento.length + placa.length + centroCusto.length + motorista.length + busca.length + totalAtivos === 0}
          >
            <X className="h-3 w-3" /> Limpar filtros
          </Button>
        </div>
      </FilterBar>

      {/* Chips de cross-filter */}
      {totalAtivos > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
          <span className="font-semibold text-muted-foreground">Filtros ativos:</span>
          {renderChips('Mês', selMes, (v) => setSelMes((p) => p.filter((x) => x !== v)))}
          {renderChips('Segmento', selSegmento, (v) => setSelSegmento((p) => p.filter((x) => x !== v)))}
          {renderChips('Placa', selPlaca, (v) => setSelPlaca((p) => p.filter((x) => x !== v)))}
          {renderChips('Fornecedor', selFornecedor, (v) => setSelFornecedor((p) => p.filter((x) => x !== v)))}
          {renderChips('C.Custo', selCC, (v) => setSelCC((p) => p.filter((x) => x !== v)))}
          {renderChips('Motorista', selMotorista, (v) => setSelMotorista((p) => p.filter((x) => x !== v)))}
          <Button size="sm" variant="ghost" className="ml-auto h-6 gap-1 px-2 text-xs" onClick={limparTudo}>
            <X className="h-3 w-3" /> Limpar tudo
          </Button>
        </div>
      )}

      {/* Toolbar de edição de layout */}
      {canEditLayout && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          {!editingLayout ? (
            <Button size="sm" variant="outline" onClick={() => {
              setPendingHidden(new Set(widgets.filter((w) => w.hidden).map((w) => w.type)));
              setEditingLayout(true);
            }}>
              <Layers className="mr-1.5 h-4 w-4" />
              Editar layout
            </Button>
          ) : (
            <>
              <span className="text-xs font-medium text-primary">
                Modo edição: arraste, redimensione, configure ou oculte blocos
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setAddChartOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Novo gráfico
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={hiddenList.length === 0}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Restaurar bloco{hiddenList.length > 0 ? ` (${hiddenList.length})` : ''}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {hiddenList.map((w) => (
                      <DropdownMenuItem
                        key={w.type}
                        onClick={() => {
                          setPendingHidden((prev) => {
                            const next = new Set(prev ?? []);
                            next.delete(w.type);
                            return next;
                          });
                        }}
                      >
                        {w.title || w.type}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditingLayout(false);
                  setPendingLayout(null); setPendingHidden(null);
                  setPendingConfig({}); setPendingNewWidgets([]); setPendingDeletes(new Set());
                }} disabled={savingLayout}>Cancelar</Button>
                <Button size="sm" variant="outline" disabled={savingLayout} onClick={async () => {
                  if (!confirm('Restaurar o layout padrão para todos os usuários? Blocos canônicos voltam a aparecer (gráficos customizados são preservados).')) return;
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
                    const baseLayout = effectiveWidgets.map((w) => ({
                      type: w.type,
                      layout: overrides.get(w.type) ?? w.layout,
                    }));
                    const hiddenSet = pendingHidden ?? new Set<string>();
                    const layoutByType = new Map(baseLayout.map((b) => [b.type, b.layout]));
                    const allTypes = new Set<string>([
                      ...layoutByType.keys(),
                      ...effectiveWidgets.map((w) => w.type),
                    ]);
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
                      const layout = layoutByType.get(type)
                        ?? effectiveWidgets.find((w) => w.type === type)?.layout
                        ?? { x: 0, y: 0, w: 12, h: 4 };
                      const cfg = pendingConfig[type];
                      const nw = newWidgetsByType.get(type);
                      const ew = effectiveWidgets.find((w) => w.type === type);
                      return {
                        type, layout,
                        hidden: hiddenSet.has(type),
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
                    toast.success('Layout salvo para todos os usuários.');
                  } catch (e: any) { toast.error(e?.message ?? 'Falha ao salvar layout'); }
                  finally { setSavingLayout(false); }
                }}>{savingLayout ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Grid de widgets */}
      <PageDataProvider
        pageKey="frota"
        kpis={kpiPayload}
        series={seriesPayload}
        rows={crossFiltered}
      >
        <PassagensLayoutGrid
          widgets={effectiveWidgets as any}
          editing={editingLayout}
          onLayoutChange={setPendingLayout}
          onHide={editingLayout ? (type) => {
            setPendingHidden((prev) => {
              const next = new Set(prev ?? []);
              next.add(type);
              return next;
            });
          } : undefined}
          configurableTypes={CONFIGURABLE_CANONICAL}
          onConfigure={editingLayout ? (type) => setConfigureType(type) : undefined}
          onDelete={editingLayout ? (type) => {
            if (type.startsWith('custom-')) {
              const isNew = pendingNewWidgets.some((nw) => nw.type === type);
              if (isNew) {
                setPendingNewWidgets((prev) => prev.filter((nw) => nw.type !== type));
              } else {
                setPendingDeletes((prev) => {
                  const next = new Set(prev);
                  next.add(type);
                  return next;
                });
              }
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
            kpis={kpiPayload}
            series={seriesPayload}
            rows={crossFiltered}
            pageKey="frota"
            onApply={(next) => {
              if (!configureType) return;
              const t = configureType;
              setPendingConfig((prev) => ({ ...prev, [t]: next }));
              setPendingNewWidgets((prev) => prev.map((nw) =>
                nw.type === t
                  ? { ...nw, componentId: next.componentId, mapping: next.mapping, options: next.options, title: next.customTitle || nw.title }
                  : nw,
              ));
            }}
            onResetToDefault={() => {
              if (!configureType) return;
              const t = configureType;
              setPendingConfig((prev) => ({ ...prev, [t]: null }));
            }}
          />
        )}
        <AddChartDialog
          open={addChartOpen}
          onOpenChange={setAddChartOpen}
          kpis={kpiPayload}
          series={seriesPayload}
          rows={crossFiltered}
          pageKey="frota"
          onAdd={(nw) => setPendingNewWidgets((prev) => [...prev, nw])}
        />
      </PageDataProvider>

      {/* Drill-down hierárquico — bloco fixo abaixo do grid */}
      <VisualGate visualKey="frota.drill-hierarquico">
        <Card className="p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Drill-down hierárquico
            </div>
            <span className="text-xs text-muted-foreground">— clique nos níveis para montar a hierarquia:</span>
            <div className="flex flex-wrap gap-1">
              {ALL_DRILL_LEVELS.map((lv) => {
                const idx = drillLevels.indexOf(lv.key as string);
                const active = idx >= 0;
                return (
                  <Badge
                    key={lv.key as string}
                    variant={active ? 'default' : 'outline'}
                    className={cn('cursor-pointer select-none text-[11px]', active && 'gap-1')}
                    onClick={() => toggleDrillLevel(lv.key as string)}
                  >
                    {active && <span className="font-bold">{idx + 1}.</span>}
                    {lv.label}
                  </Badge>
                );
              })}
            </div>
          </div>
          {drillLevelsConfig.length === 0 ? (
            <p className="text-xs text-muted-foreground">Selecione pelo menos um nível acima para visualizar o drill-down.</p>
          ) : (
            <DrillDownTable
              data={crossFiltered}
              levels={drillLevelsConfig}
              valueKey="valor"
              valueFormatter={formatCurrency}
            />
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
      <button onClick={() => onRemove(v)} className="ml-0.5 hover:text-destructive" aria-label={`Remover ${label} ${v}`}>
        <X className="h-3 w-3" />
      </button>
    </Badge>
  ));
}

function uniqueOpts(values: (string | null | undefined)[]) {
  const set = new Set<string>();
  values.forEach((v) => { if (v && v.trim()) set.add(v); });
  return Array.from(set).sort().map((v) => ({ value: v, label: v }));
}

function topBy(rows: ManutencaoFrota[], keyFn: (r: ManutencaoFrota) => string) {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const k = keyFn(r);
    m.set(k, (m.get(k) ?? 0) + (r.valor || 0));
  });
  return Array.from(m.entries())
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);
}
