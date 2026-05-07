import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function DateRangeFilter({
  label = 'Período', startValue, endValue, onStartChange, onEndChange,
}: {
  label?: string; startValue: string; endValue: string;
  onStartChange: (v: string) => void; onEndChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input type="date" value={startValue} onChange={(e) => onStartChange(e.target.value)} className="h-8 text-xs" />
        <span className="text-xs text-muted-foreground">até</span>
        <Input type="date" value={endValue} onChange={(e) => onEndChange(e.target.value)} className="h-8 text-xs" />
      </div>
    </div>
  );
}
