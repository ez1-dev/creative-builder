import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  /** CSV string ("a,b") */
  value: string;
  onChange: (csv: string) => void;
  placeholder?: string;
}

export function MultiSelectFilter({ label, options, value, onChange, placeholder }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => (value ? value.split(',').map(s => s.trim()).filter(Boolean) : []),
    [value],
  );

  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : [...selected, opt];
    onChange(next.join(','));
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const display = selected.length === 0
    ? (placeholder ?? 'Selecionar...')
    : selected.length <= 2
      ? selected.join(', ')
      : `${selected.length} selecionados`;

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="h-8 w-full justify-between px-2 text-xs font-normal"
          >
            <span className={cn('truncate', selected.length === 0 && 'text-muted-foreground')}>
              {display}
            </span>
            <span className="ml-1 flex items-center gap-1">
              {selected.length > 0 && (
                <X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" onClick={clear} />
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar..." className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>Sem opções.</CommandEmpty>
              <CommandGroup>
                {options.map(opt => {
                  const checked = selected.includes(opt);
                  return (
                    <CommandItem key={opt} value={opt} onSelect={() => toggle(opt)} className="text-xs">
                      <Check className={cn('mr-2 h-3.5 w-3.5', checked ? 'opacity-100' : 'opacity-0')} />
                      {opt}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
