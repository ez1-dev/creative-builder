/**
 * FaturamentoRealizadoMetaCard
 *
 * Card isolado e reutilizável que exibe APENAS Faturamento:
 *   - Realizado
 *   - Meta
 *   - Diferença
 *
 * Não depende de filtros/queries; recebe os 3 números por props. Reusa o
 * `KpiTriStackCard` para manter a mesma identidade visual dos demais blocos BI.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { KpiTriStackCard } from './KpiTriStackCard';
import type { KpiFormat } from '../utils/formatters';

export interface FaturamentoRealizadoMetaCardProps {
  realizado: number | null | undefined;
  meta: number | null | undefined;
  /** Se omitido, calcula realizado − meta. */
  diferenca?: number | null;
  title?: string;
  format?: KpiFormat;
  className?: string;
  loading?: boolean;
  /** Colore a Diferença com verde/vermelho semânticos. Default: true. */
  colorirDiferenca?: boolean;
}

export function FaturamentoRealizadoMetaCard({
  realizado,
  meta,
  diferenca,
  title = 'Faturamento',
  format = 'currency',
  className,
  loading = false,
  colorirDiferenca = true,
}: FaturamentoRealizadoMetaCardProps) {
  if (loading) {
    return (
      <Card className={cn('h-full flex flex-col p-4 gap-3', className)}>
        <Skeleton className="h-4 w-24 self-center" />
        <div className="flex-1 flex flex-col justify-around items-center gap-3 py-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 w-full">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-40" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const realizadoN = Number(realizado ?? 0);
  const metaN = Number(meta ?? 0);
  const dif = diferenca == null ? realizadoN - metaN : Number(diferenca);

  const corDif = colorirDiferenca
    ? dif >= 0
      ? 'hsl(var(--success))'
      : 'hsl(var(--destructive))'
    : undefined;

  return (
    <KpiTriStackCard
      title={title}
      className={className}
      items={[
        { label: 'Realizado', value: realizadoN, format },
        { label: 'Meta', value: metaN, format },
        { label: 'Diferença', value: dif, format, color: corDif },
      ]}
    />
  );
}

export default FaturamentoRealizadoMetaCard;
