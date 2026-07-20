/**
 * Aba Comercial — resumo executivo do faturamento vs meta.
 */
import { Link } from 'react-router-dom';
import { DollarSign, Target, Receipt, TrendingUp, FileText, Percent, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { KpiSparklineCard } from '@/components/bi/kpis/KpiSparklineCard';
import { LineChartCard } from '@/components/bi/charts/LineChartCard';
import { HorizontalBarChartCard } from '@/components/bi/charts/HorizontalBarChartCard';
import { formatCurrency, formatPercent } from '@/components/bi/utils/formatters';
import { useComercial } from '@/hooks/dashboardGeral/useComercial';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export function ComercialTab({ periodo, enabled }: { periodo: Periodo; enabled: boolean }) {
  const { data, loading } = useComercial(periodo, enabled);
  const series = data.series.faturamento_meta.map((r) => r.valor);

  const alertas: Array<{ label: string; to?: string }> = [];
  if (data.kpis.meta > 0 && data.kpis.meta_pct < 80) {
    alertas.push({ label: `Meta em ${formatPercent(data.kpis.meta_pct)}`, to: '/bi/comercial' });
  }
  if (data.kpis.desconto_pct > 5) {
    alertas.push({ label: `Desconto médio ${formatPercent(data.kpis.desconto_pct)}` });
  }
  if (data.kpis.delta_pct < 0) {
    alertas.push({ label: `Queda de ${formatPercent(Math.abs(data.kpis.delta_pct))} vs mês ant.` });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Comercial — resumo</h2>
        <Button asChild variant="link" size="sm"><Link to="/bi/comercial">Abrir BI Comercial →</Link></Button>
      </div>

      {alertas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-xs font-medium text-destructive">Alertas:</span>
          {alertas.map((a, i) => a.to ? (
            <Link key={i} to={a.to}><Badge variant="destructive" className="cursor-pointer hover:opacity-80">{a.label}</Badge></Link>
          ) : <Badge key={i} variant="destructive">{a.label}</Badge>)}
        </div>
      )}

      <section aria-label="Headline" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {series.length > 1 ? (
          <KpiSparklineCard title="Faturamento" value={data.kpis.faturamento} format="currency"
            trend={data.kpis.delta_pct} series={series} color="hsl(var(--primary))" />
        ) : (
          <KpiCard title="Faturamento" value={data.kpis.faturamento} format="currency"
            icon={<DollarSign className="h-4 w-4" />} variant="info" loading={loading} partial={data.status === 'parcial'}
            trend={data.kpis.delta_pct ? { value: data.kpis.delta_pct, label: 'vs mês ant.' } : undefined} />
        )}
        <KpiCard title="Meta atingida" value={data.kpis.meta_pct} format="percent"
          icon={<Target className="h-4 w-4" />} loading={loading}
          variant={data.kpis.meta_pct >= 100 ? 'success' : data.kpis.meta_pct >= 80 ? 'warning' : 'danger'} />
        <KpiCard title="Ticket médio" value={data.kpis.ticket_medio} format="currency"
          icon={<Receipt className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Δ vs mês anterior" value={data.kpis.delta_pct} format="percent"
          icon={<TrendingUp className="h-4 w-4" />} loading={loading}
          variant={data.kpis.delta_pct >= 0 ? 'success' : 'danger'} />
      </section>

      <section aria-label="Secundários" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Notas emitidas" value={data.kpis.qtd_notas} format="quantity"
          icon={<FileText className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Desconto médio" value={data.kpis.desconto_pct} format="percent"
          icon={<Percent className="h-4 w-4" />} loading={loading}
          variant={data.kpis.desconto_pct > 5 ? 'warning' : 'default'} />
        <KpiCard title="Meta do período" value={data.kpis.meta} format="currency"
          icon={<Target className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Faturamento acumulado" value={data.kpis.faturamento} format="currency"
          icon={<DollarSign className="h-4 w-4" />} loading={loading} />
      </section>

      <LineChartCard title="Faturamento vs Meta — 12 meses" data={data.series.faturamento_meta}
        valueFormatter={formatCurrency} height={260} emptyVariant="inline" emptyMessage="Sem faturamento no período" />

      <section aria-label="Breakdowns" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HorizontalBarChartCard title="Top revendas" data={data.breakdowns.revendas}
          valueFormatter={formatCurrency} height={260} emptyVariant="inline" emptyMessage="Sem revendas no período" />
        <HorizontalBarChartCard title="Top produtos" data={data.breakdowns.produtos}
          valueFormatter={formatCurrency} color="hsl(var(--success))" height={260}
          emptyVariant="inline" emptyMessage="Sem produtos no período" />
        <HorizontalBarChartCard title="Faturamento por UF" data={data.breakdowns.ufs}
          valueFormatter={formatCurrency} color="hsl(var(--warning))" height={260}
          emptyVariant="inline" emptyMessage="Sem dados por UF" />
      </section>
    </div>
  );
}
