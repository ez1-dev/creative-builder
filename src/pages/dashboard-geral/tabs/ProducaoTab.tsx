import { Link } from 'react-router-dom';
import { Factory, AlertTriangle, Clock, CheckCircle2, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { HorizontalBarChartCard } from '@/components/bi/charts/HorizontalBarChartCard';
import { DonutChartCard } from '@/components/bi/charts/DonutChartCard';
import { formatNumber } from '@/components/bi/utils/formatters';
import { useProducao } from '@/hooks/dashboardGeral/useProducao';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export function ProducaoTab({ periodo, enabled }: { periodo: Periodo; enabled: boolean }) {
  const { data, loading } = useProducao(periodo, enabled);
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button asChild variant="link" size="sm"><Link to="/producao/dashboard">Dashboard Produção →</Link></Button>
        <Button asChild variant="link" size="sm"><Link to="/producao/carga">Carga →</Link></Button>
      </div>
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard title="OPs abertas" value={data.kpis.ops_abertas} format="quantity" icon={<Factory className="h-4 w-4" />} variant="info" loading={loading} />
        <KpiCard title="OPs atrasadas" value={data.kpis.ops_atrasadas} format="quantity" icon={<AlertTriangle className="h-4 w-4" />} loading={loading}
          variant={data.kpis.ops_atrasadas > 0 ? 'danger' : 'success'} />
        <KpiCard title="Carga (h)" value={data.kpis.carga_horas} format="quantity" icon={<Clock className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Lead time médio" value={data.kpis.lead_time_medio} format="quantity" icon={<Timer className="h-4 w-4" />} loading={loading} />
        <KpiCard title="% no prazo" value={data.kpis.pct_no_prazo} format="percent" icon={<CheckCircle2 className="h-4 w-4" />} loading={loading}
          variant={data.kpis.pct_no_prazo >= 90 ? 'success' : data.kpis.pct_no_prazo >= 70 ? 'warning' : 'danger'} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChartCard title="Carga por centro de recurso (h)" data={data.breakdowns.carga_centro} valueFormatter={formatNumber} height={320} />
        <DonutChartCard title="OPs por status" data={data.breakdowns.status_ops} valueFormatter={formatNumber} height={320} />
      </section>
    </div>
  );
}
