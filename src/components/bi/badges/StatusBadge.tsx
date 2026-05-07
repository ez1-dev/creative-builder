import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type BiStatus =
  | 'recebido' | 'pendente' | 'parcial' | 'cancelado' | 'atraso'
  | 'sem-nf' | 'com-nf' | 'sem-oc' | 'com-oc'
  | 'positivo' | 'negativo' | 'neutro';

const MAP: Record<BiStatus, { label: string; cls: string }> = {
  recebido:  { label: 'Recebido',   cls: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]' },
  pendente:  { label: 'Pendente',   cls: 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning))]' },
  parcial:   { label: 'Parcial',    cls: 'border border-[hsl(var(--warning))] text-[hsl(var(--warning))] bg-transparent' },
  cancelado: { label: 'Cancelado',  cls: 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]' },
  atraso:    { label: 'Em atraso',  cls: 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]' },
  'sem-nf':  { label: 'Sem NF',     cls: 'border border-[hsl(var(--warning))] text-[hsl(var(--warning))] bg-transparent' },
  'com-nf':  { label: 'Com NF',     cls: 'border border-[hsl(var(--success))] text-[hsl(var(--success))] bg-transparent' },
  'sem-oc':  { label: 'Sem OC',     cls: 'border border-[hsl(var(--warning))] text-[hsl(var(--warning))] bg-transparent' },
  'com-oc':  { label: 'Com OC',     cls: 'border border-[hsl(var(--success))] text-[hsl(var(--success))] bg-transparent' },
  positivo:  { label: 'Positivo',   cls: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]' },
  negativo:  { label: 'Negativo',   cls: 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]' },
  neutro:    { label: 'Neutro',     cls: 'bg-muted text-muted-foreground' },
};

export function StatusBadge({ status, label, className }: { status: BiStatus; label?: string; className?: string }) {
  const cfg = MAP[status];
  return <Badge className={cn(cfg.cls, className)}>{label ?? cfg.label}</Badge>;
}
