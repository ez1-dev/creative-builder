import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (v: string, opt?: SelectOption) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
}

export function SelectBuscavel({ value, onChange, options, placeholder = 'Selecionar...', disabled, className, allowClear = true }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()) || o.value.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          disabled={disabled}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{selected?.label || placeholder}</span>
          <span className="ml-1 flex shrink-0 items-center gap-1">
            {allowClear && value && !disabled && (
              <X
                className="h-3 w-3 opacity-60 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onChange(''); }}
              />
            )}
            <ChevronsUpDown className="h-3 w-3 opacity-50" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar..." value={query} onValueChange={setQuery} className="text-xs" />
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">Nenhum resultado</CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.slice(0, 200).map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => { onChange(opt.value, opt); setOpen(false); setQuery(''); }}
                    className="text-xs"
                  >
                    <Check className={cn('mr-1 h-3 w-3', value === opt.value ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
