import { formatCurrency, formatNumber } from '@/components/bi';
import type { RelatorioDados } from '@/hooks/useRelatorioExecutivoFaturamento';
import type { BiComercialFilters } from '@/lib/bi/comercialFilters';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Cell, ReferenceLine } from 'recharts';
import { useMemo, useState } from 'react';

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

  const data = dados.mensal.map((r) => ({
    anomes: fmtAnomes(r.anomes_emissao),
    Faturamento: num(r.faturamento),
    Líquido: num(r.fat_liquido),
    Meta: metasMap.get(r.anomes_emissao) ?? null,
  }));

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
            <Line type="monotone" dataKey="Meta" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// ---------- Rankings ----------
function RankingTopN({ titulo, rows, labelKey, valueKey, chartId }: {
  titulo: string; rows: any[]; labelKey: string; valueKey: string; chartId: string;
}) {
  const top = [...rows]
    .map((r) => ({ label: String(r[labelKey] ?? '—'), value: num(r[valueKey]) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const total = top.reduce((acc, r) => acc + r.value, 0);
  return (
    <div className="rel-ranking">
      <h3 className="rel-ranking-titulo">{titulo}</h3>
      <div className="h-56 rel-chart" data-rel-chart={chartId}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" fontSize={10} tickFormatter={(v) => Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
            <YAxis type="category" dataKey="label" fontSize={10} width={75} />
            <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
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
        <RankingTopN titulo="Top Revendas" rows={dados.rankings.revenda} labelKey="revenda" valueKey="faturamento" chartId="rk-rev" />
        <RankingTopN titulo="Top Estados" rows={dados.rankings.estado} labelKey="cd_estado" valueKey="faturamento" chartId="rk-est" />
        <RankingTopN titulo="Top Obras/Projetos" rows={dados.rankings.obras} labelKey="projeto" valueKey="faturamento" chartId="rk-obr" />
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
