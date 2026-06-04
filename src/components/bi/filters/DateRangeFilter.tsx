import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function DateRangeFilter({
  label = 'Período', startValue, endValue, onStartChange, onEndChange, name = 'periodo',
}: {
  label?: string; startValue: string; endValue: string;
  onStartChange: (v: string) => void; onEndChange: (v: string) => void;
  name?: string;
}) {
  const uid = useId();
  const startId = `${uid}-start`;
  const endId = `${uid}-end`;
  return (
    <div>
      <Label htmlFor={startId} className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          id={startId}
          name={`${name}_inicio`}
          aria-label={`${label} - início`}
          type="date"
          value={startValue}
          onChange={(e) => onStartChange(e.target.value)}
          className="h-8 text-xs"
        />
        <span className="text-xs text-muted-foreground">até</span>
        <Input
          id={endId}
          name={`${name}_fim`}
          aria-label={`${label} - fim`}
          type="date"
          value={endValue}
          onChange={(e) => onEndChange(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}
