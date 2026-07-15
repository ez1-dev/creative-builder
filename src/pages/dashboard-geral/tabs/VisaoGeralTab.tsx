/**
 * Aba "Visão Geral" — resumo consolidado com KPIs headline de cada módulo
 * + painel de insights IA (mantido do dashboard anterior).
 */
import { Link } from 'react-router-dom';
import {
  DollarSign, Target, ShoppingCart, TrendingUp, Users, Activity, Wallet, Sparkles, ArrowRight, Package, Factory, Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { LineChartCard } from '@/components/bi/charts/LineChartCard';
import { BarChartCard } from '@/components/bi/charts/BarChartCard';
import { formatCurrency } from '@/components/bi/utils/formatters';
import { useDashboardGeral } from '@/hooks/useDashboardGeral';
import { useDashboardGeralInsights } from '@/hooks/useDashboardGeralInsights';
import { useFinanceiro } from '@/hooks/dashboardGeral/useFinanceiro';
import { useContabilidade } from '@/hooks/dashboardGeral/useContabilidade';
import { useEstoque } from '@/hooks/dashboardGeral/useEstoque';
import { useProducao } from '@/hooks/dashboardGeral/useProducao';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export function VisaoGeralTab({ periodo, enabled }: { periodo: Periodo; enabled: boolean }) {
  const { data, loading } = useDashboardGeral(periodo);
  const { data: fin, loading: finL } = useFinanceiro(periodo, enabled);
  const { data: cont, loading: contL } = useContabilidade(periodo, enabled);
  const { data: est, loading: estL } = useEstoque(enabled);
  const { data: prod, loading: prodL } = useProducao(periodo, enabled);
  const { insights, loading: insightsLoading, error: insightsError, gerar } =
    useDashboardGeralInsights(data, periodo);

  return (
    <div className="space-y-6">
      {/* KPIs headline consolidados por módulo */}
      <section aria-label="KPIs consolidados" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Faturamento" value={data.kpis.faturamento_mes} format="currency" icon={<DollarSign className="h-4 w-4" />} variant="info" loading={loading}
          trend={data.kpis.faturamento_delta ? { value: data.kpis.faturamento_delta * 100, label: 'vs mês ant.' } : undefined} />
        <KpiCard title="Meta" value={data.kpis.faturamento_meta_pct * 100} format="percent" icon={<Target className="h-4 w-4" />} loading={loading}
          variant={data.kpis.faturamento_meta_pct >= 1 ? 'success' : data.kpis.faturamento_meta_pct >= 0.8 ? 'warning' : 'danger'} />
        <KpiCard title="Compras" value={data.kpis.compras_mes} format="currency" icon={<ShoppingCart className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Resultado DRE" value={fin.kpis.resultado} format="currency" icon={<TrendingUp className="h-4 w-4" />} loading={finL}
          variant={fin.kpis.resultado >= 0 ? 'success' : 'danger'} />
        <KpiCard title="Ativo Total" value={cont.kpis.ativo} format="currency" icon={<Landmark className="h-4 w-4" />} loading={contL} />
        <KpiCard title="Custo folha" value={data.kpis.custo_folha} format="currency" icon={<Wallet className="h-4 w-4" />} loading={loading} />

        <KpiCard title="Headcount" value={data.kpis.headcount_ativo} format="quantity" icon={<Users className="h-4 w-4" />} loading={loading} variant="info" />
        <KpiCard title="Turnover" value={data.kpis.turnover_pct * 100} format="percent" loading={loading}
          variant={data.kpis.turnover_pct < 0.05 ? 'success' : data.kpis.turnover_pct < 0.1 ? 'warning' : 'danger'} />
        <KpiCard title="Absenteísmo" value={data.kpis.absenteismo_pct * 100} format="percent" icon={<Activity className="h-4 w-4" />} loading={loading} />
        <KpiCard title="OPs abertas" value={prod.kpis.ops_abertas} format="quantity" icon={<Factory className="h-4 w-4" />} loading={prodL} />
        <KpiCard title="Estoque (R$)" value={est.kpis.valor_estocado} format="currency" icon={<Package className="h-4 w-4" />} loading={estL} />
        <KpiCard title="Rupturas" value={est.kpis.itens_abaixo_min} format="quantity" loading={estL}
          variant={est.kpis.itens_abaixo_min > 0 ? 'danger' : 'success'} />
      </section>

      {/* Gráficos signature */}
      <section aria-label="Tendências" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartCard title="Faturamento — 12 meses" data={data.series.faturamento_meta} valueFormatter={formatCurrency} height={240} />
        <BarChartCard title="Compras — 12 meses" data={data.series.compras_mes} valueFormatter={formatCurrency} height={240} />
      </section>

      {/* Insights IA */}
      <section aria-label="Insights">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Insights e alertas
            </CardTitle>
            <Button size="sm" variant="outline" onClick={gerar} disabled={insightsLoading || loading}>
              {insightsLoading ? 'Gerando…' : 'Gerar análise'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {insightsError && (<p className="text-sm text-destructive">Não foi possível gerar insights: {insightsError}</p>)}
            {!insights && !insightsError && (
              <p className="text-sm text-muted-foreground">
                Clique em "Gerar análise" para receber destaques automáticos baseados nos KPIs deste período.
              </p>
            )}
            {insights?.itens?.length ? (
              <ul className="space-y-2">
                {insights.itens.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 border rounded-md p-3">
                    <Badge variant={
                      it.severidade === 'critico' ? 'destructive' :
                      it.severidade === 'atencao' ? 'secondary' : 'outline'
                    } className="mt-0.5 shrink-0">
                      {it.severidade === 'critico' ? 'Crítico' : it.severidade === 'atencao' ? 'Atenção' : 'OK'}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{it.titulo}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{it.descricao}</p>
                    </div>
                    {it.rota && (
                      <Button asChild size="sm" variant="ghost">
                        <Link to={it.rota}>Ver <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            {insights?.resumo && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">{insights.resumo}</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
