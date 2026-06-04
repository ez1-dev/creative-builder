import { useId, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';

export interface MultiSelectOption { value: string; label: string }

export function MultiSelectFilter({
  label, values, onChange, options, placeholder = 'Selecione', name,
}: { label: string; values: string[]; onChange: (v: string[]) => void; options: MultiSelectOption[]; placeholder?: string; name?: string }) {
  const uid = useId();
  const fieldName = name || label.toLowerCase().replace(/\s+/g, '_');
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => {
    onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v]);
  };
  const display = values.length === 0 ? placeholder : values.length === 1 ? options.find(o => o.value === values[0])?.label || '1 selecionado' : `${values.length} selecionados`;
  return (
    <div>
      <Label htmlFor={uid} className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={uid}
            name={fieldName}
            aria-label={label}
            variant="outline"
            size="sm"
            className="h-8 w-full justify-between text-xs font-normal"
          >
            <span className="truncate">{display}</span>
            <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="max-h-64 space-y-1 overflow-auto">
            {options.map((o, i) => {
              const cbId = `${uid}-opt-${i}`;
              return (
                <label
                  key={o.value}
                  htmlFor={cbId}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-xs hover:bg-accent/40"
                >
                  <Checkbox
                    id={cbId}
                    name={`${fieldName}_${o.value}`}
                    aria-label={o.label}
                    checked={values.includes(o.value)}
                    onCheckedChange={() => toggle(o.value)}
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
