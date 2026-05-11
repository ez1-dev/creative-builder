import { useMemo, useState } from 'react';
import {
  DashboardPage, KpiGrid, KpiCard,
  BarChartCard, PieChartCard, RankingChartCard,
  FilterBar, SelectFilter, SearchFilter,
  DataTableBI, type Column,
  DrillDownTable,
  formatCurrency,
} from '@/components/bi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Wrench, DollarSign, Truck, Hash, X, Layers } from 'lucide-react';
import { VisualGate } from '@/components/VisualGate';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

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

function toggleItem(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function FrotaDashboard({ data, loading, onEdit, onDelete }: Props) {
  // FilterBar
  const [segmento, setSegmento] = useState('all');
  const [centroCusto, setCentroCusto] = useState('all');
  const [placa, setPlaca] = useState('all');
  const [motorista, setMotorista] = useState('all');
  const [busca, setBusca] = useState('');

  // Cross-filter (multi-seleção por clique)
  const [selMes, setSelMes] = useState<string[]>([]);
  const [selSegmento, setSelSegmento] = useState<string[]>([]);
  const [selPlaca, setSelPlaca] = useState<string[]>([]);
  const [selFornecedor, setSelFornecedor] = useState<string[]>([]);
  const [selCC, setSelCC] = useState<string[]>([]);
  const [selMotorista, setSelMotorista] = useState<string[]>([]);

  // Drill-down hierárquico
  const [drillLevels, setDrillLevels] = useState<string[]>([
    'segmento', 'centro_custo', 'placa', 'fornecedor',
  ]);

  const optsSeg = useMemo(() => uniqueOpts(data.map((r) => r.segmento)), [data]);
  const optsCC = useMemo(() => uniqueOpts(data.map((r) => r.centro_custo)), [data]);
  const optsPlaca = useMemo(() => uniqueOpts(data.map((r) => r.placa)), [data]);
  const optsMot = useMemo(() => uniqueOpts(data.map((r) => r.motorista)), [data]);

  // 1ª camada: filtros do FilterBar + busca
  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return data.filter((r) => {
      if (segmento !== 'all' && (r.segmento ?? '') !== segmento) return false;
      if (centroCusto !== 'all' && (r.centro_custo ?? '') !== centroCusto) return false;
      if (placa !== 'all' && r.placa !== placa) return false;
      if (motorista !== 'all' && (r.motorista ?? '') !== motorista) return false;
      if (q) {
        const hay = [r.placa, r.veiculo_descricao, r.fornecedor, r.descricao, r.motorista, r.centro_custo]
          .map((v) => (v ?? '').toLowerCase()).join(' | ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, segmento, centroCusto, placa, motorista, busca]);

  // 2ª camada: cross-filter (clique nos gráficos)
  const crossFiltered = useMemo(() => {
    return filtered.filter((r) => {
      if (selMes.length && !selMes.includes(r.mes ?? '?')) return false;
      if (selSegmento.length && !selSegmento.includes(r.segmento ?? 'NÃO INFORMADO')) return false;
      if (selPlaca.length && !selPlaca.includes(r.placa ?? '—')) return false;
      if (selFornecedor.length && !selFornecedor.includes(r.fornecedor ?? '—')) return false;
      if (selCC.length && !selCC.includes(r.centro_custo ?? '—')) return false;
      if (selMotorista.length && !selMotorista.includes(r.motorista ?? '—')) return false;
      return true;
    });
  }, [filtered, selMes, selSegmento, selPlaca, selFornecedor, selCC, selMotorista]);

  const totalAtivos =
    selMes.length + selSegmento.length + selPlaca.length +
    selFornecedor.length + selCC.length + selMotorista.length;

  const limparTudo = () => {
    setSelMes([]); setSelSegmento([]); setSelPlaca([]);
    setSelFornecedor([]); setSelCC([]); setSelMotorista([]);
    setSegmento('all'); setCentroCusto('all'); setPlaca('all'); setMotorista('all');
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
    crossFiltered.forEach((r) => {
      const key = r.mes ?? '?';
      m.set(key, (m.get(key) ?? 0) + (r.valor || 0));
    });
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

  const drillLevelsConfig = useMemo(
    () => drillLevels
      .map((k) => ALL_DRILL_LEVELS.find((l) => l.key === k))
      .filter(Boolean)
      .map((l) => ({ key: l!.key as string, label: l!.label })),
    [drillLevels],
  );

  const toggleDrillLevel = (key: string) => {
    setDrillLevels((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

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

  return (
    <DashboardPage>
      <FilterBar>
        <SelectFilter
          label="Segmento" value={segmento} onChange={setSegmento}
          options={[{ value: 'all', label: 'Todos' }, ...optsSeg]}
        />
        <SelectFilter
          label="Placa" value={placa} onChange={setPlaca}
          options={[{ value: 'all', label: 'Todas' }, ...optsPlaca]}
        />
        <SelectFilter
          label="Centro de Custo" value={centroCusto} onChange={setCentroCusto}
          options={[{ value: 'all', label: 'Todos' }, ...optsCC]}
        />
        <SelectFilter
          label="Motorista" value={motorista} onChange={setMotorista}
          options={[{ value: 'all', label: 'Todos' }, ...optsMot]}
        />
        <SearchFilter value={busca} onChange={setBusca} placeholder="Buscar..." />
      </FilterBar>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <VisualGate visualKey="frota.chart-evolucao-mensal">
          <BarChartCard
            title="Evolução mensal (R$)"
            subtitle="Clique numa barra para filtrar pelo mês"
            data={porMes} loading={loading}
            onItemClick={(d) => setSelMes((prev) => toggleItem(prev, d.label))}
          />
        </VisualGate>
        <VisualGate visualKey="frota.chart-segmento">
          <PieChartCard
            title="Distribuição por Segmento"
            subtitle="Clique numa fatia para filtrar"
            data={porSegmento} loading={loading} donut
            onItemClick={(d) => setSelSegmento((prev) => toggleItem(prev, d.label))}
          />
        </VisualGate>
        <VisualGate visualKey="frota.chart-top-veiculos">
          <RankingChartCard
            title="Top Veículos por Valor"
            subtitle="Clique para filtrar pelo veículo"
            data={topVeiculos} topN={10} loading={loading}
            onItemClick={(d) => setSelPlaca((prev) => toggleItem(prev, d.label))}
          />
        </VisualGate>
        <VisualGate visualKey="frota.chart-top-fornecedores">
          <RankingChartCard
            title="Top Fornecedores"
            subtitle="Clique para filtrar pelo fornecedor"
            data={topFornecedores} topN={10} loading={loading}
            onItemClick={(d) => setSelFornecedor((prev) => toggleItem(prev, d.label))}
          />
        </VisualGate>
        <VisualGate visualKey="frota.chart-top-cc">
          <RankingChartCard
            title="Top Centros de Custo"
            subtitle="Clique para filtrar pelo C.Custo"
            data={topCC} topN={10} loading={loading}
            onItemClick={(d) => setSelCC((prev) => toggleItem(prev, d.label))}
          />
        </VisualGate>
        <VisualGate visualKey="frota.chart-top-motoristas">
          <RankingChartCard
            title="Top Motoristas"
            subtitle="Clique para filtrar pelo motorista"
            data={topMotoristas} topN={10} loading={loading}
            onItemClick={(d) => setSelMotorista((prev) => toggleItem(prev, d.label))}
          />
        </VisualGate>
      </div>

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

      <Card className="p-3">
        <DataTableBI columns={cols} data={crossFiltered} loading={loading}
          emptyMessage="Nenhum registro de manutenção encontrado" />
      </Card>
    </DashboardPage>
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
