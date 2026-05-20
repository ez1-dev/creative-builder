import { useEffect, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpcaoProduto } from '@/lib/producao/opcoesImpressao';

interface Props {
  value: string;
  displayLabel?: string;
  onSelect: (produto: OpcaoProduto | null) => void;
  fetcher: (q: string) => Promise<OpcaoProduto[]>;
  disabled?: boolean;
  placeholder?: string;
}

const formatProduto = (p: OpcaoProduto) =>
  p.label || [p.codigo, p.descricao].filter(Boolean).join(' - ');

export function ProdutoAutocomplete({ value, displayLabel, onSelect, fetcher, disabled, placeholder = 'Buscar produto...' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpcaoProduto[]>([]);
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
          <CommandInput placeholder="Digite código ou descrição..." value={query} onValueChange={setQuery} className="text-xs" />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : results.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                {query ? 'Nenhum produto encontrado' : 'Digite para buscar'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {results.slice(0, 100).map((p) => {
                  const codigo = String(p.value ?? p.codigo ?? '');
                  return (
                    <CommandItem
                      key={codigo}
                      value={codigo}
                      onSelect={() => { onSelect(p); setOpen(false); setQuery(''); }}
                      className="text-xs"
                    >
                      <Check className={cn('mr-1 h-3 w-3 shrink-0', codigo === value ? 'opacity-100' : 'opacity-0')} />
                      <span className="flex-1 truncate">{formatProduto(p)}</span>
                      {typeof p.qtd_ops === 'number' && (
                        <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {p.qtd_ops} OP{p.qtd_ops === 1 ? '' : 's'}
                        </span>
                      )}
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
