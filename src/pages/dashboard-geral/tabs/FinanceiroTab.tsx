import { Link } from 'react-router-dom';
import { Banknote, Wallet, PiggyBank, TrendingUp, Percent, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { LineChartCard } from '@/components/bi/charts/LineChartCard';
import { formatCurrency } from '@/components/bi/utils/formatters';
import { useFinanceiro } from '@/hooks/dashboardGeral/useFinanceiro';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export function FinanceiroTab({ periodo, enabled }: { periodo: Periodo; enabled: boolean }) {
  const { data, loading } = useFinanceiro(periodo, enabled);
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button asChild variant="link" size="sm"><Link to="/bi/financeiro/dre-configuravel">DRE Configurável →</Link></Button>
        <Button asChild variant="link" size="sm"><Link to="/contas-a-pagar">Contas a pagar →</Link></Button>
        <Button asChild variant="link" size="sm"><Link to="/contas-a-receber">Contas a receber →</Link></Button>
      </div>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Receita" value={data.kpis.receita} format="currency" icon={<Banknote className="h-4 w-4" />} variant="info" loading={loading} />
        <KpiCard title="Custos" value={data.kpis.custos} format="currency" icon={<Wallet className="h-4 w-4" />} variant="warning" loading={loading} />
        <KpiCard title="Despesas" value={data.kpis.despesas} format="currency" icon={<PiggyBank className="h-4 w-4" />} variant="warning" loading={loading} />
        <KpiCard title="Resultado DRE" value={data.kpis.resultado} format="currency" icon={<TrendingUp className="h-4 w-4" />} loading={loading}
          variant={data.kpis.resultado >= 0 ? 'success' : 'danger'} />
        <KpiCard title="Margem %" value={data.kpis.margem_pct} format="percent" icon={<Percent className="h-4 w-4" />} loading={loading}
          variant={data.kpis.margem_pct >= 10 ? 'success' : data.kpis.margem_pct >= 0 ? 'warning' : 'danger'} />
        <KpiCard title="A receber" value={data.kpis.a_receber} format="currency" icon={<ArrowDownRight className="h-4 w-4" />} loading={loading} variant="success" />
        <KpiCard title="A pagar" value={data.kpis.a_pagar} format="currency" icon={<ArrowUpRight className="h-4 w-4" />} loading={loading} variant="warning" />
        <KpiCard title="Inadimplência" value={data.kpis.inadimplencia} format="currency" loading={loading}
          variant={data.kpis.inadimplencia > 0 ? 'danger' : 'default'} />
      </section>
      <LineChartCard title="Resultado DRE — últimos 12 meses" data={data.series.resultado_mes} valueFormatter={formatCurrency} height={300} emptyVariant="inline" emptyMessage="Sem lançamentos de DRE no período" />
    </div>
  );
}
