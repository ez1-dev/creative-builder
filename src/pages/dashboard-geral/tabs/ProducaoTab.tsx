import { Link } from 'react-router-dom';
import { Factory, Wrench, Clock, Layers, AlertTriangle } from 'lucide-react';
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
        <KpiCard title="OPs em carga" value={data.kpis.ops_total} format="quantity" icon={<Factory className="h-4 w-4" />} variant="info" loading={loading} partial={data.status === 'parcial'} />
        <KpiCard title="Recursos" value={data.kpis.recursos} format="quantity" icon={<Wrench className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Carga (h)" value={data.kpis.carga_horas} format="quantity" icon={<Clock className="h-4 w-4" />} loading={loading} variant="warning" />
        <KpiCard title="Linhas de operação" value={data.kpis.linhas_operacao} format="quantity" icon={<Layers className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Sem mapeamento" value={data.kpis.sem_mapeamento} format="quantity" icon={<AlertTriangle className="h-4 w-4" />} loading={loading}
          variant={data.kpis.sem_mapeamento > 0 ? 'danger' : 'success'} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChartCard title="Carga por centro (h) — Top 10" data={data.breakdowns.carga_centro} valueFormatter={formatNumber} height={320} emptyVariant="inline" emptyMessage="Sem carga por centro" />
        <DonutChartCard title="Carga por unidade de negócio (h)" data={data.breakdowns.por_unidade} valueFormatter={formatNumber} height={320} emptyVariant="inline" emptyMessage="Sem carga por unidade" />
      </section>
    </div>
  );
}
