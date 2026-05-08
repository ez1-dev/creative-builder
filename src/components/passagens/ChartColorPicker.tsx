/**
 * Seletor de cor para gráficos: presets baseados em tokens semânticos
 * do design system + color picker livre. O valor é a string CSS final
 * (ex.: "hsl(var(--primary))" ou "#3b82f6").
 */
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const DEFAULT_CHART_COLOR = 'hsl(var(--primary))';

const PRESETS: { label: string; value: string }[] = [
  { label: 'Padrão', value: 'hsl(var(--primary))' },
  { label: 'Sucesso', value: 'hsl(var(--success))' },
  { label: 'Aviso', value: 'hsl(var(--warning))' },
  { label: 'Destaque', value: 'hsl(var(--destructive))' },
  { label: 'Acento', value: 'hsl(var(--accent))' },
  { label: 'Suave', value: 'hsl(var(--muted-foreground))' },
];

interface Props {
  value?: string;
  onChange: (v: string) => void;
}

export function ChartColorPicker({ value, onChange }: Props) {
  const current = value || DEFAULT_CHART_COLOR;
  const isCustomHex = /^#[0-9a-f]{3,8}$/i.test(current);

  return (
    <div className="space-y-2">
      <Label className="text-xs">Cor</Label>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = current === p.value;
          return (
            <Button
              key={p.value}
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                'h-7 gap-1.5 px-2 text-xs',
                active && 'ring-2 ring-ring ring-offset-1',
              )}
              onClick={() => onChange(p.value)}
              title={p.label}
            >
              <span
                className="h-3 w-3 rounded-sm border border-border"
                style={{ backgroundColor: p.value }}
              />
              {p.label}
            </Button>
          );
        })}
        <div className="flex items-center gap-1.5">
          <Input
            type="color"
            value={isCustomHex ? current : '#3b82f6'}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'h-7 w-10 cursor-pointer p-0.5',
              isCustomHex && 'ring-2 ring-ring ring-offset-1',
            )}
            title="Cor personalizada"
          />
        </div>
      </div>
    </div>
  );
}
