import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface SelectOption { value: string; label: string }

export function SelectFilter({
  label, value, onChange, options, placeholder = 'Selecione', name,
}: { label: string; value: string; onChange: (v: string) => void; options: SelectOption[]; placeholder?: string; name?: string }) {
  const uid = useId();
  const fieldName = name || label.toLowerCase().replace(/\s+/g, '_');
  return (
    <div>
      <Label htmlFor={uid} className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={uid} name={fieldName} aria-label={label} className="h-8 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
