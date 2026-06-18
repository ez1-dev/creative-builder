import { TrendingUp, TrendingDown, Banknote, Wallet, PiggyBank, Percent } from 'lucide-react';
import { KpiGrid, KpiCard } from '@/components/bi';
import type { DreRealizadoTotais } from '@/lib/bi/dreConfiguravelTypes';

export function DreResumoCards({ totais, loading }: { totais: DreRealizadoTotais; loading?: boolean }) {
  const resultadoVariant = totais.resultado_dre >= 0 ? 'success' : 'danger';
  return (
    <KpiGrid cols={5}>
      <KpiCard title="Receita Operacional" value={totais.receita_operacional} format="currency" icon={<Banknote className="h-4 w-4" />} variant="info" loading={loading} />
      <KpiCard title="Custos" value={totais.custos} format="currency" icon={<Wallet className="h-4 w-4" />} variant="warning" loading={loading} />
      <KpiCard title="Despesas" value={totais.despesas} format="currency" icon={<PiggyBank className="h-4 w-4" />} variant="warning" loading={loading} />
      <KpiCard title="Resultado DRE" value={totais.resultado_dre} format="currency" icon={totais.resultado_dre >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} variant={resultadoVariant} loading={loading} />
      <KpiCard title="Margem %" value={totais.margem_pct} format="percent" icon={<Percent className="h-4 w-4" />} variant="default" loading={loading} />
    </KpiGrid>
  );
}
