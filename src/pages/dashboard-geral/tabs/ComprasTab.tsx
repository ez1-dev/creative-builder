/**
 * Aba Compras — resumo executivo de OCs, atrasos e fornecedores.
 */
import { Link } from 'react-router-dom';
import { ShoppingCart, Clock, FileText, Truck, AlertTriangle, Receipt, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { KpiSparklineCard } from '@/components/bi/kpis/KpiSparklineCard';
import { BarChartCard } from '@/components/bi/charts/BarChartCard';
import { HorizontalBarChartCard } from '@/components/bi/charts/HorizontalBarChartCard';
import { DonutChartCard } from '@/components/bi/charts/DonutChartCard';
import { formatCurrency, formatPercent } from '@/components/bi/utils/formatters';
import { useCompras } from '@/hooks/dashboardGeral/useCompras';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export function ComprasTab({ periodo, enabled }: { periodo: Periodo; enabled: boolean }) {
  const { data, loading } = useCompras(periodo, enabled);
  const series = data.series.compras_mes.map((r) => r.valor);
  const pctAtraso = data.kpis.total_ocs > 0 ? (data.kpis.ocs_atrasadas / data.kpis.total_ocs) * 100 : 0;

  const alertas: Array<{ label: string; to?: string }> = [];
  if (data.kpis.valor_atrasado > 0) {
    alertas.push({ label: `${formatCurrency(data.kpis.valor_atrasado)} em atraso`, to: '/painel-compras' });
  }
  if (pctAtraso > 10) {
    alertas.push({ label: `${formatPercent(pctAtraso)} das OCs atrasadas` });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Compras — resumo</h2>
        <Button asChild variant="link" size="sm"><Link to="/painel-compras">Abrir Painel de Compras →</Link></Button>
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
          <KpiSparklineCard title="Valor comprado" value={data.kpis.valor_comprado} format="currency" series={series} color="hsl(var(--primary))" />
        ) : (
          <KpiCard title="Valor comprado" value={data.kpis.valor_comprado} format="currency"
            icon={<ShoppingCart className="h-4 w-4" />} variant="info" loading={loading} partial={data.status === 'parcial'} />
        )}
        <KpiCard title="Pendente OC" value={data.kpis.valor_pendente} format="currency"
          icon={<Clock className="h-4 w-4" />} loading={loading}
          variant={data.kpis.valor_pendente > 0 ? 'warning' : 'default'} />
        <KpiCard title="Atrasado" value={data.kpis.valor_atrasado} format="currency"
          icon={<AlertTriangle className="h-4 w-4" />} loading={loading}
          variant={data.kpis.valor_atrasado > 0 ? 'danger' : 'default'} />
        <KpiCard title="Total OCs" value={data.kpis.total_ocs} format="quantity"
          icon={<FileText className="h-4 w-4" />} loading={loading} />
      </section>

      <section aria-label="Secundários" className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard title="Fornecedores ativos" value={data.kpis.fornecedores} format="quantity"
          icon={<Truck className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Ticket médio OC" value={data.kpis.ticket_medio_oc} format="currency"
          icon={<Receipt className="h-4 w-4" />} loading={loading} />
        <KpiCard title="% OCs atrasadas" value={pctAtraso} format="percent"
          icon={<Percent className="h-4 w-4" />} loading={loading}
          variant={pctAtraso > 10 ? 'danger' : pctAtraso > 5 ? 'warning' : 'success'} />
      </section>

      <BarChartCard title="Compras — últimos 12 meses" data={data.series.compras_mes}
        valueFormatter={formatCurrency} height={260} emptyVariant="inline" emptyMessage="Sem compras no período" />

      <section aria-label="Breakdowns" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutChartCard title="Por tipo de despesa" data={data.breakdowns.por_tipo}
          valueFormatter={formatCurrency} height={260} emptyVariant="inline" emptyMessage="Sem despesas classificadas" />
        <HorizontalBarChartCard title="Top fornecedores" data={data.breakdowns.top_fornecedores}
          valueFormatter={formatCurrency} height={260} emptyVariant="inline" emptyMessage="Sem fornecedores no período" />
        <HorizontalBarChartCard title="Situação das OCs" data={data.breakdowns.situacao}
          color="hsl(var(--warning))" height={260} emptyVariant="inline" emptyMessage="Sem OCs pendentes" />
      </section>
    </div>
  );
}
