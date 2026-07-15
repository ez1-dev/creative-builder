import { Link } from 'react-router-dom';
import { Wrench, Truck, Cog, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { HorizontalBarChartCard } from '@/components/bi/charts/HorizontalBarChartCard';
import { DonutChartCard } from '@/components/bi/charts/DonutChartCard';
import { formatCurrency, formatNumber } from '@/components/bi/utils/formatters';
import { useManutencao } from '@/hooks/dashboardGeral/useManutencao';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export function ManutencaoTab({ periodo, enabled }: { periodo: Periodo; enabled: boolean }) {
  const { data, loading } = useManutencao(periodo, enabled);
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button asChild variant="link" size="sm"><Link to="/frota">Frota →</Link></Button>
        <Button asChild variant="link" size="sm"><Link to="/manutencao-maquinas">Máquinas →</Link></Button>
      </div>
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard title="Custo total" value={data.kpis.custo_total} format="currency" icon={<Wallet className="h-4 w-4" />} variant="info" loading={loading} partial={data.status === 'parcial'} />
        <KpiCard title="Custo frota" value={data.kpis.custo_frota} format="currency" icon={<Truck className="h-4 w-4" />} loading={loading} variant="warning" />
        <KpiCard title="Registros frota" value={data.kpis.total_frota} format="quantity" icon={<Wrench className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Custo máquinas" value={data.kpis.custo_maquinas} format="currency" icon={<Cog className="h-4 w-4" />} loading={loading} variant="warning" />
        <KpiCard title="Registros máquinas" value={data.kpis.total_maquinas} format="quantity" icon={<Wrench className="h-4 w-4" />} loading={loading} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HorizontalBarChartCard title="Frota — custo por veículo" data={data.breakdowns.por_veiculo} valueFormatter={formatCurrency} height={320} emptyVariant="inline" emptyMessage="Sem registros de frota" />
        <HorizontalBarChartCard title="Máquinas — custo por máquina" data={data.breakdowns.por_maquina} valueFormatter={formatCurrency} color="hsl(var(--success))" height={320} emptyVariant="inline" emptyMessage="Sem registros de máquinas" />
        <DonutChartCard title="Frota por categoria" data={data.breakdowns.por_categoria} valueFormatter={formatCurrency} height={320} emptyVariant="inline" emptyMessage="Sem categorias no período" />
      </section>
    </div>
  );
}
