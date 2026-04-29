import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VisualGate } from '@/components/VisualGate';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatNumber } from '@/lib/format';
import { Target, Loader2, Save, CalendarRange } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { RelatorioRow } from './RelatorioSemanalObraCharts';

export const META_KEY = 'producao.relatorio_semanal_obra.meta_semanal_kg';
export const SEMANAS_POR_MES = 4.33;

interface Props {
  rows: RelatorioRow[];
  loading: boolean;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function groupWeeklyPeso(rows: RelatorioRow[]) {
  const map = new Map<string, { week: string; peso: number; ts: number }>();
  let minTs: number | null = null;
  let maxTs: number | null = null;
  for (const r of rows) {
    if (!r.data_inicial) continue;
    const d = new Date(r.data_inicial);
    if (Number.isNaN(d.getTime())) continue;
    const w = startOfWeek(d);
    const ts = w.getTime();
    if (minTs == null || ts < minTs) minTs = ts;
    if (maxTs == null || ts > maxTs) maxTs = ts;
    const key = w.toISOString().slice(0, 10);
    const label = w.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const cur = map.get(key) || { week: label, peso: 0, ts };
    cur.peso += Number(r.peso_total) || 0;
    map.set(key, cur);
  }
  if (minTs != null && maxTs != null) {
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    for (let t = minTs; t <= maxTs; t += ONE_WEEK) {
      const d = new Date(t);
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) {
        map.set(key, {
          week: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          peso: 0,
          ts: t,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}

export function groupMonthlyPeso(rows: RelatorioRow[]) {
  const map = new Map<string, { month: string; peso: number; ts: number }>();
  let minTs: number | null = null;
  let maxTs: number | null = null;
  for (const r of rows) {
    if (!r.data_inicial) continue;
    const d = new Date(r.data_inicial);
    if (Number.isNaN(d.getTime())) continue;
    const m = new Date(d.getFullYear(), d.getMonth(), 1);
    const ts = m.getTime();
    if (minTs == null || ts < minTs) minTs = ts;
    if (maxTs == null || ts > maxTs) maxTs = ts;
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    const label = m.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const cur = map.get(key) || { month: label, peso: 0, ts };
    cur.peso += Number(r.peso_total) || 0;
    map.set(key, cur);
  }
  if (minTs != null && maxTs != null) {
    const cursor = new Date(minTs);
    const end = new Date(maxTs);
    while (cursor.getTime() <= end.getTime()) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, {
          month: cursor.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          peso: 0,
          ts: cursor.getTime(),
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 6,
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
};

export function MetaEntregaSemanalChart({ rows, loading }: Props) {
  const { erpUser } = useAuth();
  const [meta, setMeta] = useState<number | null>(null);
  const [metaInput, setMetaInput] = useState<string>('');
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [drillDown, setDrillDown] = useState<{
    type: 'week' | 'month';
    label: string;
    rows: RelatorioRow[];
    metaRef: number | null;
  } | null>(null);

  const handleWeekBarClick = (data: any) => {
    if (!data || data.ts == null) return;
    const start = Number(data.ts);
    const end = start + 7 * 24 * 60 * 60 * 1000;
    const filtered = rows.filter((r) => {
      if (!r.data_inicial) return false;
      const t = new Date(r.data_inicial).getTime();
      return Number.isFinite(t) && t >= start && t < end;
    });
    setDrillDown({
      type: 'week',
      label: `Semana de ${new Date(start).toLocaleDateString('pt-BR')}`,
      rows: filtered,
      metaRef: meta,
    });
  };

  const handleMonthBarClick = (data: any) => {
    if (!data || data.ts == null) return;
    const startD = new Date(Number(data.ts));
    const start = startD.getTime();
    const endD = new Date(startD.getFullYear(), startD.getMonth() + 1, 1);
    const end = endD.getTime();
    const filtered = rows.filter((r) => {
      if (!r.data_inicial) return false;
      const t = new Date(r.data_inicial).getTime();
      return Number.isFinite(t) && t >= start && t < end;
    });
    const label = startD.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    setDrillDown({
      type: 'month',
      label: `Mês de ${label}`,
      rows: filtered,
      metaRef: meta != null ? meta * SEMANAS_POR_MES : null,
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMeta(true);
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', META_KEY)
        .maybeSingle();
      if (cancelled) return;
      const v = data?.value ? Number(data.value) : null;
      const valid = v != null && Number.isFinite(v) && v > 0 ? v : null;
      setMeta(valid);
      setMetaInput(valid != null ? String(valid) : '');
      setLoadingMeta(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!erpUser) {
      setIsAdmin(false);
      return;
    }
    (async () => {
      const { data: access } = await supabase
        .from('user_access')
        .select('profile_id')
        .ilike('user_login', erpUser)
        .maybeSingle();
      if (cancelled || !access) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data: profile } = await supabase
        .from('access_profiles')
        .select('name')
        .eq('id', access.profile_id)
        .maybeSingle();
      if (cancelled) return;
      setIsAdmin(profile?.name === 'Administrador');
    })();
    return () => {
      cancelled = true;
    };
  }, [erpUser]);

  const weeklyData = useMemo(() => groupWeeklyPeso(rows), [rows]);
  const monthlyData = useMemo(() => groupMonthlyPeso(rows), [rows]);
  const metaMensal = useMemo(() => (meta != null ? meta * SEMANAS_POR_MES : null), [meta]);

  const weeklyStats = useMemo(() => {
    if (!meta || weeklyData.length === 0) return null;
    const atingiu = weeklyData.filter((d) => d.peso >= meta).length;
    return { atingiu, total: weeklyData.length, pct: (atingiu / weeklyData.length) * 100 };
  }, [weeklyData, meta]);

  const monthlyStats = useMemo(() => {
    if (!metaMensal || monthlyData.length === 0) return null;
    const atingiu = monthlyData.filter((d) => d.peso >= metaMensal).length;
    return { atingiu, total: monthlyData.length, pct: (atingiu / monthlyData.length) * 100 };
  }, [monthlyData, metaMensal]);

  const handleSave = async () => {
    const v = Number(metaInput.replace(',', '.'));
    if (!Number.isFinite(v) || v < 0) {
      toast({ title: 'Valor inválido', description: 'Informe um número válido (kg).', variant: 'destructive' });
      return;
    }
    setSavingMeta(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: META_KEY, value: String(v), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setSavingMeta(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    setMeta(v > 0 ? v : null);
    toast({ title: 'Meta atualizada', description: `Meta semanal definida em ${formatNumber(v, 2)} kg.` });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Carregando gráfico...</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <div className="h-full w-full animate-pulse rounded bg-muted/40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const tooltipFormatter = (metaRef: number | null) => (v: any, name: any) => {
    const num = Number(v);
    if (name === 'Peso (kg)' && metaRef) {
      const pct = (num / metaRef) * 100;
      const diff = num - metaRef;
      return [
        `${formatNumber(num, 2)} kg (${formatNumber(pct, 0)}% da meta, ${diff >= 0 ? '+' : ''}${formatNumber(diff, 2)} kg)`,
        name,
      ];
    }
    return [`${formatNumber(num, 2)} kg`, name];
  };

  return (
    <VisualGate visualKey="producao.meta-semanal">
    <div className="space-y-4">
      {/* SEMANAL */}
      <Card data-chart-id="meta-entrega-semanal">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Entrega Semanal para Fábrica vs. Meta (kg)
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Peso total entregue por semana comparado à meta semanal. Clique numa barra para ver os detalhes.
                {weeklyStats && (
                  <>
                    {' '}
                    <span className="font-medium text-foreground">
                      {weeklyStats.atingiu} de {weeklyStats.total} semanas atingiram a meta ({formatNumber(weeklyStats.pct, 0)}%)
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 pdf-hide">
              {loadingMeta ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : isAdmin ? (
                <>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    value={metaInput}
                    onChange={(e) => setMetaInput(e.target.value)}
                    placeholder="Meta semanal (kg)"
                    className="h-8 w-40 text-xs"
                  />
                  <Button size="sm" variant="default" onClick={handleSave} disabled={savingMeta} className="h-8">
                    {savingMeta ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span className="ml-1 text-xs">Salvar</span>
                  </Button>
                </>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Meta: {meta != null ? `${formatNumber(meta, 2)} kg` : 'não definida'}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[300px] pt-0">
          {weeklyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Sem dados para o período filtrado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyData} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatNumber(v, 0)} />
                <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter(meta)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {meta != null && (
                  <ReferenceLine
                    y={meta}
                    stroke="hsl(var(--warning))"
                    strokeDasharray="6 4"
                    strokeWidth={2}
                    label={{
                      value: `Meta: ${formatNumber(meta, 0)} kg`,
                      position: 'insideTopRight',
                      fill: 'hsl(var(--warning))',
                      fontSize: 10,
                    }}
                  />
                )}
                <Bar dataKey="peso" name="Peso (kg)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={handleWeekBarClick}>
                  {weeklyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={meta != null && entry.peso >= meta ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* MENSAL */}
      <Card data-chart-id="meta-entrega-mensal">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-primary" />
                Entrega Mensal para Fábrica vs. Meta (kg)
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Somatória mensal do peso entregue (meta = semanal × {SEMANAS_POR_MES}). Clique numa barra para ver os detalhes.
                {monthlyStats && (
                  <>
                    {' '}
                    <span className="font-medium text-foreground">
                      {monthlyStats.atingiu} de {monthlyStats.total} meses atingiram a meta ({formatNumber(monthlyStats.pct, 0)}%)
                    </span>
                  </>
                )}
              </p>
            </div>
            <Badge variant="secondary" className="text-xs pdf-hide">
              Meta mensal: {metaMensal != null ? `${formatNumber(metaMensal, 0)} kg` : 'não definida'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="h-[300px] pt-0">
          {monthlyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Sem dados para o período filtrado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatNumber(v, 0)} />
                <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter(metaMensal)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {metaMensal != null && (
                  <ReferenceLine
                    y={metaMensal}
                    stroke="hsl(var(--warning))"
                    strokeDasharray="6 4"
                    strokeWidth={2}
                    label={{
                      value: `Meta: ${formatNumber(metaMensal, 0)} kg`,
                      position: 'insideTopRight',
                      fill: 'hsl(var(--warning))',
                      fontSize: 10,
                    }}
                  />
                )}
                <Bar dataKey="peso" name="Peso (kg)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={handleMonthBarClick}>
                  {monthlyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={metaMensal != null && entry.peso >= metaMensal ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <DrillDownDialog drill={drillDown} onClose={() => setDrillDown(null)} />
    </div>
  );
}

interface DrillProps {
  drill: {
    type: 'week' | 'month';
    label: string;
    rows: RelatorioRow[];
    metaRef: number | null;
  } | null;
  onClose: () => void;
}

function DrillDownDialog({ drill, onClose }: DrillProps) {
  const totals = useMemo(() => {
    if (!drill) return null;
    const obras = new Set<string>();
    const projetos = new Set<string>();
    let peso = 0,
      pecas = 0,
      cargas = 0;
    for (const r of drill.rows) {
      if (r.obra) obras.add(String(r.obra));
      if (r.numero_projeto != null && r.numero_projeto !== '') projetos.add(String(r.numero_projeto));
      peso += Number(r.peso_total) || 0;
      pecas += Number(r.quantidade_pecas) || 0;
      cargas += Number(r.quantidade_cargas) || 0;
    }
    const pct = drill.metaRef ? (peso / drill.metaRef) * 100 : null;
    return { obras: obras.size, projetos: projetos.size, peso, pecas, cargas, pct };
  }, [drill]);

  const sorted = useMemo(
    () => (drill ? [...drill.rows].sort((a, b) => (Number(b.peso_total) || 0) - (Number(a.peso_total) || 0)) : []),
    [drill],
  );

  if (!drill) return null;

  return (
    <Dialog open={drill != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{drill.label}</DialogTitle>
          <DialogDescription>
            Detalhamento das entregas registradas no período selecionado.
          </DialogDescription>
        </DialogHeader>

        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <KpiMini label="Peso Total" value={`${formatNumber(totals.peso, 2)} kg`} />
            <KpiMini label="Peças" value={formatNumber(totals.pecas, 0)} />
            <KpiMini label="Cargas" value={formatNumber(totals.cargas, 0)} />
            <KpiMini label="Obras" value={formatNumber(totals.obras, 0)} />
            <KpiMini label="Projetos" value={formatNumber(totals.projetos, 0)} />
            <KpiMini
              label="% da Meta"
              value={totals.pct != null ? `${formatNumber(totals.pct, 0)}%` : '—'}
              tone={
                totals.pct == null
                  ? 'muted'
                  : totals.pct >= 100
                    ? 'success'
                    : totals.pct >= 80
                      ? 'warning'
                      : 'destructive'
              }
            />
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Sem entregas registradas neste período.
          </div>
        ) : (
          <ScrollArea className="max-h-[420px] rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead className="text-xs">Obra</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Cidade</TableHead>
                  <TableHead className="text-xs">Projeto</TableHead>
                  <TableHead className="text-xs">Período</TableHead>
                  <TableHead className="text-xs text-right">Cargas</TableHead>
                  <TableHead className="text-xs text-right">Peças</TableHead>
                  <TableHead className="text-xs text-right">Peso (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{r.obra || '—'}</TableCell>
                    <TableCell className="text-xs">{r.cliente || '—'}</TableCell>
                    <TableCell className="text-xs">{r.cidade || '—'}</TableCell>
                    <TableCell className="text-xs">{r.numero_projeto ?? '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {r.data_inicial ? new Date(r.data_inicial).toLocaleDateString('pt-BR') : '—'}
                      {r.data_final ? ` → ${new Date(r.data_final).toLocaleDateString('pt-BR')}` : ''}
                    </TableCell>
                    <TableCell className="text-xs text-right">{formatNumber(Number(r.quantidade_cargas) || 0, 0)}</TableCell>
                    <TableCell className="text-xs text-right">{formatNumber(Number(r.quantidade_pecas) || 0, 0)}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{formatNumber(Number(r.peso_total) || 0, 2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {totals && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="text-xs font-semibold">Total</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{formatNumber(totals.cargas, 0)}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{formatNumber(totals.pecas, 0)}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{formatNumber(totals.peso, 2)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KpiMini({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'destructive' | 'muted';
}) {
  const toneCls =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'destructive'
          ? 'text-destructive'
          : tone === 'muted'
            ? 'text-muted-foreground'
            : 'text-foreground';
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className={`text-sm font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}
