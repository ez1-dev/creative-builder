import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Activity, AlertTriangle, Clock, Gauge, Layers, ListChecks, Slash, type LucideIcon } from 'lucide-react';

type Accent = 'primary' | 'warn' | 'critical' | 'success' | 'muted';

const accentText: Record<Accent, string> = {
  primary: 'text-primary',
  warn: 'text-amber-600 dark:text-amber-500',
  critical: 'text-destructive',
  success: 'text-emerald-600 dark:text-emerald-500',
  muted: 'text-muted-foreground',
};
const accentBg: Record<Accent, string> = {
  primary: 'bg-primary/10',
  warn: 'bg-amber-500/10',
  critical: 'bg-destructive/10',
  success: 'bg-emerald-500/10',
  muted: 'bg-muted',
};

interface KpiItem {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent: Accent;
}

interface Props {
  opsNaFila: number;
  tempoPrevistoHoras: number;
  tempoProgramadoHoras: number;
  capacidadeDisponivelHoras: number;
  ocupacaoMediaPerc: number;
  qtdGargalos: number;
  recursosSemCapacidade: number;
  loading?: boolean;
}

const fmtNum = (n: number) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fmtDec = (n: number) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export function ProgramacaoKpis(props: Props) {
  const items: KpiItem[] = [
    { label: 'OPs na fila', value: fmtNum(props.opsNaFila), icon: ListChecks, accent: 'primary' },
    { label: 'Tempo previsto (h)', value: fmtDec(props.tempoPrevistoHoras), icon: Clock, accent: 'muted' },
    { label: 'Tempo programado (h)', value: fmtDec(props.tempoProgramadoHoras), icon: Layers, accent: 'primary' },
    { label: 'Capacidade disponível (h)', value: fmtDec(props.capacidadeDisponivelHoras), icon: Gauge, accent: 'success' },
    {
      label: 'Ocupação média',
      value: `${fmtDec(props.ocupacaoMediaPerc)}%`,
      icon: Activity,
      accent: props.ocupacaoMediaPerc > 100 ? 'critical' : props.ocupacaoMediaPerc >= 80 ? 'warn' : 'success',
    },
    {
      label: 'Gargalos',
      value: fmtNum(props.qtdGargalos),
      icon: AlertTriangle,
      accent: props.qtdGargalos > 0 ? 'critical' : 'success',
    },
    {
      label: 'Sem capacidade',
      value: fmtNum(props.recursosSemCapacidade),
      icon: Slash,
      accent: props.recursosSemCapacidade > 0 ? 'warn' : 'muted',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Card key={it.label} className="p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', accentBg[it.accent])}>
                <Icon className={cn('h-4 w-4', accentText[it.accent])} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{it.label}</div>
                <div className={cn('text-lg font-semibold leading-tight', accentText[it.accent])}>
                  {props.loading ? '—' : it.value}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
