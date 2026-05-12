import { Badge } from '@/components/ui/badge';
import type { SituacaoIdentificador } from '@/lib/senior/types';

const map: Record<SituacaoIdentificador, { label: string; cls: string }> = {
  A: { label: 'Ativo', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  I: { label: 'Inativo', cls: 'bg-muted text-muted-foreground border-border' },
  X: { label: 'Teste', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
};

export function SituacaoBadge({ value }: { value: SituacaoIdentificador }) {
  const cfg = map[value] ?? { label: String(value), cls: 'bg-muted text-muted-foreground' };
  return <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>;
}
