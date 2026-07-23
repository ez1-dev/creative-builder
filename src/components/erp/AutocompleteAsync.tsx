import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { ChevronsUpDown, Check, Loader2, X, AlertTriangle } from 'lucide-react';
import { isCadastroUnavailable, type CadastroOption } from '@/hooks/useCadastrosErp';

interface AutocompleteAsyncProps {
  value: string;
  onChange: (codigo: string, option?: CadastroOption) => void;
  fetcher: (q: string) => Promise<CadastroOption[]>;
  placeholder?: string;
  className?: string;
  /** Opções de fallback (ex.: extraídas da grid atual) quando o endpoint estiver indisponível. */
  fallbackOptions?: CadastroOption[];
}

// Cache global de labels já vistos (para mostrar nome do item selecionado sem refetch).
const labelCache = new Map<string, CadastroOption>();

export function AutocompleteAsync({ value, onChange, fetcher, placeholder = 'Buscar...', className, fallbackOptions }: AutocompleteAsyncProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CadastroOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const id = ++reqIdRef.current;
      setLoading(true);
      try {
        const data = await fetcher(q);
        if (id !== reqIdRef.current) return;
        data.forEach((o) => labelCache.set(o.codigo, o));
        setResults(data);
        setUnavailable(isCadastroUnavailable(data));
      } finally {
        if (id === reqIdRef.current) setLoading(false);
      }
    }, 300);
  }, [fetcher]);

  useEffect(() => {
    if (open) runSearch(query);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [open, query, runSearch]);

  // Merge: quando endpoint estiver indisponível ou trouxer vazio sem query, usar fallback.
  const displayed = useMemo(() => {
    const useFallback = (unavailable || (results.length === 0 && !query)) && fallbackOptions && fallbackOptions.length > 0;
    const base = useFallback ? [...results, ...fallbackOptions!] : results;
    if (!query) return base.slice(0, 100);
    const qLower = query.trim().toLowerCase();
    return base.filter((o) =>
      o.codigo.toLowerCase().includes(qLower) ||
      o.descricao.toLowerCase().includes(qLower) ||
      o.label.toLowerCase().includes(qLower)
    ).slice(0, 100);
  }, [results, unavailable, fallbackOptions, query]);


  const selected = value ? labelCache.get(value) : undefined;
  const displayLabel = value ? (selected?.label || value) : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{displayLabel || placeholder}</span>
          <span className="ml-1 flex shrink-0 items-center gap-1">
            {value && (
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
          <CommandInput
            placeholder="Código ou descrição..."
            value={query}
            onValueChange={setQuery}
            className="text-xs"
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                {query ? 'Nenhum resultado' : 'Digite para buscar'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {results.slice(0, 100).map((opt) => (
                  <CommandItem
                    key={opt.codigo}
                    value={opt.codigo}
                    onSelect={() => {
                      labelCache.set(opt.codigo, opt);
                      onChange(opt.codigo, opt);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="text-xs"
                  >
                    <Check className={cn('mr-1 h-3 w-3', value === opt.codigo ? 'opacity-100' : 'opacity-0')} />
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
