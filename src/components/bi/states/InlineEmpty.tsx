import { CircleDashed } from 'lucide-react';

/**
 * Placeholder compacto para uso dentro de cards de gráfico quando não há
 * dados no período. Ao contrário do `NoDataState`, NÃO reserva a altura
 * total do card — mantém o card visível sem "sequestrar" a tela.
 */
export function InlineEmpty({
  message = 'Sem dados neste período',
  height = 80,
}: {
  message?: string;
  height?: number;
}) {
  return (
    <div
      className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
      style={{ minHeight: height }}
      role="status"
      aria-live="polite"
    >
      <CircleDashed className="h-3.5 w-3.5 opacity-60" />
      <span>{message}</span>
    </div>
  );
}
