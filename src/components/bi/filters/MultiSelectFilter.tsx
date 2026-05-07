import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';

export interface MultiSelectOption { value: string; label: string }

export function MultiSelectFilter({
  label, values, onChange, options, placeholder = 'Selecione',
}: { label: string; values: string[]; onChange: (v: string[]) => void; options: MultiSelectOption[]; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => {
    onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v]);
  };
  const display = values.length === 0 ? placeholder : values.length === 1 ? options.find(o => o.value === values[0])?.label || '1 selecionado' : `${values.length} selecionados`;
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs font-normal">
            <span className="truncate">{display}</span>
            <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="max-h-64 space-y-1 overflow-auto">
            {options.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-xs hover:bg-accent/40">
                <Checkbox checked={values.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
