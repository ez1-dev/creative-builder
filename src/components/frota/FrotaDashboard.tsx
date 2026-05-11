import { useMemo, useState } from 'react';
import {
  DashboardPage, KpiGrid, KpiCard,
  BarChartCard, DonutChartCard, RankingChartCard,
  FilterBar, SelectFilter, SearchFilter,
  DataTableBI, type Column,
  formatCurrency,
} from '@/components/bi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Wrench, DollarSign, Truck, Hash } from 'lucide-react';
import { VisualGate } from '@/components/VisualGate';
import { formatDate } from '@/lib/format';

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

export function FrotaDashboard({ data, loading, onEdit, onDelete }: Props) {
  const [segmento, setSegmento] = useState('all');
  const [centroCusto, setCentroCusto] = useState('all');
  const [placa, setPlaca] = useState('all');
  const [motorista, setMotorista] = useState('all');
  const [busca, setBusca] = useState('');

  const optsSeg = useMemo(() => uniqueOpts(data.map((r) => r.segmento)), [data]);
  const optsCC = useMemo(() => uniqueOpts(data.map((r) => r.centro_custo)), [data]);
  const optsPlaca = useMemo(() => uniqueOpts(data.map((r) => r.placa)), [data]);
  const optsMot = useMemo(() => uniqueOpts(data.map((r) => r.motorista)), [data]);

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

  const kpis = useMemo(() => {
    const total = filtered.reduce((s, r) => s + (r.valor || 0), 0);
    const veiculos = new Set(filtered.map((r) => r.placa)).size;
    const ticket = filtered.length > 0 ? total / filtered.length : 0;
    return { total, qtd: filtered.length, ticket, veiculos };
  }, [filtered]);

  const porMes = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((r) => {
      const key = r.mes ?? '?';
      m.set(key, (m.get(key) ?? 0) + (r.valor || 0));
    });
    return Array.from(m.entries())
      .sort((a, b) => MESES_ORDER.indexOf(a[0]) - MESES_ORDER.indexOf(b[0]))
      .map(([label, valor]) => ({ label, valor }));
  }, [filtered]);

  const porSegmento = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((r) => {
      const k = r.segmento || 'NÃO INFORMADO';
      m.set(k, (m.get(k) ?? 0) + (r.valor || 0));
    });
    return Array.from(m.entries()).map(([label, valor]) => ({ label, valor }));
  }, [filtered]);

  const topVeiculos = useMemo(() => topBy(filtered, (r) => r.placa || '—'), [filtered]);
  const topFornecedores = useMemo(() => topBy(filtered, (r) => r.fornecedor || '—'), [filtered]);
  const topCC = useMemo(() => topBy(filtered, (r) => r.centro_custo || '—'), [filtered]);
  const topMotoristas = useMemo(() => topBy(filtered, (r) => r.motorista || '—'), [filtered]);

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
          <BarChartCard title="Evolução mensal (R$)" data={porMes} loading={loading} />
        </VisualGate>
        <VisualGate visualKey="frota.chart-segmento">
          <DonutChartCard title="Distribuição por Segmento" data={porSegmento} loading={loading} />
        </VisualGate>
        <VisualGate visualKey="frota.chart-top-veiculos">
          <RankingChartCard title="Top Veículos por Valor" data={topVeiculos} topN={10} loading={loading} />
        </VisualGate>
        <VisualGate visualKey="frota.chart-top-fornecedores">
          <RankingChartCard title="Top Fornecedores" data={topFornecedores} topN={10} loading={loading} />
        </VisualGate>
        <VisualGate visualKey="frota.chart-top-cc">
          <RankingChartCard title="Top Centros de Custo" data={topCC} topN={10} loading={loading} />
        </VisualGate>
        <VisualGate visualKey="frota.chart-top-motoristas">
          <RankingChartCard title="Top Motoristas" data={topMotoristas} topN={10} loading={loading} />
        </VisualGate>
      </div>

      <Card className="p-3">
        <DataTableBI columns={cols} data={filtered} loading={loading}
          emptyMessage="Nenhum registro de manutenção encontrado" />
      </Card>
    </DashboardPage>
  );
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
