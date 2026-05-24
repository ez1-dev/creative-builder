import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function UnidadeNegocioBadge({ value }: { value?: string | null }) {
  const v = (value || 'NAO_CLASSIFICADO').toUpperCase();
  const styles: Record<string, string> = {
    GENIUS: 'bg-primary/15 text-primary border-primary/30',
    ESTRUTURAL: 'bg-secondary text-secondary-foreground border-border',
    APOIO: 'bg-accent text-accent-foreground border-border',
    NAO_CLASSIFICADO: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', styles[v] ?? styles.NAO_CLASSIFICADO)}>
      {v}
    </Badge>
  );
}

export function OrigemMapeamentoBadge({ value }: { value?: string | null }) {
  const v = (value || 'PADRAO_API').toUpperCase();
  if (v === 'SUPABASE') {
    return <Badge className="text-xs bg-accent text-accent-foreground border-border" variant="outline">SUPABASE</Badge>;
  }
  if (v === 'REGRA_API') {
    return <Badge className="text-xs bg-primary/15 text-primary border-primary/30" variant="outline">REGRA_API</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">PADRAO_API</Badge>;
}

export function TipoRecursoBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  return <Badge variant="outline" className="text-xs">{value}</Badge>;
}
