import { Link } from 'react-router-dom';
import { Package, AlertTriangle, ArrowUp, Percent, CheckCircle2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { formatNumber } from '@/components/bi/utils/formatters';
import { useEstoque } from '@/hooks/dashboardGeral/useEstoque';

export function EstoqueTab({ enabled }: { enabled: boolean }) {
  const { data, loading } = useEstoque(enabled);
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button asChild variant="link" size="sm"><Link to="/estoque">Estoque →</Link></Button>
        <Button asChild variant="link" size="sm"><Link to="/estoque-min-max">Min/Máx →</Link></Button>
      </div>
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard title="Total itens" value={data.kpis.total_itens} format="quantity" icon={<Package className="h-4 w-4" />} variant="info" loading={loading} partial={data.status === 'parcial'} />
        <KpiCard title="OK" value={data.kpis.itens_ok} format="quantity" icon={<CheckCircle2 className="h-4 w-4" />} loading={loading} variant="success" />
        <KpiCard title="Abaixo do mínimo" value={data.kpis.itens_abaixo_min} format="quantity" icon={<AlertTriangle className="h-4 w-4" />} loading={loading}
          variant={data.kpis.itens_abaixo_min > 0 ? 'danger' : 'success'} />
        <KpiCard title="Acima do máximo" value={data.kpis.itens_acima_max} format="quantity" icon={<ArrowUp className="h-4 w-4" />} loading={loading}
          variant={data.kpis.itens_acima_max > 0 ? 'warning' : 'default'} />
        <KpiCard title="Sem política" value={data.kpis.sem_politica} format="quantity" icon={<HelpCircle className="h-4 w-4" />} loading={loading}
          variant={data.kpis.sem_politica > 0 ? 'warning' : 'default'} />
        <KpiCard title="Ruptura %" value={data.kpis.ruptura_pct} format="percent" icon={<Percent className="h-4 w-4" />} loading={loading}
          variant={data.kpis.ruptura_pct >= 10 ? 'danger' : data.kpis.ruptura_pct > 0 ? 'warning' : 'success'} />
      </section>
      <Card>
        <CardHeader><CardTitle className="text-base">Itens em ruptura (Top 10)</CardTitle></CardHeader>
        <CardContent>
          {data.rupturas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item abaixo do mínimo.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr><th className="text-left py-1">Código</th><th className="text-left">Descrição</th><th className="text-right">Saldo</th><th className="text-right">Mínimo</th><th className="text-right">Falta</th></tr>
              </thead>
              <tbody>
                {data.rupturas.map((r) => (
                  <tr key={r.codigo} className="border-b last:border-0">
                    <td className="py-1.5 font-mono text-xs">{r.codigo}</td>
                    <td>{r.descricao}</td>
                    <td className="text-right tabular-nums">{formatNumber(r.saldo)}</td>
                    <td className="text-right tabular-nums">{formatNumber(r.minimo)}</td>
                    <td className="text-right tabular-nums text-destructive">{formatNumber(r.minimo - r.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
