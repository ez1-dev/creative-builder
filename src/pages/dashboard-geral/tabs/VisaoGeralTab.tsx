/**
 * Aba "Visão Geral" — resumo executivo consolidado.
 * Cada KPI/gráfico carrega independentemente do restante (loading por bloco),
 * usando componentes da Biblioteca BI.
 */
import { Link } from 'react-router-dom';
import {
  DollarSign, Target, ShoppingCart, TrendingUp, Users, Activity, Wallet,
  Sparkles, ArrowRight, Package, Factory, Landmark, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { KpiSparklineCard } from '@/components/bi/kpis/KpiSparklineCard';
import { LineChartCard } from '@/components/bi/charts/LineChartCard';
import { BarChartCard } from '@/components/bi/charts/BarChartCard';
import { HorizontalBarChartCard } from '@/components/bi/charts/HorizontalBarChartCard';
import { formatCurrency, formatPercent } from '@/components/bi/utils/formatters';
import { useDashboardGeral } from '@/hooks/useDashboardGeral';
import { useDashboardGeralInsights } from '@/hooks/useDashboardGeralInsights';
import { useFinanceiro } from '@/hooks/dashboardGeral/useFinanceiro';
import { useContabilidade } from '@/hooks/dashboardGeral/useContabilidade';
import { useEstoque } from '@/hooks/dashboardGeral/useEstoque';
import { useProducao } from '@/hooks/dashboardGeral/useProducao';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export function VisaoGeralTab({ periodo, enabled }: { periodo: Periodo; enabled: boolean }) {
  const { data, loadingByBlock } = useDashboardGeral(periodo);
  const { data: fin, loading: finL } = useFinanceiro(periodo, enabled);
  const { data: cont, loading: contL } = useContabilidade(periodo, enabled);
  const { data: est, loading: estL } = useEstoque(enabled);
  const { data: prod, loading: prodL } = useProducao(periodo, enabled);
  const { insights, loading: insightsLoading, error: insightsError, gerar } =
    useDashboardGeralInsights(data, periodo);

  // Séries para sparklines (últimos 12 pontos)
  const fatSeries = data.series.faturamento_meta.map((r) => r.valor);
  const comprasSeries = data.series.compras_mes.map((r) => r.valor);
  const turnoverSeries = data.series.turnover_mes.map((r) => r.valor);
  const headcountSeries = data.series.headcount.map((r) => r.valor);

  // Alertas críticos (chips clicáveis)
  const alertas: Array<{ label: string; variant: 'destructive' | 'default'; to?: string }> = [];
  if (est.kpis.itens_abaixo_min > 0) {
    alertas.push({ label: `${est.kpis.itens_abaixo_min} itens em ruptura`, variant: 'destructive', to: '/estoque' });
  }
  if (data.kpis.faturamento_meta_pct > 0 && data.kpis.faturamento_meta_pct < 0.8) {
    alertas.push({ label: `Meta em ${formatPercent(data.kpis.faturamento_meta_pct * 100)}`, variant: 'destructive', to: '/bi/comercial' });
  }
  if (data.kpis.absenteismo_pct > 0.05) {
    alertas.push({ label: `Absenteísmo ${formatPercent(data.kpis.absenteismo_pct * 100)}`, variant: 'destructive', to: '/rh/absenteismo' });
  }
  if (fin.kpis.inadimplencia > 0) {
    alertas.push({ label: `Inadimplência ${formatCurrency(fin.kpis.inadimplencia)}`, variant: 'destructive', to: '/financeiro' });
  }

  return (
    <div className="space-y-6">
      {/* Faixa de alertas críticos */}
      {alertas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-xs font-medium text-destructive">Alertas críticos:</span>
          {alertas.map((a, i) => (
            a.to ? (
              <Link key={i} to={a.to}>
                <Badge variant={a.variant} className="cursor-pointer hover:opacity-80">{a.label}</Badge>
              </Link>
            ) : <Badge key={i} variant={a.variant}>{a.label}</Badge>
          ))}
        </div>
      )}

      {/* Linha 1: KPIs headline com sparklines */}
      <section aria-label="Headline" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {fatSeries.length > 1 ? (
          <KpiSparklineCard
            title="Faturamento"
            value={data.kpis.faturamento_mes}
            format="currency"
            trend={data.kpis.faturamento_delta * 100}
            series={fatSeries}
            color="hsl(var(--primary))"
          />
        ) : (
          <KpiCard title="Faturamento" value={data.kpis.faturamento_mes} format="currency"
            icon={<DollarSign className="h-4 w-4" />} variant="info" loading={loadingByBlock.faturamento}
            trend={data.kpis.faturamento_delta ? { value: data.kpis.faturamento_delta * 100, label: 'vs mês ant.' } : undefined} />
        )}
        <KpiCard title="Meta atingida" value={data.kpis.faturamento_meta_pct * 100} format="percent"
          icon={<Target className="h-4 w-4" />} loading={loadingByBlock.faturamento}
          variant={data.kpis.faturamento_meta_pct >= 1 ? 'success' : data.kpis.faturamento_meta_pct >= 0.8 ? 'warning' : 'danger'} />
        <KpiCard title="Resultado DRE" value={fin.kpis.resultado} format="currency"
          icon={<TrendingUp className="h-4 w-4" />} loading={finL}
          variant={fin.kpis.resultado >= 0 ? 'success' : 'danger'}
          subtitle={fin.kpis.margem_pct ? `Margem ${formatPercent(fin.kpis.margem_pct)}` : undefined} />
        <KpiCard title="Custo folha" value={data.kpis.custo_folha} format="currency"
          icon={<Wallet className="h-4 w-4" />} loading={loadingByBlock.folha} />
      </section>

      {/* Linha 2: KPIs operacionais */}
      <section aria-label="Operacional" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Compras" value={data.kpis.compras_mes} format="currency"
          icon={<ShoppingCart className="h-4 w-4" />} loading={loadingByBlock.compras} />
        <KpiCard title="Ativo Total" value={cont.kpis.ativo} format="currency"
          icon={<Landmark className="h-4 w-4" />} loading={contL} />
        <KpiCard title="Headcount" value={data.kpis.headcount_ativo} format="quantity"
          icon={<Users className="h-4 w-4" />} loading={loadingByBlock.quadro} variant="info" />
        <KpiCard title="Turnover" value={data.kpis.turnover_pct * 100} format="percent"
          loading={loadingByBlock.turnover}
          variant={data.kpis.turnover_pct < 0.05 ? 'success' : data.kpis.turnover_pct < 0.1 ? 'warning' : 'danger'} />
        <KpiCard title="Absenteísmo" value={data.kpis.absenteismo_pct * 100} format="percent"
          icon={<Activity className="h-4 w-4" />} loading={loadingByBlock.absenteismo} />
        <KpiCard title="Rupturas" value={est.kpis.itens_abaixo_min} format="quantity"
          loading={estL}
          variant={est.kpis.itens_abaixo_min > 0 ? 'danger' : 'success'}
          subtitle={est.kpis.total_itens ? `${est.kpis.total_itens} itens` : undefined} />
      </section>

      {/* Linha 3: Séries temporais */}
      <section aria-label="Tendências" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LineChartCard title="Faturamento — 12 meses" data={data.series.faturamento_meta}
          valueFormatter={formatCurrency} height={220} emptyVariant="inline" emptyMessage="Sem faturamento no período" />
        <BarChartCard title="Compras — 12 meses" data={data.series.compras_mes}
          valueFormatter={formatCurrency} height={220} emptyVariant="inline" emptyMessage="Sem compras no período" />
        <LineChartCard title="Turnover — 12 meses" data={data.series.turnover_mes}
          valueFormatter={(v) => formatPercent(v)} height={220} emptyVariant="inline" emptyMessage="Sem dados de turnover" />
      </section>

      {/* Linha 4: Breakdowns */}
      <section aria-label="Breakdowns" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChartCard title="Top revendas — faturamento" data={data.breakdowns.faturamento_revenda}
          valueFormatter={formatCurrency} height={280} emptyVariant="inline" emptyMessage="Sem revendas no período" />
        <HorizontalBarChartCard title="Compras por tipo" data={data.breakdowns.compras_tipo}
          valueFormatter={formatCurrency} color="hsl(var(--primary))" height={280}
          emptyVariant="inline" emptyMessage="Sem breakdown de compras" />
      </section>

      {/* Insights IA */}
      <section aria-label="Insights">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Insights e alertas
            </CardTitle>
            <Button size="sm" variant="outline" onClick={gerar} disabled={insightsLoading}>
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

      {/* Ícones extras suprimidos apenas para manter o tree-shaking calmo */}
      <span className="hidden"><Factory /><Package /></span>
    </div>
  );
}
