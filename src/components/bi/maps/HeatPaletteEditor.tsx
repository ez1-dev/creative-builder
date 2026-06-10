/**
 * HeatPaletteEditor
 * Popover para editar a paleta do BrazilHeatMap: presets prontos + 5 color pickers.
 * Componente controlado — estado vive no pai.
 */
import { Palette, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HEAT_COLOR_STOPS, HEAT_PRESETS } from '@/lib/bi/mapUtils';

export interface HeatPaletteEditorProps {
  value: string[];
  onChange: (next: string[]) => void;
}

const STOP_LABELS = ['Mín', '25%', '50%', '75%', 'Máx'];

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v.toLowerCase() === b[i]?.toLowerCase());
}

export function HeatPaletteEditor({ value, onChange }: HeatPaletteEditorProps) {
  const stops = value?.length === 5 ? value : HEAT_COLOR_STOPS;

  const updateStop = (idx: number, color: string) => {
    const next = [...stops];
    next[idx] = color;
    onChange(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Editar paleta de cores"
          title="Editar paleta de cores"
        >
          <Palette className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-72 p-3 space-y-3">
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Presets
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(HEAT_PRESETS).map(([name, preset]) => {
              const active = arraysEqual(stops, preset);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange(preset)}
                  className={`group flex items-center gap-1.5 rounded border px-2 py-1.5 text-left text-[11px] transition-colors ${
                    active
                      ? 'border-primary bg-accent'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <span
                    className="h-3 w-8 rounded-sm border border-border shrink-0"
                    style={{
                      background: `linear-gradient(to right, ${preset.join(', ')})`,
                    }}
                  />
                  <span className="truncate">{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Customizar stops
          </div>
          <div className="space-y-1">
            {stops.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-8 text-[10px] tabular-nums text-muted-foreground">
                  {STOP_LABELS[i]}
                </span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => updateStop(i, e.target.value)}
                  className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                  aria-label={`Cor ${STOP_LABELS[i]}`}
                />
                <span className="text-[10px] font-mono text-muted-foreground">
                  {color.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
          <div
            className="h-3 w-full rounded border border-border"
            style={{ background: `linear-gradient(to right, ${stops.join(', ')})` }}
            aria-hidden
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => onChange(HEAT_COLOR_STOPS)}
        >
          <RotateCcw className="h-3 w-3 mr-1.5" />
          Restaurar padrão
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export default HeatPaletteEditor;
