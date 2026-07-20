/**
 * Aba Financeiro — resumo executivo de DRE, contas a pagar/receber.
 */
import { Link } from 'react-router-dom';
import { Banknote, Wallet, PiggyBank, TrendingUp, Percent, ArrowDownRight, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { KpiSparklineCard } from '@/components/bi/kpis/KpiSparklineCard';
import { LineChartCard } from '@/components/bi/charts/LineChartCard';
import { HorizontalBarChartCard } from '@/components/bi/charts/HorizontalBarChartCard';
import { formatCurrency, formatPercent } from '@/components/bi/utils/formatters';
import { useFinanceiro } from '@/hooks/dashboardGeral/useFinanceiro';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export function FinanceiroTab({ periodo, enabled }: { periodo: Periodo; enabled: boolean }) {
  const { data, loading } = useFinanceiro(periodo, enabled);
  const series = data.series.resultado_mes.map((r) => r.valor);

  const alertas: Array<{ label: string; to?: string }> = [];
  if (data.kpis.resultado < 0) {
    alertas.push({ label: `Resultado negativo ${formatCurrency(data.kpis.resultado)}`, to: '/bi/financeiro/dre-configuravel' });
  }
  if (data.kpis.margem_pct < 0) {
    alertas.push({ label: `Margem ${formatPercent(data.kpis.margem_pct)}` });
  }
  if (data.kpis.inadimplencia > 0) {
    alertas.push({ label: `Inadimplência ${formatCurrency(data.kpis.inadimplencia)}`, to: '/contas-a-receber' });
  }

  const fluxoOrcamento = [
    { label: 'Receita', valor: data.kpis.receita },
    { label: 'Custos', valor: data.kpis.custos },
    { label: 'Despesas', valor: data.kpis.despesas },
  ];
  const fluxoCaixa = [
    { label: 'A receber', valor: data.kpis.a_receber },
    { label: 'A pagar', valor: data.kpis.a_pagar },
    { label: 'Inadimplência', valor: data.kpis.inadimplencia },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">Financeiro — resumo</h2>
        <div className="flex items-center gap-2">
          <Button asChild variant="link" size="sm"><Link to="/bi/financeiro/dre-configuravel">DRE Configurável →</Link></Button>
          <Button asChild variant="link" size="sm"><Link to="/contas-a-pagar">Contas a pagar →</Link></Button>
          <Button asChild variant="link" size="sm"><Link to="/contas-a-receber">Contas a receber →</Link></Button>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-xs font-medium text-destructive">Alertas:</span>
          {alertas.map((a, i) => a.to ? (
            <Link key={i} to={a.to}><Badge variant="destructive" className="cursor-pointer hover:opacity-80">{a.label}</Badge></Link>
          ) : <Badge key={i} variant="destructive">{a.label}</Badge>)}
        </div>
      )}

      <section aria-label="Headline" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {series.length > 1 ? (
          <KpiSparklineCard title="Resultado DRE" value={data.kpis.resultado} format="currency"
            series={series} color={data.kpis.resultado >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
        ) : (
          <KpiCard title="Resultado DRE" value={data.kpis.resultado} format="currency"
            icon={<TrendingUp className="h-4 w-4" />} loading={loading}
            variant={data.kpis.resultado >= 0 ? 'success' : 'danger'} />
        )}
        <KpiCard title="Margem %" value={data.kpis.margem_pct} format="percent"
          icon={<Percent className="h-4 w-4" />} loading={loading}
          variant={data.kpis.margem_pct >= 10 ? 'success' : data.kpis.margem_pct >= 0 ? 'warning' : 'danger'} />
        <KpiCard title="Receita" value={data.kpis.receita} format="currency"
          icon={<Banknote className="h-4 w-4" />} variant="info" loading={loading} partial={data.status === 'parcial'} />
        <KpiCard title="A receber" value={data.kpis.a_receber} format="currency"
          icon={<ArrowDownRight className="h-4 w-4" />} loading={loading} variant="success" />
      </section>

      <section aria-label="Secundários" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Custos" value={data.kpis.custos} format="currency"
          icon={<Wallet className="h-4 w-4" />} variant="warning" loading={loading} />
        <KpiCard title="Despesas" value={data.kpis.despesas} format="currency"
          icon={<PiggyBank className="h-4 w-4" />} variant="warning" loading={loading} />
        <KpiCard title="A pagar" value={data.kpis.a_pagar} format="currency"
          icon={<ArrowUpRight className="h-4 w-4" />} loading={loading} variant="warning" />
        <KpiCard title="Inadimplência" value={data.kpis.inadimplencia} format="currency" loading={loading}
          variant={data.kpis.inadimplencia > 0 ? 'danger' : 'default'} />
      </section>

      <LineChartCard title="Resultado DRE — últimos 12 meses" data={data.series.resultado_mes}
        valueFormatter={formatCurrency} height={260} emptyVariant="inline" emptyMessage="Sem lançamentos de DRE no período" />

      <section aria-label="Fluxo" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChartCard title="Composição do resultado" data={fluxoOrcamento}
          valueFormatter={formatCurrency} height={220} emptyVariant="inline" emptyMessage="Sem dados do período" />
        <HorizontalBarChartCard title="Posição de caixa" data={fluxoCaixa}
          valueFormatter={formatCurrency} color="hsl(var(--warning))" height={220}
          emptyVariant="inline" emptyMessage="Sem dados de contas" />
      </section>
    </div>
  );
}
