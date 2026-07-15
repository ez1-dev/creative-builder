import { Link } from 'react-router-dom';
import { Landmark, Wallet, PiggyBank, TrendingUp, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { HorizontalBarChartCard } from '@/components/bi/charts/HorizontalBarChartCard';
import { formatCurrency } from '@/components/bi/utils/formatters';
import { useContabilidade } from '@/hooks/dashboardGeral/useContabilidade';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export function ContabilidadeTab({ periodo, enabled }: { periodo: Periodo; enabled: boolean }) {
  const { data, loading } = useContabilidade(periodo, enabled);
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button asChild variant="link" size="sm"><Link to="/contabilidade/balanco-patrimonial">Balanço Patrimonial →</Link></Button>
        <Button asChild variant="link" size="sm"><Link to="/contabilidade/dre-studio">DRE Studio →</Link></Button>
      </div>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Ativo Total" value={data.kpis.ativo} format="currency" icon={<Landmark className="h-4 w-4" />} variant="info" loading={loading} />
        <KpiCard title="Passivo" value={data.kpis.passivo} format="currency" icon={<Wallet className="h-4 w-4" />} variant="warning" loading={loading} />
        <KpiCard title="Patrim. Líquido" value={data.kpis.pl} format="currency" icon={<PiggyBank className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Resultado exerc." value={data.kpis.resultado_exercicio} format="currency" icon={<TrendingUp className="h-4 w-4" />} loading={loading}
          variant={data.kpis.resultado_exercicio >= 0 ? 'success' : 'danger'} />
        <KpiCard title="Receita" value={data.kpis.receita} format="currency" loading={loading} variant="info" />
        <KpiCard title="Margem %" value={data.kpis.margem_pct} format="percent" icon={<Percent className="h-4 w-4" />} loading={loading} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChartCard title="DRE — visão consolidada" data={data.dre_top} valueFormatter={formatCurrency} height={280} />
        <Card>
          <CardHeader><CardTitle className="text-base">Balanço — grupos principais</CardTitle></CardHeader>
          <CardContent>
            {data.balanco.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {data.balanco.map((b, i) => (
                  <li key={i} className="flex justify-between py-1.5">
                    <span className="truncate">
                      <span className="mr-2 text-xs font-semibold text-muted-foreground">[{b.tipo}]</span>
                      {b.grupo}
                    </span>
                    <span className="tabular-nums">{formatCurrency(b.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
