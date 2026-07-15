import { Link } from 'react-router-dom';
import { Users, UserPlus, UserMinus, Activity, Wallet, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { LineChartCard } from '@/components/bi/charts/LineChartCard';
import { BarChartCard } from '@/components/bi/charts/BarChartCard';
import { HorizontalBarChartCard } from '@/components/bi/charts/HorizontalBarChartCard';
import { formatCurrency, formatNumber, formatPercent } from '@/components/bi/utils/formatters';
import { useRh } from '@/hooks/dashboardGeral/useRh';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export function RhTab({ periodo, enabled }: { periodo: Periodo; enabled: boolean }) {
  const { data, loading } = useRh(periodo, enabled);
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button asChild variant="link" size="sm"><Link to="/rh">Módulo RH →</Link></Button>
      </div>
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Headcount" value={data.kpis.headcount} format="quantity" icon={<Users className="h-4 w-4" />} variant="info" loading={loading} />
        <KpiCard title="Admissões" value={data.kpis.admissoes} format="quantity" icon={<UserPlus className="h-4 w-4" />} loading={loading} variant="success" />
        <KpiCard title="Demissões" value={data.kpis.demissoes} format="quantity" icon={<UserMinus className="h-4 w-4" />} loading={loading} variant="warning" />
        <KpiCard title="Turnover" value={data.kpis.turnover_pct} format="percent" icon={<TrendingDown className="h-4 w-4" />} loading={loading}
          variant={data.kpis.turnover_pct < 5 ? 'success' : data.kpis.turnover_pct < 10 ? 'warning' : 'danger'} />
        <KpiCard title="Absenteísmo" value={data.kpis.absenteismo_pct} format="percent" icon={<Activity className="h-4 w-4" />} loading={loading}
          variant={data.kpis.absenteismo_pct < 3 ? 'success' : data.kpis.absenteismo_pct < 6 ? 'warning' : 'danger'} />
        <KpiCard title="Custo folha" value={data.kpis.custo_folha} format="currency" icon={<Wallet className="h-4 w-4" />} loading={loading} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartCard title="Headcount — evolução" data={data.series.headcount} valueFormatter={formatNumber} color="hsl(var(--success))" height={260} emptyVariant="inline" emptyMessage="Sem histórico de headcount" />
        <BarChartCard title="Turnover mensal" data={data.series.turnover_mes} valueFormatter={(v) => formatPercent(v, 1)} color="hsl(var(--warning))" height={260} emptyVariant="inline" emptyMessage="Sem movimento de turnover" />
        <HorizontalBarChartCard title="Absenteísmo — motivos" data={data.breakdowns.absenteismo_motivo} valueFormatter={(v) => `${formatNumber(v)} dias`} color="hsl(var(--destructive))" height={280} emptyVariant="inline" emptyMessage="Sem faltas registradas" />
        <HorizontalBarChartCard title="Colaboradores por setor" data={data.breakdowns.setor} valueFormatter={formatNumber} height={280} emptyVariant="inline" emptyMessage="Sem colaboradores cadastrados" />
      </section>
    </div>
  );
}
