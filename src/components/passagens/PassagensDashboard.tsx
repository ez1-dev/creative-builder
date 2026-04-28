import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KPICard } from '@/components/erp/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Plane, DollarSign, TrendingUp, Users, Pencil, Trash2, RotateCcw, X, Layers, Download } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/format';
import { ColaboradorCombobox } from '@/components/passagens/ColaboradorCombobox';

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
  readOnly?: boolean;
}

export function PassagensDashboard({ data, loading, onEdit, onDelete, onExport, readOnly }: Props) {
  const [filtroColaborador, setFiltroColaborador] = useState('');
  const [filtroCC, setFiltroCC] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroMes, setFiltroMes] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  // Cross-filters (clique nos gráficos)
  const [selectedMes, setSelectedMes] = useState<string | null>(null);
  const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);
  const [selectedCC, setSelectedCC] = useState<string | null>(null);
  // Agrupamento do card Registros
  const [groupBy, setGroupBy] = useState<GroupBy>('centro_custo');
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => {
      const m = (r.data_registro ?? '').slice(0, 7);
      if (m) set.add(m);
    });
    return Array.from(set).sort();
  }, [data]);

  const formatMesLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${nomes[Number(m) - 1] ?? m}/${y}`;
  };

  // Filtros do topo
  const filtered = useMemo(() => data.filter((r) => {
    if (filtroColaborador && !r.colaborador.toLowerCase().includes(filtroColaborador.toLowerCase())) return false;
    if (filtroCC && !(r.centro_custo ?? '').toLowerCase().includes(filtroCC.toLowerCase())) return false;
    if (filtroTipo !== 'todos' && r.tipo_despesa !== filtroTipo) return false;
    const dr = (r.data_registro ?? '').slice(0, 10);
    if (filtroMes !== 'todos' && dr.slice(0, 7) !== filtroMes) return false;
    if (dataInicio && dr < dataInicio) return false;
    if (dataFim && dr > dataFim) return false;
    return true;
  }), [data, filtroColaborador, filtroCC, filtroTipo, filtroMes, dataInicio, dataFim]);

  // Helper: aplica subset dos cross-filters
  const applyCross = (rows: Passagem[], opts: { mes?: boolean; motivo?: boolean; cc?: boolean }) => {
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
      return true;
    });
  };

  // Dados para KPIs e tabela: aplica TODOS os cross-filters
  const crossFiltered = useMemo(
    () => applyCross(filtered, { mes: true, motivo: true, cc: true }),
    [filtered, selectedMes, selectedMotivo, selectedCC],
  );

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

  // Gráfico Evolução Mensal: ignora selectedMes
  const porMes = useMemo(() => {
    const base = applyCross(filtered, { motivo: true, cc: true });
    const map = new Map<string, number>();
    base.forEach((r) => {
      const mes = r.data_registro.slice(0, 7);
      map.set(mes, (map.get(mes) ?? 0) + Number(r.valor || 0));
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([mes, valor]) => ({ mes, valor }));
  }, [filtered, selectedMotivo, selectedCC]);

  // Gráfico Motivo: ignora selectedMotivo
  const porMotivo = useMemo(() => {
    const base = applyCross(filtered, { mes: true, cc: true });
    const map = new Map<string, number>();
    base.forEach((r) => {
      const m = (r.motivo_viagem && r.motivo_viagem.trim()) || 'Não informado';
      map.set(m, (map.get(m) ?? 0) + Number(r.valor || 0));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, selectedMes, selectedCC]);

  // Gráfico CC: ignora selectedCC
  const porCentroCusto = useMemo(() => {
    const base = applyCross(filtered, { mes: true, motivo: true });
    const map = new Map<string, number>();
    base.forEach((r) => {
      const cc = r.centro_custo || 'Sem CC';
      map.set(cc, (map.get(cc) ?? 0) + Number(r.valor || 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 15);
  }, [filtered, selectedMes, selectedMotivo]);

  const hasCrossFilter = !!(selectedMes || selectedMotivo || selectedCC);
  const hasTopFilter = !!filtroColaborador || !!filtroCC || filtroTipo !== 'todos' || filtroMes !== 'todos' || !!dataInicio || !!dataFim;

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
  };

  // Cores para destaque condicional
  const primaryColor = 'hsl(var(--primary))';
  const dimOpacity = 0.3;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
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
              <Input value={filtroCC} onChange={(e) => setFiltroCC(e.target.value)} placeholder="Buscar..." />
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
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <KPICard title="Total Geral" value={formatCurrency(totalGeral)} icon={<DollarSign className="h-5 w-5" />} index={0} />
        <div className="relative">
          <KPICard
            title="Registros"
            value={totalRegistros}
            icon={<Plane className="h-5 w-5" />}
            variant="info"
            index={1}
            description={`${gruposCount} ${groupOption.label}${gruposCount === 1 ? '' : 's'}`}
          />
          <div className="absolute right-2 top-2 flex items-center gap-1">
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="h-7 w-[140px] text-xs" aria-label="Agrupar por">
                <Layers className="mr-1 h-3 w-3" />
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
              className="h-7 w-7"
              onClick={() => setGroupSheetOpen(true)}
              disabled={gruposCount === 0}
              aria-label="Ver detalhes do agrupamento"
              title="Ver detalhes"
            >
              <Layers className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <KPICard title="Colaboradores" value={colaboradoresUnicos} icon={<Users className="h-5 w-5" />} variant="success" index={2} />
        <KPICard title="Ticket Médio" value={formatCurrency(ticketMedio)} icon={<TrendingUp className="h-5 w-5" />} variant="warning" index={3} />
      </div>

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
            <ResponsiveContainer width="100%" height={320}>
              <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <Pie
                  data={porMotivo}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  cursor="pointer"
                  onClick={(d: any) => setSelectedMotivo((prev) => (prev === d.name ? null : d.name))}
                  labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                  label={(e: any) => {
                    const v = Number(e.value || 0);
                    const mil = `R$${(v / 1000).toFixed(0)} Mil`;
                    const pct = ((e.percent ?? 0) * 100).toFixed(2).replace('.', ',');
                    return `${e.name} ${mil} (${pct}%)`;
                  }}
                  style={{ fontSize: 11 }}
                >
                  {porMotivo.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                      fillOpacity={selectedMotivo && selectedMotivo !== entry.name ? dimOpacity : 1}
                    />
                  ))}
                </Pie>
                <RTooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Top 15 Centros de Custo {selectedCC && <span className="text-xs font-normal text-muted-foreground">(clique novamente para limpar)</span>}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={porCentroCusto} layout="vertical">
                <XAxis type="number" fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" fontSize={11} width={140} />
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Registros ({crossFiltered.length})</CardTitle>
          {onExport && (
            <Button size="sm" variant="outline" onClick={() => onExport(crossFiltered)} disabled={crossFiltered.length === 0}>
              Exportar CSV
            </Button>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>C. Custo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem → Destino</TableHead>
                <TableHead>Cia</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                {!readOnly && (onEdit || onDelete) && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : crossFiltered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum registro</TableCell></TableRow>
              ) : crossFiltered.map((r) => (
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
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function exportPassagensCsv(rows: Passagem[]) {
  const headers = ['Data', 'Colaborador', 'Centro Custo', 'Projeto/Obra', 'Tipo', 'Origem', 'Destino', 'Cia', 'Bilhete', 'Valor'];
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
