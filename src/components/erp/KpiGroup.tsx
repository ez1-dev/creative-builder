import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'volume' | 'saude' | 'carga';

interface KpiGroupProps {
  title: string;
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const toneStyles: Record<Tone, { dot: string; label: string }> = {
  volume: { dot: 'bg-primary', label: 'text-primary' },
  saude: { dot: 'bg-[hsl(var(--warning))]', label: 'text-[hsl(var(--warning))]' },
  carga: { dot: 'bg-destructive', label: 'text-destructive' },
};

/**
 * Agrupador visual de KPIs por tema (Volume / Saúde dos dados / Carga horária).
 * Apenas decorativo — não altera a lógica dos KPIs internos.
 */
export function KpiGroup({ title, tone = 'volume', icon, children, className }: KpiGroupProps) {
  const t = toneStyles[tone];
  return (
    <section className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} aria-hidden />
        <span className={cn('text-[11px] font-semibold uppercase tracking-wider', t.label)}>
          {title}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <div className="ml-2 h-px flex-1 bg-border/60" aria-hidden />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-3">
        {children}
      </div>
    </section>
  );
}
