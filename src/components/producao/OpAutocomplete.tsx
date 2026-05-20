import { useEffect, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpcaoOp } from '@/lib/producao/opcoesImpressao';

interface Props {
  value: string;
  displayLabel?: string;
  onSelect: (op: OpcaoOp | null) => void;
  fetcher: (q: string) => Promise<OpcaoOp[]>;
  disabled?: boolean;
  placeholder?: string;
}

const formatOp = (op: OpcaoOp) =>
  op.label ||
  [
    [op.cod_ori, op.num_orp].filter(Boolean).join(' / '),
    op.produto,
    op.descricao_produto,
  ].filter(Boolean).join(' - ');

export function OpAutocomplete({ value, displayLabel, onSelect, fetcher, disabled, placeholder = 'Buscar O.P...' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpcaoOp[]>([]);
  const [loading, setLoading] = useState(false);
  const debRef = useRef<number | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    if (debRef.current) window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(async () => {
      const id = ++reqRef.current;
      setLoading(true);
      try {
        const data = await fetcher(query);
        if (id === reqRef.current) setResults(data);
      } finally {
        if (id === reqRef.current) setLoading(false);
      }
    }, 300);
    return () => { if (debRef.current) window.clearTimeout(debRef.current); };
  }, [open, query, fetcher]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          disabled={disabled}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{value ? (displayLabel || value) : placeholder}</span>
          <span className="ml-1 flex shrink-0 items-center gap-1">
            {value && !disabled && (
              <X className="h-3 w-3 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onSelect(null); }} />
            )}
            <ChevronsUpDown className="h-3 w-3 opacity-50" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Digite número, produto ou descrição..." value={query} onValueChange={setQuery} className="text-xs" />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : results.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                {query ? 'Nenhuma O.P. encontrada' : 'Digite para buscar'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {results.slice(0, 100).map((op) => {
                  const key = `${op.cod_emp ?? ''}-${op.cod_ori ?? ''}-${op.num_orp ?? ''}`;
                  const label = formatOp(op);
                  return (
                    <CommandItem
                      key={key}
                      value={key}
                      onSelect={() => { onSelect(op); setOpen(false); setQuery(''); }}
                      className="text-xs"
                    >
                      <Check className={cn('mr-1 h-3 w-3', String(op.num_orp ?? '') === value ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{label}</span>
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
