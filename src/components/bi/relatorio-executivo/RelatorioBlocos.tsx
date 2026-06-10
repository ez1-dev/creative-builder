import { formatCurrency, formatNumber } from '@/components/bi';
import type { RelatorioDados } from '@/hooks/useRelatorioExecutivoFaturamento';
import type { BiComercialFilters } from '@/lib/bi/comercialFilters';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Cell, ReferenceLine } from 'recharts';
import { useMemo, useState } from 'react';
import { pickDimensionLabel, type LabelDimension } from '@/lib/bi/dimensionLabels';

const pct = (v: number | null | undefined) => v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(1)}%`;
const num = (v: number | null | undefined) => v == null || !Number.isFinite(v) ? 0 : Number(v);

export interface BlocoProps {
  dados: RelatorioDados;
  filtros: BiComercialFilters;
}

// ---------- KPIs ----------
export function KpisBloco({ dados }: BlocoProps) {
  const k = dados.kpis ?? ({} as any);
  const fat = num(k.faturamento);
  const liq = num(k.fat_liquido ?? k.faturamento_liquido);
  const imp = num(k.impostos);
  const dev = num(k.devolucao);
  const ticket = num(k.ticket_medio);
  const meta = num(k.meta ?? k.vl_meta);
  const pctMeta = meta > 0 ? (fat / meta) * 100 : null;
  const pctImp = fat > 0 ? (imp / fat) * 100 : null;
  const pctDev = fat > 0 ? (dev / fat) * 100 : null;

  const cards = [
    { label: 'Faturamento Bruto', value: formatCurrency(fat), sub: null, accent: 'primary' as const },
    { label: 'Faturamento Líquido', value: formatCurrency(liq), sub: `${pct(fat>0?(liq/fat)*100:null)} do bruto`, accent: 'success' as const },
    { label: 'Impostos', value: formatCurrency(imp), sub: `${pct(pctImp)} do bruto`, accent: 'warning' as const },
    { label: 'Devolução', value: formatCurrency(dev), sub: `${pct(pctDev)} do bruto`, accent: 'destructive' as const },
    { label: 'Ticket Médio', value: formatCurrency(ticket), sub: `${formatNumber(num(k.numero_vendas))} vendas`, accent: 'primary' as const },
    { label: 'Atingimento de Meta', value: pct(pctMeta), sub: meta>0?`Meta: ${formatCurrency(meta)}`:'Sem meta', accent: pctMeta != null && pctMeta >= 100 ? 'success' as const : 'warning' as const },
  ];

  return (
    <section className="rel-bloco">
      <h2 className="rel-bloco-titulo">Visão Geral</h2>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`rel-kpi rel-kpi-${c.accent}`}>
            <div className="rel-kpi-label">{c.label}</div>
            <div className="rel-kpi-value">{c.value}</div>
            {c.sub && <div className="rel-kpi-sub">{c.sub}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Evolução Mensal + Meta ----------
function fmtAnomes(v: string) {
  if (!v || v.length < 6) return v;
  return `${v.slice(4)}/${v.slice(2, 4)}`;
}

export function EvolucaoBloco({ dados, filtros }: BlocoProps) {
  const metasMap = new Map<string, number>();
  for (const m of dados.metas) {
    if (filtros.unidade_negocio !== 'CONSOLIDADO' && m.unidade_negocio !== filtros.unidade_negocio) continue;
    metasMap.set(m.anomes_emissao, (metasMap.get(m.anomes_emissao) ?? 0) + Number(m.vl_meta ?? 0));
  }

  const data = dados.mensal.map((r: any) => {
    const metaCloud = metasMap.get(r.anomes_emissao);
    const metaApi = r.meta != null ? Number(r.meta) : null;
    const Meta = metaCloud != null && metaCloud > 0
      ? metaCloud
      : (metaApi != null && metaApi > 0 ? metaApi : null);
    return {
      anomes: fmtAnomes(r.anomes_emissao),
      Faturamento: num(r.faturamento),
      Líquido: num(r.fat_liquido),
      Meta,
    };
  });

  const temMeta = data.some((d) => d.Meta != null);

  return (
    <section className="rel-bloco">
      <h2 className="rel-bloco-titulo">Evolução Mensal — Realizado vs Meta</h2>
      <div className="h-72 rel-chart" data-rel-chart="evolucao">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="anomes" fontSize={11} />
            <YAxis fontSize={11} tickFormatter={(v) => Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
            <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Faturamento" fill="hsl(var(--primary))" />
            <Line type="monotone" dataKey="Líquido" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
            {temMeta && (
              <Line type="monotone" dataKey="Meta" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls />
            )}

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// ---------- Rankings ----------
function truncateLabel(s: string, max = 28) {
  if (!s) return '—';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function RankingTopN({ titulo, rows, dim, valueKey, chartId }: {
  titulo: string; rows: any[]; dim: LabelDimension; valueKey: string; chartId: string;
}) {
  const top = [...rows]
    .map((r) => {
      const full = pickDimensionLabel(r, dim) || '—';
      return { label: truncateLabel(full, 28), fullLabel: full, value: num(r[valueKey]) };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const total = top.reduce((acc, r) => acc + r.value, 0);
  return (
    <div className="rel-ranking">
      <h3 className="rel-ranking-titulo">{titulo}</h3>
      <div className="h-56 rel-chart" data-rel-chart={chartId}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ top: 5, right: 30, left: 8, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" fontSize={10} tickFormatter={(v) => Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
            <YAxis type="category" dataKey="label" fontSize={10} width={170} interval={0} />
            <Tooltip formatter={(v: any) => formatCurrency(Number(v))} labelFormatter={(_, payload: any) => payload?.[0]?.payload?.fullLabel ?? ''} />
            <Bar dataKey="value" fill="hsl(var(--primary))">
              {top.map((_, i) => <Cell key={i} fill={`hsl(var(--primary) / ${1 - i * 0.06})`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="rel-tabela-mini">
        <thead><tr><th>#</th><th>{titulo.split(' ').slice(-1)[0]}</th><th className="text-right">Valor</th><th className="text-right">%</th></tr></thead>
        <tbody>
          {top.slice(0, 5).map((r, i) => (
            <tr key={i}>
              <td>{i+1}</td>
              <td>{r.label}</td>
              <td className="text-right tabular-nums">{formatCurrency(r.value)}</td>
              <td className="text-right tabular-nums">{total>0?((r.value/total)*100).toFixed(1):'0.0'}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RankingsBloco({ dados }: BlocoProps) {
  return (
    <section className="rel-bloco">
      <h2 className="rel-bloco-titulo">Rankings por Dimensão</h2>
      <div className="grid grid-cols-2 gap-4">
        <RankingTopN titulo="Top Revendas" rows={dados.rankings.revenda} dim="revenda" valueKey="faturamento" chartId="rk-rev" />
        <RankingTopN titulo="Top Estados" rows={dados.rankings.estado} dim="estado" valueKey="faturamento" chartId="rk-est" />
        <RankingTopN titulo="Top Obras/Projetos" rows={dados.rankings.obras} dim="obra" valueKey="faturamento" chartId="rk-obr" />

      </div>
    </section>
  );
}

// ---------- Margem e Impostos ----------
export function MargemImpostosBloco({ dados }: BlocoProps) {
  const data = dados.mensal.map((r) => {
    const f = num(r.faturamento);
    return {
      anomes: fmtAnomes(r.anomes_emissao),
      '% Imposto': f > 0 ? (num(r.impostos) / f) * 100 : 0,
      '% Devolução': f > 0 ? (num(r.devolucao) / f) * 100 : 0,
      '% Líquido': f > 0 ? (num(r.fat_liquido) / f) * 100 : 0,
    };
  });

  return (
    <section className="rel-bloco">
      <h2 className="rel-bloco-titulo">Margem e Impostos (% do Bruto)</h2>
      <div className="h-64 rel-chart" data-rel-chart="margem">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="anomes" fontSize={11} />
            <YAxis fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="% Líquido" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="% Imposto" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="% Devolução" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// ---------- Comentários IA ----------
export function ComentariosIaBloco({ comentarios, loading, error }: {
  comentarios: { destaques: string[]; alertas: string[]; recomendacoes: string[] } | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="rel-bloco">
      <h2 className="rel-bloco-titulo">Comentários Executivos (IA)</h2>
      {loading && <p className="text-sm text-muted-foreground">Gerando comentários…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {comentarios && (
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <h3 className="rel-coment-titulo text-success">Destaques</h3>
            <ul className="list-disc pl-4 space-y-1">{comentarios.destaques.map((d, i) => <li key={i}>{d}</li>)}</ul>
          </div>
          <div>
            <h3 className="rel-coment-titulo text-warning">Alertas</h3>
            <ul className="list-disc pl-4 space-y-1">{comentarios.alertas.map((d, i) => <li key={i}>{d}</li>)}</ul>
          </div>
          <div>
            <h3 className="rel-coment-titulo text-primary">Recomendações</h3>
            <ul className="list-disc pl-4 space-y-1">{comentarios.recomendacoes.map((d, i) => <li key={i}>{d}</li>)}</ul>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- Tabela Analítica ----------
export function TabelaAnaliticaBloco({ dados }: BlocoProps) {
  const rows = dados.detalhes.slice(0, 100);
  if (!rows.length) return null;
  return (
    <section className="rel-bloco">
      <h2 className="rel-bloco-titulo">Tabela Analítica (primeiros 100 registros)</h2>
      <div className="overflow-x-auto">
        <table className="rel-tabela-detalhe">
          <thead>
            <tr>
              <th>Mês</th><th>UN</th><th>Nota</th><th>Estado</th><th>Cliente</th><th>Obra</th>
              <th className="text-right">Bruto</th><th className="text-right">Imposto</th><th className="text-right">Líquido</th><th className="text-right">Devolução</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{fmtAnomes(r.anomes_emissao ?? '')}</td>
                <td>{r.unidade_negocio ?? '—'}</td>
                <td>{r.cd_nf ?? '—'}</td>
                <td>{r.cd_estado ?? '—'}</td>
                <td>{r.cd_cliente ?? '—'}</td>
                <td>{r.ds_abr_prj ?? r.cd_prj ?? '—'}</td>
                <td className="text-right tabular-nums">{formatCurrency(num(r.vl_bruto))}</td>
                <td className="text-right tabular-nums">{formatCurrency(num(r.vl_impostos))}</td>
                <td className="text-right tabular-nums">{formatCurrency(num(r.vl_liquido))}</td>
                <td className="text-right tabular-nums">{formatCurrency(num(r.vl_devolucao))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- Pareto 80/20 ----------
type ParetoDimensao = 'cliente' | 'revenda' | 'estado' | 'obra';

interface ParetoItem {
  label: string;
  valor: number;
  pct: number;
  pctAcum: number;
  isVital: boolean;
}

function calcularPareto(rows: Array<{ label: string; valor: number }>): {
  items: ParetoItem[]; total: number; vitais: number;
} {
  const filtered = rows.filter((r) => Number.isFinite(r.valor) && r.valor > 0);
  const sorted = [...filtered].sort((a, b) => b.valor - a.valor);
  const total = sorted.reduce((s, r) => s + r.valor, 0);
  let acum = 0;
  let vitalReached = false;
  const items: ParetoItem[] = sorted.map((r) => {
    const p = total > 0 ? (r.valor / total) * 100 : 0;
    acum += p;
    const isVital = !vitalReached;
    if (acum >= 80) vitalReached = true;
    return { label: r.label, valor: r.valor, pct: p, pctAcum: acum, isVital };
  });
  const vitais = items.filter((i) => i.isVital).length;
  return { items, total, vitais };
}

function agregarPorChave(rows: any[], labelKey: string, valueKey: string): Array<{ label: string; valor: number }> {
  const map = new Map<string, number>();
  for (const r of rows ?? []) {
    const k = String(r?.[labelKey] ?? '').trim();
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + num(r?.[valueKey]));
  }
  return Array.from(map.entries()).map(([label, valor]) => ({ label, valor }));
}

function formatLabel(dim: ParetoDimensao, raw: string): string {
  const v = String(raw ?? '').trim();
  if (!v) return '(sem identificação)';
  if (dim === 'cliente') return `Cliente ${v}`;
  if (dim === 'estado') return `UF ${v}`;
  if (dim === 'obra') return v;
  return v;
}

export function ParetoBloco({ dados, analiseIa }: BlocoProps & { analiseIa?: string | null }) {
  const [dim, setDim] = useState<ParetoDimensao>('cliente');

  const baseRows = useMemo(() => {
    if (dim === 'cliente') {
      const r = agregarPorChave(dados.detalhes, 'cd_cliente', 'vl_bruto');
      return r.length > 0 ? r : agregarPorChave(dados.rankings.revenda, 'revenda', 'faturamento');
    }
    if (dim === 'revenda') return agregarPorChave(dados.rankings.revenda, 'revenda', 'faturamento');
    if (dim === 'estado') return agregarPorChave(dados.rankings.estado, 'cd_estado', 'faturamento');
    return agregarPorChave(dados.rankings.obras, 'projeto', 'faturamento');
  }, [dim, dados]);

  const { items, total, vitais } = useMemo(() => calcularPareto(baseRows), [baseRows]);
  const top = items.slice(0, 20).map((it) => ({ ...it, label: formatLabel(dim, it.label) }));
  const pctVitais = items.length > 0 ? (vitais / items.length) * 100 : 0;
  const pctVitaisFat = items.slice(0, vitais).reduce((s, i) => s + i.pct, 0);
  const valorVitais = items.slice(0, vitais).reduce((s, i) => s + i.valor, 0);
  const valorCauda = total - valorVitais;
  const pctCauda = 100 - pctVitaisFat;

  const dimLabel: Record<ParetoDimensao, string> = {
    cliente: 'Clientes', revenda: 'Revendas', estado: 'Estados', obra: 'Obras',
  };
  const dimSingular: Record<ParetoDimensao, string> = {
    cliente: 'cliente', revenda: 'revenda', estado: 'estado', obra: 'obra',
  };

  // Risco de concentração
  let risco: { label: string; cls: string };
  if (pctVitaisFat >= 80 && vitais <= 5) {
    risco = { label: 'ALTO', cls: 'bg-destructive/15 text-destructive border-destructive/30' };
  } else if (pctVitaisFat >= 70) {
    risco = { label: 'MÉDIO', cls: 'bg-warning/15 text-warning border-warning/30' };
  } else {
    risco = { label: 'BAIXO', cls: 'bg-success/15 text-success border-success/30' };
  }

  if (!items.length) {
    return (
      <section className="rel-bloco">
        <h2 className="rel-bloco-titulo">Análise de Pareto 80/20</h2>
        <p className="text-sm text-muted-foreground">Sem dados suficientes para calcular o Pareto.</p>
      </section>
    );
  }

  const maxValor = top[0]?.valor ?? 1;
  const listaPrincipais = top.slice(0, Math.min(vitais, 10));

  return (
    <section className="rel-bloco">
      <h2 className="rel-bloco-titulo">Análise de Pareto 80/20 — {dimLabel[dim]}</h2>

      <div className="flex gap-1 mb-3 print:hidden">
        {(['cliente','revenda','estado','obra'] as ParetoDimensao[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDim(d)}
            className={`px-3 py-1 text-xs rounded border ${dim === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:text-foreground'}`}
          >
            {dimLabel[d]}
          </button>
        ))}
      </div>

      {/* Mini-KPIs */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="border border-border rounded-md p-2 bg-muted/30">
          <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Total de {dimLabel[dim].toLowerCase()}</div>
          <div className="text-lg font-semibold text-foreground tabular-nums">{items.length}</div>
        </div>
        <div className="border border-border rounded-md p-2 bg-primary/5">
          <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Concentração 80%</div>
          <div className="text-lg font-semibold text-primary tabular-nums">
            {vitais} <span className="text-xs text-muted-foreground font-normal">({pctVitais.toFixed(1)}%)</span>
          </div>
        </div>
        <div className="border border-border rounded-md p-2 bg-muted/30">
          <div className="text-[10px] uppercase text-muted-foreground tracking-wide">% do faturamento (vitais)</div>
          <div className="text-lg font-semibold text-foreground tabular-nums">{pctVitaisFat.toFixed(1)}%</div>
        </div>
      </div>

      <p className="text-sm text-foreground mb-2">
        <strong>{vitais}</strong> {vitais === 1 ? dimSingular[dim] : dimLabel[dim].toLowerCase()} ({pctVitais.toFixed(1)}% do total de {items.length}) concentram <strong>{pctVitaisFat.toFixed(1)}%</strong> do faturamento.
      </p>

      <div className="h-72 rel-chart" data-rel-chart="pareto">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={top} margin={{ top: 10, right: 40, left: 0, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" fontSize={10} angle={-30} textAnchor="end" interval={0} height={60} />
            <YAxis yAxisId="left" fontSize={11} tickFormatter={(v) => Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
            <YAxis yAxisId="right" orientation="right" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(value: any, name: any) => {
                if (name === '% Acumulado') return `${Number(value).toFixed(1)}%`;
                return formatCurrency(Number(value));
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="valor" name="Faturamento" fill="hsl(var(--primary))">
              {top.map((it, i) => (
                <Cell key={i} fill={it.isVital ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.5)'} />
              ))}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="pctAcum" name="% Acumulado" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} />
            <ReferenceLine yAxisId="right" y={80} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: '80%', position: 'right', fontSize: 11, fill: 'hsl(var(--destructive))' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
        {/* Coluna esquerda — Principais */}
        <div className="border border-border rounded-md p-3 bg-background">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary text-sm">Principais (Poucos Vitais)</h3>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">{vitais}</span>
          </div>
          <ul className="space-y-2">
            {listaPrincipais.map((it, i) => {
              const barPct = maxValor > 0 ? (it.valor / maxValor) * 100 : 0;
              return (
                <li key={i} className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <span className="truncate text-foreground">{it.label}</span>
                      <span className="tabular-nums text-muted-foreground shrink-0">{formatCurrency(it.valor)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary tabular-nums shrink-0">
                        {it.pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
            {vitais > listaPrincipais.length && (
              <li className="text-muted-foreground text-center pt-1">… +{vitais - listaPrincipais.length} {dimLabel[dim].toLowerCase()}</li>
            )}
          </ul>
        </div>

        {/* Coluna direita — Cauda longa + risco */}
        <div className="border border-border rounded-md p-3 bg-muted/20 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-muted-foreground text-sm">Demais (Cauda Longa)</h3>
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
              {items.length - vitais}
            </span>
          </div>

          <div>
            <div className="text-3xl font-bold text-foreground tabular-nums leading-none">
              {pctCauda.toFixed(1)}<span className="text-lg font-semibold text-muted-foreground">%</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">do faturamento total</div>
            <div className="text-sm font-medium text-foreground tabular-nums mt-1">{formatCurrency(valorCauda)}</div>
          </div>

          <div className={`flex items-center gap-2 px-2 py-1.5 rounded border ${risco.cls}`}>
            <span className="text-[10px] uppercase tracking-wide font-semibold">Risco de concentração:</span>
            <span className="text-xs font-bold">{risco.label}</span>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            Oportunidade: desenvolver {dimLabel[dim].toLowerCase()} da cauda longa para reduzir a dependência dos {vitais} principais.
          </p>
        </div>
      </div>

      {analiseIa && (
        <div className="mt-4 p-4 border-l-4 border-primary bg-primary/5 rounded-r-md">
          <p className="font-semibold text-primary mb-1.5 text-sm">Insight da IA — Concentração 80/20</p>
          <p className="text-foreground whitespace-pre-wrap text-xs leading-relaxed">{analiseIa}</p>
        </div>
      )}
    </section>

  );
}

export function buildParetoPayload(dados: RelatorioDados, dim: ParetoDimensao = 'cliente') {
  const baseRows = (() => {
    if (dim === 'cliente') {
      const r = agregarPorChave(dados.detalhes, 'cd_cliente', 'vl_bruto');
      return r.length > 0 ? r : agregarPorChave(dados.rankings.revenda, 'revenda', 'faturamento');
    }
    if (dim === 'revenda') return agregarPorChave(dados.rankings.revenda, 'revenda', 'faturamento');
    if (dim === 'estado') return agregarPorChave(dados.rankings.estado, 'cd_estado', 'faturamento');
    return agregarPorChave(dados.rankings.obras, 'projeto', 'faturamento');
  })();
  const { items, total, vitais } = calcularPareto(baseRows);
  const pctVitais = items.length > 0 ? (vitais / items.length) * 100 : 0;
  const top5 = items.slice(0, 5).reduce((s, i) => s + i.pct, 0);
  return {
    dimensao: dim,
    total_itens: items.length,
    itens_vitais: vitais,
    pct_itens_vitais: Number(pctVitais.toFixed(2)),
    pct_concentracao_top5: Number(top5.toFixed(2)),
    total_faturamento: total,
    top: items.slice(0, 20).map((i) => ({
      label: i.label,
      valor: i.valor,
      pct: Number(i.pct.toFixed(2)),
      pct_acumulado: Number(i.pctAcum.toFixed(2)),
    })),
  };
}
