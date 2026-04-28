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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatNumber } from '@/lib/format';
import { Target, Loader2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { RelatorioRow } from './RelatorioSemanalObraCharts';

const META_KEY = 'producao.relatorio_semanal_obra.meta_semanal_kg';

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

function groupWeeklyPeso(rows: RelatorioRow[]) {
  const map = new Map<string, { week: string; peso: number; ts: number }>();
  for (const r of rows) {
    if (!r.data_inicial) continue;
    const d = new Date(r.data_inicial);
    if (Number.isNaN(d.getTime())) continue;
    const w = startOfWeek(d);
    const key = w.toISOString().slice(0, 10);
    const label = w.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const cur = map.get(key) || { week: label, peso: 0, ts: w.getTime() };
    cur.peso += Number(r.peso_total) || 0;
    map.set(key, cur);
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

  // Carrega meta
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

  // Verifica admin (replica regra de is_admin: user_access -> access_profiles 'Administrador')
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

  const data = useMemo(() => groupWeeklyPeso(rows), [rows]);

  const stats = useMemo(() => {
    if (!meta || data.length === 0) return null;
    const atingiu = data.filter((d) => d.peso >= meta).length;
    return {
      atingiu,
      total: data.length,
      pct: (atingiu / data.length) * 100,
    };
  }, [data, meta]);

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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Entrega Semanal para Fábrica vs. Meta</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <div className="h-full w-full animate-pulse rounded bg-muted/40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Entrega Semanal para Fábrica vs. Meta (kg)
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Peso total entregue por semana comparado à meta semanal.
              {stats && (
                <>
                  {' '}
                  <span className="font-medium text-foreground">
                    {stats.atingiu} de {stats.total} semanas atingiram a meta ({formatNumber(stats.pct, 0)}%)
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Sem dados para o período filtrado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => formatNumber(v, 0)}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: any, name: any) => {
                  const num = Number(v);
                  if (name === 'Peso (kg)') {
                    const pct = meta ? (num / meta) * 100 : null;
                    const diff = meta ? num - meta : null;
                    const extra = meta
                      ? ` (${formatNumber(pct!, 0)}% da meta, ${diff! >= 0 ? '+' : ''}${formatNumber(diff!, 2)} kg)`
                      : '';
                    return [`${formatNumber(num, 2)} kg${extra}`, name];
                  }
                  return [`${formatNumber(num, 2)} kg`, name];
                }}
              />
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
              <Bar dataKey="peso" name="Peso (kg)" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
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
  );
}
