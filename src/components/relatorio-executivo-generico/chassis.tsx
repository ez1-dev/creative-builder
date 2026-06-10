import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Cell } from 'recharts';
import '@/pages/bi/relatorio.css';

const BR = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const BRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const compact = (v: number) => Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v);

export type Accent = 'primary' | 'success' | 'warning' | 'destructive';

export interface RelatorioDocumentProps {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}

export function RelatorioDocument({ titulo, subtitulo, children }: RelatorioDocumentProps) {
  return (
    <div id="rel-doc" className="rel-doc bg-white text-slate-900 mx-auto shadow">
      <header className="rel-header">
        <div>
          <h1 className="rel-titulo">{titulo}</h1>
          {subtitulo && <p className="rel-subtitulo">{subtitulo}</p>}
        </div>
        <div className="rel-data">
          {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </header>
      {children}
      <footer className="rel-footer">
        Sapiens Control Center · {new Date().toLocaleString('pt-BR')}
      </footer>
    </div>
  );
}

export interface KpiCard {
  label: string;
  value: string;
  sub?: string | null;
  accent?: Accent;
}

export function KpisBlocoGenerico({ titulo, cards }: { titulo?: string; cards: KpiCard[] }) {
  return (
    <section className="rel-bloco">
      {titulo && <h2 className="rel-bloco-titulo">{titulo}</h2>}
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`rel-kpi rel-kpi-${c.accent ?? 'primary'}`}>
            <div className="rel-kpi-label">{c.label}</div>
            <div className="rel-kpi-value">{c.value}</div>
            {c.sub && <div className="rel-kpi-sub">{c.sub}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

export interface EvolucaoPoint {
  label: string;
  [k: string]: string | number | null;
}

export function EvolucaoBlocoGenerico({
  titulo, data, series, chartId, format = 'currency',
}: {
  titulo: string;
  data: EvolucaoPoint[];
  series: { key: string; color: string; tipo: 'bar' | 'line'; nome?: string }[];
  chartId: string;
  format?: 'currency' | 'number';
}) {
  const fmt = format === 'currency' ? BRL : (v: number) => BR(v);
  return (
    <section className="rel-bloco">
      <h2 className="rel-bloco-titulo">{titulo}</h2>
      <div className="h-72 rel-chart" data-rel-chart={chartId}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis fontSize={11} tickFormatter={compact} />
            <Tooltip formatter={(v: any) => fmt(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {series.map((s) => s.tipo === 'bar'
              ? <Bar key={s.key} dataKey={s.key} name={s.nome ?? s.key} fill={s.color} />
              : <Line key={s.key} type="monotone" dataKey={s.key} name={s.nome ?? s.key} stroke={s.color} strokeWidth={2} dot={false} />,
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export interface RankingRow { label: string; value: number; }

function truncate(s: string, max = 28) {
  if (!s) return '—';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function RankingTopN({ titulo, rows, chartId, format = 'currency' }: {
  titulo: string; rows: RankingRow[]; chartId: string; format?: 'currency' | 'number';
}) {
  const fmt = format === 'currency' ? BRL : (v: number) => BR(v);
  const top = [...rows].sort((a, b) => b.value - a.value).slice(0, 10).map((r) => ({
    label: truncate(r.label, 28), fullLabel: r.label, value: r.value,
  }));
  const total = top.reduce((a, r) => a + r.value, 0);
  return (
    <div className="rel-ranking">
      <h3 className="rel-ranking-titulo">{titulo}</h3>
      <div className="h-56 rel-chart" data-rel-chart={chartId}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ top: 5, right: 30, left: 8, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" fontSize={10} tickFormatter={compact} />
            <YAxis type="category" dataKey="label" fontSize={10} width={170} interval={0} />
            <Tooltip formatter={(v: any) => fmt(Number(v))} labelFormatter={(_, p: any) => p?.[0]?.payload?.fullLabel ?? ''} />
            <Bar dataKey="value" fill="hsl(var(--primary))">
              {top.map((_, i) => <Cell key={i} fill={`hsl(var(--primary) / ${1 - i * 0.06})`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="rel-tabela-mini">
        <thead><tr><th>#</th><th>Item</th><th className="text-right">Valor</th><th className="text-right">%</th></tr></thead>
        <tbody>
          {top.slice(0, 5).map((r, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{r.fullLabel}</td>
              <td className="text-right tabular-nums">{fmt(r.value)}</td>
              <td className="text-right tabular-nums">{total > 0 ? ((r.value / total) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RankingsBlocoGenerico({ titulo, rankings }: {
  titulo: string;
  rankings: { titulo: string; rows: RankingRow[]; chartId: string; format?: 'currency' | 'number' }[];
}) {
  return (
    <section className="rel-bloco">
      <h2 className="rel-bloco-titulo">{titulo}</h2>
      <div className="grid grid-cols-2 gap-4">
        {rankings.map((r) => <RankingTopN key={r.chartId} {...r} />)}
      </div>
    </section>
  );
}

export function ComentariosIaBlocoGenerico({ comentarios, loading, error }: {
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

export interface TabelaColuna<T> {
  header: string;
  cell: (r: T) => React.ReactNode;
  align?: 'left' | 'right';
}

export function TabelaAnaliticaGenerica<T>({ titulo, rows, colunas, limit = 100 }: {
  titulo: string; rows: T[]; colunas: TabelaColuna<T>[]; limit?: number;
}) {
  const slice = rows.slice(0, limit);
  if (!slice.length) return null;
  return (
    <section className="rel-bloco">
      <h2 className="rel-bloco-titulo">{titulo} (primeiros {limit} registros)</h2>
      <div className="overflow-x-auto">
        <table className="rel-tabela-detalhe">
          <thead>
            <tr>{colunas.map((c, i) => <th key={i} className={c.align === 'right' ? 'text-right' : ''}>{c.header}</th>)}</tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i}>
                {colunas.map((c, j) => (
                  <td key={j} className={c.align === 'right' ? 'text-right tabular-nums' : ''}>{c.cell(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
