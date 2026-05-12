import { Badge } from '@/components/ui/badge';
import type { StatusRegra } from '@/lib/senior/types';

const map: Record<StatusRegra, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: 'bg-muted text-muted-foreground border-border' },
  em_revisao: { label: 'Em revisão', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  aprovada: { label: 'Aprovada', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  rejeitada: { label: 'Rejeitada', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
  arquivada: { label: 'Arquivada', cls: 'bg-muted text-muted-foreground border-border' },
};

export function StatusRegraBadge({ value }: { value: StatusRegra }) {
  const cfg = map[value] ?? { label: String(value), cls: 'bg-muted text-muted-foreground' };
  return <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>;
}
