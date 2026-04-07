import { useState, useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { ChevronsUpDown, Check, Loader2 } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  loading?: boolean;
  className?: string;
}

export function ComboboxFilter({ value, onChange, options, placeholder = 'Selecione...', loading = false, className }: ComboboxFilterProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filtered = options.filter(
    (o) => o.label.toLowerCase().includes(inputValue.toLowerCase()) || o.value.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setInputValue(selectedValue);
    setOpen(false);
  };

  const handleInputChange = (search: string) => {
    setInputValue(search);
    onChange(search);
  };

  const displayLabel = value
    ? options.find((o) => o.value === value)?.label || value
    : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{displayLabel || placeholder}</span>
          {loading ? (
            <Loader2 className="ml-1 h-3 w-3 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder={placeholder}
            value={inputValue}
            onValueChange={handleInputChange}
            className="text-xs"
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                {inputValue ? `Usar "${inputValue}"` : 'Nenhum resultado'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.slice(0, 50).map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="text-xs"
                  >
                    <Check className={cn('mr-1 h-3 w-3', value === option.value ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">
                      {option.value !== option.label ? `${option.value} - ${option.label}` : option.label}
                    </span>
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
