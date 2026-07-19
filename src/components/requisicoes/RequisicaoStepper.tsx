import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepDef {
  id: number;
  label: string;
  enabled: boolean;
}

interface Props {
  steps: StepDef[];
  current: number;
  onGo: (id: number) => void;
}

export function RequisicaoStepper({ steps, current, onGo }: Props) {
  return (
    <ol className="flex w-full items-center gap-2 rounded-lg border bg-card p-3 shadow-sm">
      {steps.map((s, idx) => {
        const done = s.id < current;
        const active = s.id === current;
        const clickable = s.enabled && !active;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2 min-w-0">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onGo(s.id)}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left min-w-0',
                clickable && 'hover:bg-muted',
                !s.enabled && !active && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  active && 'border-primary bg-primary text-primary-foreground',
                  done && 'border-emerald-500 bg-emerald-500 text-white',
                  !active && !done && 'border-muted-foreground/30 text-muted-foreground',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : s.id}
              </span>
              <span
                className={cn(
                  'truncate text-sm',
                  active && 'font-semibold text-foreground',
                  !active && 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <span
                className={cn(
                  'h-px flex-1 min-w-4',
                  s.id < current ? 'bg-emerald-500' : 'bg-border',
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
