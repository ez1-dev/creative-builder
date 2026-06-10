export const STATUS_COLOR: Record<string, string> = {
  CONCLUIDO: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  'CONCLUÍDO': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  OK: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  INICIADO: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  EXECUTANDO: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  EM_EXECUCAO: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  ERRO: 'bg-destructive/20 text-destructive',
  SEM_DADOS: 'bg-muted text-muted-foreground',
};

export const statusLabel = (s: string | null | undefined): string => {
  const v = (s ?? '').toString().toUpperCase();
  if (!v) return '—';
  if (v === 'CONCLUIDO' || v === 'CONCLUÍDO' || v === 'OK') return 'Concluído';
  if (v === 'ERRO') return 'Erro';
  if (v === 'INICIADO') return 'Iniciado';
  if (v === 'EXECUTANDO' || v === 'EM_EXECUCAO') return 'Executando';
  if (v === 'SEM_DADOS') return 'Sem dados';
  return v;
};

export const isRunning = (s: string | null | undefined) => {
  const v = (s ?? '').toString().toUpperCase();
  return v === 'INICIADO' || v === 'EXECUTANDO' || v === 'EM_EXECUCAO';
};

const VIEWABLE_BASES: Record<string, string> = {
  VM_ORC_DRE: 'VM_ORC_DRE',
  VM_LANC_CONTABIL: 'VM_LANC_CONTABIL',
  ETL_V_BALANCO_PATRIMONIAL: 'ETL_V_BALANCO_PATRIMONIAL',
};

export const viewerBaseFor = (acao: string): string | null => VIEWABLE_BASES[acao] ?? null;
