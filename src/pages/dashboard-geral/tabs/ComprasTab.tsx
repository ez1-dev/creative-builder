import { Link } from 'react-router-dom';
import { ShoppingCart, Clock, FileText, Truck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { BarChartCard } from '@/components/bi/charts/BarChartCard';
import { HorizontalBarChartCard } from '@/components/bi/charts/HorizontalBarChartCard';
import { DonutChartCard } from '@/components/bi/charts/DonutChartCard';
import { formatCurrency } from '@/components/bi/utils/formatters';
import { useCompras } from '@/hooks/dashboardGeral/useCompras';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export function ComprasTab({ periodo, enabled }: { periodo: Periodo; enabled: boolean }) {
  const { data, loading } = useCompras(periodo, enabled);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild variant="link" size="sm"><Link to="/painel-compras">Abrir Painel de Compras →</Link></Button>
      </div>
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard title="Valor comprado" value={data.kpis.valor_comprado} format="currency" icon={<ShoppingCart className="h-4 w-4" />} variant="info" loading={loading} partial={data.status === 'parcial'} />
        <KpiCard title="Pendente OC" value={data.kpis.valor_pendente} format="currency" icon={<Clock className="h-4 w-4" />} loading={loading}
          variant={data.kpis.valor_pendente > 0 ? 'warning' : 'default'} />
        <KpiCard title="Atrasado" value={data.kpis.valor_atrasado} format="currency" icon={<AlertTriangle className="h-4 w-4" />} loading={loading}
          variant={data.kpis.valor_atrasado > 0 ? 'danger' : 'default'} />
        <KpiCard title="Total OCs" value={data.kpis.total_ocs} format="quantity" icon={<FileText className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Fornecedores" value={data.kpis.fornecedores} format="quantity" icon={<Truck className="h-4 w-4" />} loading={loading} />
      </section>
      <BarChartCard title="Compras — últimos 12 meses" data={data.series.compras_mes} valueFormatter={formatCurrency} height={280} emptyVariant="inline" emptyMessage="Sem compras no período" />
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutChartCard title="Compras por tipo de despesa" data={data.breakdowns.por_tipo} valueFormatter={formatCurrency} height={300} emptyVariant="inline" emptyMessage="Sem despesas classificadas" />
        <HorizontalBarChartCard title="Top fornecedores" data={data.breakdowns.top_fornecedores} valueFormatter={formatCurrency} height={300} emptyVariant="inline" emptyMessage="Sem fornecedores no período" />
        <HorizontalBarChartCard title="Situação das OCs" data={data.breakdowns.situacao} color="hsl(var(--warning))" height={300} emptyVariant="inline" emptyMessage="Sem OCs pendentes" />
      </section>
    </div>
  );
}
