import { Badge } from '@/components/ui/badge';
import type { StatusRegra } from '@/lib/senior/types';

const map: Record<StatusRegra, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: 'bg-muted text-muted-foreground border-border' },
  em_revisao: { label: 'Em revisão', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  aprovada: { label: 'Aprovada', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30' },
  rejeitada: { label: 'Rejeitada', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
  exportada: { label: 'Exportada', cls: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30' },
  compilada_homologacao: { label: 'Compilada (homol.)', cls: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30' },
  testada_homologacao: { label: 'Testada (homol.)', cls: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' },
  publicada_producao: { label: 'Publicada (prod.)', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30' },
  ativa: { label: 'Ativa', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  inativa: { label: 'Inativa', cls: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30' },
  arquivada: { label: 'Arquivada', cls: 'bg-muted text-muted-foreground border-border' },
  // valores ERP (E098REG.SITREG)
  ATIVA: { label: 'Ativa (ERP)', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  INATIVA: { label: 'Inativa (ERP)', cls: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30' },
  TESTE_X: { label: 'Teste X (ERP)', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  OUTRA: { label: 'Outra', cls: 'bg-muted text-muted-foreground border-border' },
};

const PORTAL_STATUS: StatusRegra[] = [
  'rascunho','em_revisao','aprovada','rejeitada','exportada',
  'compilada_homologacao','testada_homologacao','publicada_producao',
  'ativa','inativa','arquivada',
];

export function StatusRegraBadge({ value }: { value: StatusRegra }) {
  const cfg = map[value] ?? { label: String(value), cls: 'bg-muted text-muted-foreground' };
  return <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>;
}

export const STATUS_REGRA_OPTS: { value: StatusRegra; label: string }[] =
  PORTAL_STATUS.map((value) => ({ value, label: map[value].label }));
