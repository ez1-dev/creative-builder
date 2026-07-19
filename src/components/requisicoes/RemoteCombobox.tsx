import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check, Loader2, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EndpointIndisponivelError } from '@/services/requisicoesApi';

interface Props<T> {
  value: T | null;
  onSelect: (item: T | null) => void;
  fetcher: (q: string) => Promise<T[]>;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  renderItem?: (item: T, query: string) => ReactNode;
  placeholder?: string;
  minChars?: number;
  debounceMs?: number;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  errorMessage?: string;
  unavailableMessage?: string;
  popoverWidth?: number;
}

type State = 'idle' | 'typing' | 'loading' | 'ready' | 'empty' | 'error' | 'unavailable';

function highlight(text: string, q: string): ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-primary/20 px-0.5 text-foreground">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export function RemoteCombobox<T>({
  value,
  onSelect,
  fetcher,
  getKey,
  getLabel,
  renderItem,
  placeholder = 'Buscar…',
  minChars = 2,
  debounceMs = 350,
  disabled,
  className,
  emptyMessage = 'Nenhum resultado encontrado',
  errorMessage = 'Não foi possível consultar a API',
  unavailableMessage,
  popoverWidth = 380,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [state, setState] = useState<State>('idle');
  const [unavailableText, setUnavailableText] = useState<string | undefined>();
  const debRef = useRef<number | null>(null);
  const reqRef = useRef(0);

  const runSearch = useCallback((raw: string) => {
    const q = raw.trim();
    if (debRef.current) window.clearTimeout(debRef.current);
    if (q.length < minChars) {
      setResults([]);
      setState('typing');
      return;
    }
    debRef.current = window.setTimeout(async () => {
      const id = ++reqRef.current;
      setState('loading');
      try {
        const data = await fetcher(q);
        if (id !== reqRef.current) return;
        setResults(data);
        setState(data.length === 0 ? 'empty' : 'ready');
      } catch (err) {
        if (id !== reqRef.current) return;
        if (err instanceof EndpointIndisponivelError) {
          setUnavailableText(unavailableMessage ?? err.message);
          setState('unavailable');
        } else {
          setState('error');
        }
        setResults([]);
      }
    }, debounceMs);
  }, [fetcher, minChars, debounceMs, unavailableMessage]);

  useEffect(() => {
    if (!open) return;
    runSearch(query);
    return () => { if (debRef.current) window.clearTimeout(debRef.current); };
  }, [open, query, runSearch]);

  const label = value ? getLabel(value) : '';

  return (
    <Popover open={open && !disabled} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate text-left">{label || placeholder}</span>
          <span className="ml-1 flex shrink-0 items-center gap-1">
            {value && !disabled && (
              <X
                className="h-3.5 w-3.5 opacity-60 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onSelect(null); }}
              />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start" style={{ width: popoverWidth }}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Digite pelo menos ${minChars} caracteres…`}
            value={query}
            onValueChange={setQuery}
            className="text-sm"
          />
          <CommandList>
            {state === 'typing' && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Digite pelo menos {minChars} caracteres
              </div>
            )}
            {state === 'loading' && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
              </div>
            )}
            {state === 'empty' && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            )}
            {state === 'error' && (
              <div className="flex items-start gap-2 px-3 py-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {state === 'unavailable' && (
              <div className="flex items-start gap-2 px-3 py-3 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{unavailableText}</span>
              </div>
            )}
            {state === 'ready' && (
              <CommandGroup>
                {results.slice(0, 100).map((item) => {
                  const k = getKey(item);
                  const isSel = value ? getKey(value) === k : false;
                  return (
                    <CommandItem
                      key={k}
                      value={k}
                      onSelect={() => {
                        onSelect(item);
                        setOpen(false);
                        setQuery('');
                      }}
                      className="items-start text-sm"
                    >
                      <Check className={cn('mr-1 mt-0.5 h-3.5 w-3.5', isSel ? 'opacity-100 text-primary' : 'opacity-0')} />
                      <div className="min-w-0 flex-1">
                        {renderItem ? renderItem(item, query.trim()) : (
                          <span className="truncate">{highlight(getLabel(item), query.trim())}</span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { highlight };
