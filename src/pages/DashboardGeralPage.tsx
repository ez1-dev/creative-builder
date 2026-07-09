/**
 * Dashboard Geral — visão executiva consolidada dos módulos
 * Comercial, Compras, Financeiro, Produção e RH.
 *
 * Rota: /dashboard-geral (item "Dashboard Geral" do menu).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, DollarSign, Target, Receipt, ShoppingCart, Clock,
  FileText, Truck, Users, UserMinus, Activity, Wallet, RefreshCw, Sparkles, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { LineChartCard } from '@/components/bi/charts/LineChartCard';
import { BarChartCard } from '@/components/bi/charts/BarChartCard';
import { HorizontalBarChartCard } from '@/components/bi/charts/HorizontalBarChartCard';
import { DonutChartCard } from '@/components/bi/charts/DonutChartCard';
import { formatCurrency, formatPercent, formatNumber } from '@/components/bi/utils/formatters';
import { useDashboardGeral } from '@/hooks/useDashboardGeral';
import { useDashboardGeralInsights } from '@/hooks/useDashboardGeralInsights';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

const PERIODOS: Array<{ value: Periodo; label: string }> = [
  { value: 'mes_atual', label: 'Mês atual' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: 'ytd', label: 'YTD' },
  { value: 'ult_12m', label: 'Últimos 12 meses' },
];

export default function DashboardGeralPage() {
  const [periodo, setPeriodo] = useState<Periodo>('ytd');
  const { data, loading, refetch, range } = useDashboardGeral(periodo);
  const { insights, loading: insightsLoading, error: insightsError, gerar } =
    useDashboardGeralInsights(data, periodo);

  return (
    <div className="container mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Geral</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão consolidada de Comercial, Compras, Produção, Financeiro e RH · {range.label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <TabsList>
              {PERIODOS.map((p) => (
                <TabsTrigger key={p.value} value={p.value}>{p.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <section aria-label="KPIs consolidados" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Faturamento" value={data.kpis.faturamento_mes} format="currency"
          icon={<DollarSign className="h-4 w-4" />} variant="info" loading={loading}
          trend={data.kpis.faturamento_delta ? { value: data.kpis.faturamento_delta * 100, label: 'vs mês ant.' } : undefined} />
        <KpiCard title="Meta atingida" value={data.kpis.faturamento_meta_pct * 100} format="percent"
          icon={<Target className="h-4 w-4" />} loading={loading}
          variant={data.kpis.faturamento_meta_pct >= 1 ? 'success' : data.kpis.faturamento_meta_pct >= 0.8 ? 'warning' : 'danger'} />
        <KpiCard title="Ticket médio" value={data.kpis.ticket_medio} format="currency"
          icon={<Receipt className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Δ Faturamento" value={data.kpis.faturamento_delta * 100} format="percent"
          icon={<TrendingUp className="h-4 w-4" />} loading={loading}
          variant={data.kpis.faturamento_delta >= 0 ? 'success' : 'danger'} />

        <KpiCard title="Compras" value={data.kpis.compras_mes} format="currency"
          icon={<ShoppingCart className="h-4 w-4" />} variant="info" loading={loading} />
        <KpiCard title="Pendente OC" value={data.kpis.valor_pendente} format="currency"
          icon={<Clock className="h-4 w-4" />} loading={loading}
          variant={data.kpis.valor_pendente > 0 ? 'warning' : 'default'} />
        <KpiCard title="Total OCs" value={data.kpis.total_ocs} format="quantity"
          icon={<FileText className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Fornecedores" value={data.kpis.fornecedores_ativos} format="quantity"
          icon={<Truck className="h-4 w-4" />} loading={loading} />

        <KpiCard title="Headcount ativo" value={data.kpis.headcount_ativo} format="quantity"
          icon={<Users className="h-4 w-4" />} variant="info" loading={loading} />
        <KpiCard title="Turnover" value={data.kpis.turnover_pct * 100} format="percent"
          icon={<UserMinus className="h-4 w-4" />} loading={loading}
          variant={data.kpis.turnover_pct < 0.05 ? 'success' : data.kpis.turnover_pct < 0.1 ? 'warning' : 'danger'} />
        <KpiCard title="Absenteísmo" value={data.kpis.absenteismo_pct * 100} format="percent"
          icon={<Activity className="h-4 w-4" />} loading={loading}
          variant={data.kpis.absenteismo_pct < 0.03 ? 'success' : data.kpis.absenteismo_pct < 0.06 ? 'warning' : 'danger'} />
        <KpiCard title="Custo folha" value={data.kpis.custo_folha} format="currency"
          icon={<Wallet className="h-4 w-4" />} loading={loading} />
      </section>

      {/* Gráficos de tendência */}
      <section aria-label="Tendências" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartCard title="Faturamento — últimos 12 meses"
          data={data.series.faturamento_meta}
          valueFormatter={formatCurrency}
          height={260} />
        <BarChartCard title="Compras — últimos 12 meses"
          data={data.series.compras_mes}
          valueFormatter={formatCurrency}
          height={260} />
        <LineChartCard title="Headcount — evolução"
          data={data.series.headcount}
          valueFormatter={formatNumber}
          color="hsl(var(--success))"
          height={240} />
        <BarChartCard title="Turnover mensal"
          data={data.series.turnover_mes}
          valueFormatter={(v) => formatPercent(v, 1)}
          color="hsl(var(--warning))"
          height={240} />
      </section>

      {/* Breakdowns */}
      <section aria-label="Breakdowns" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HorizontalBarChartCard title="Top revendas — faturamento"
          data={data.breakdowns.faturamento_revenda}
          valueFormatter={formatCurrency}
          height={280} />
        <DonutChartCard title="Compras por tipo de despesa"
          data={data.breakdowns.compras_tipo}
          valueFormatter={formatCurrency}
          height={280} />
        <HorizontalBarChartCard title="Absenteísmo — motivos"
          data={data.breakdowns.absenteismo_motivo}
          valueFormatter={(v) => `${formatNumber(v)} dias`}
          color="hsl(var(--destructive))"
          height={280} />
      </section>

      {/* Insights de IA */}
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
            {insightsError && (
              <p className="text-sm text-destructive">Não foi possível gerar insights: {insightsError}</p>
            )}
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
              <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
                {insights.resumo}
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
