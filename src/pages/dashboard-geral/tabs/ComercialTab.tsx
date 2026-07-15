import { Link } from 'react-router-dom';
import { DollarSign, Target, Receipt, TrendingUp, FileText, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { LineChartCard } from '@/components/bi/charts/LineChartCard';
import { HorizontalBarChartCard } from '@/components/bi/charts/HorizontalBarChartCard';
import { formatCurrency, formatNumber, formatPercent } from '@/components/bi/utils/formatters';
import { useComercial } from '@/hooks/dashboardGeral/useComercial';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export function ComercialTab({ periodo, enabled }: { periodo: Periodo; enabled: boolean }) {
  const { data, loading } = useComercial(periodo, enabled);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild variant="link" size="sm"><Link to="/bi/comercial">Abrir BI Comercial →</Link></Button>
      </div>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Faturamento" value={data.kpis.faturamento} format="currency" icon={<DollarSign className="h-4 w-4" />} variant="info" loading={loading}
          trend={data.kpis.delta_pct ? { value: data.kpis.delta_pct, label: 'vs mês ant.' } : undefined} />
        <KpiCard title="Meta atingida" value={data.kpis.meta_pct} format="percent" icon={<Target className="h-4 w-4" />} loading={loading}
          variant={data.kpis.meta_pct >= 100 ? 'success' : data.kpis.meta_pct >= 80 ? 'warning' : 'danger'} />
        <KpiCard title="Ticket médio" value={data.kpis.ticket_medio} format="currency" icon={<Receipt className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Notas emitidas" value={data.kpis.qtd_notas} format="quantity" icon={<FileText className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Δ Faturamento" value={data.kpis.delta_pct} format="percent" icon={<TrendingUp className="h-4 w-4" />} loading={loading}
          variant={data.kpis.delta_pct >= 0 ? 'success' : 'danger'} />
        <KpiCard title="Desconto médio" value={data.kpis.desconto_pct} format="percent" icon={<Percent className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Meta período" value={data.kpis.meta} format="currency" icon={<Target className="h-4 w-4" />} loading={loading} />
      </section>
      <LineChartCard title="Faturamento vs Meta — 12 meses" data={data.series.faturamento_meta} valueFormatter={formatCurrency} height={280} emptyVariant="inline" emptyMessage="Sem faturamento no período" />
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HorizontalBarChartCard title="Top revendas" data={data.breakdowns.revendas} valueFormatter={formatCurrency} height={300} emptyVariant="inline" emptyMessage="Sem revendas no período" />
        <HorizontalBarChartCard title="Top produtos" data={data.breakdowns.produtos} valueFormatter={formatCurrency} color="hsl(var(--success))" height={300} emptyVariant="inline" emptyMessage="Sem produtos no período" />
        <HorizontalBarChartCard title="Faturamento por UF" data={data.breakdowns.ufs} valueFormatter={formatCurrency} color="hsl(var(--warning))" height={300} emptyVariant="inline" emptyMessage="Sem dados por UF" />
      </section>
    </div>
  );
}
