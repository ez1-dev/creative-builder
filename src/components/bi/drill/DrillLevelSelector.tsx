import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DrillLevelOption { key: string; label: string }

export function DrillLevelSelector({
  levels, currentKey, onSelect,
}: { levels: DrillLevelOption[]; currentKey?: string; onSelect: (key: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-xs text-muted-foreground">Próximo nível:</span>
      {levels.map((lv) => (
        <Button
          key={lv.key}
          size="sm"
          variant={currentKey === lv.key ? 'default' : 'outline'}
          className={cn('h-6 px-2 text-xs')}
          onClick={() => onSelect(lv.key)}
        >
          {lv.label}
        </Button>
      ))}
    </div>
  );
}
