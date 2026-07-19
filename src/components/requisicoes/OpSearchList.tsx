import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OpcaoOp } from '@/lib/producao/opcoesImpressao';

interface Props {
  fetcher: (q: string) => Promise<OpcaoOp[]>;
  onSelect: (op: OpcaoOp) => void;
  selectedKey?: string;
  loading?: boolean;
  placeholder?: string;
}

const formatMain = (op: OpcaoOp) => [op.produto, op.descricao_produto || op.descricao].filter(Boolean).join(' · ');
const situacaoTone = (sit?: string) => {
  const s = String(sit ?? '').toUpperCase();
  if (s === 'L') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (s === 'A') return 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300';
  if (s === 'E' || s === 'P') return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-border bg-muted text-muted-foreground';
};
const situacaoLabel = (sit?: string) => {
  const s = String(sit ?? '').toUpperCase();
  if (s === 'L') return 'Liberada';
  if (s === 'A') return 'Aberta';
  if (s === 'E') return 'Em execução';
  if (s === 'P') return 'Parada';
  return sit || '—';
};

export function OpSearchList({ fetcher, onSelect, selectedKey, loading: externalLoading, placeholder = 'Buscar por número da OP, produto ou descrição' }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpcaoOp[]>([]);
  const [loading, setLoading] = useState(false);
  const debRef = useRef<number | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
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
  }, [query, fetcher]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
        />
        {externalLoading && (
          <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Você pode buscar por número da OP, código do produto ou parte da descrição.
      </p>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{loading ? 'Buscando…' : `${results.length} resultado${results.length === 1 ? '' : 's'}`}</span>
      </div>

      <div className="mt-1 flex-1 overflow-auto rounded-md border bg-card" style={{ maxHeight: 420 }}>
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma OP encontrada.
          </div>
        ) : (
          <ul className="divide-y">
            {results.slice(0, 100).map((op) => {
              const key = `${op.cod_ori ?? ''}-${op.num_orp ?? ''}`;
              const isSelected = selectedKey === key ||
                selectedKey === `${op.cod_emp ?? ''}-${op.cod_ori ?? ''}-${op.num_orp ?? ''}`;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onSelect(op)}
                    className={cn(
                      'group flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-muted/70',
                      isSelected && 'bg-primary/5 hover:bg-primary/10',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-mono text-sm font-semibold',
                          isSelected ? 'text-primary' : 'text-foreground',
                        )}>
                          {op.cod_ori ?? '—'} / {op.num_orp ?? '—'}
                        </span>
                        <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px]', situacaoTone(op.sit_orp))}>
                          {situacaoLabel(op.sit_orp)}
                        </Badge>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {formatMain(op) || '—'}
                      </div>
                      {op.num_ped && (
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                          Pedido {op.num_ped}
                          {op.qtd_prevista != null && <> · Previsto {op.qtd_prevista} {op.unidade ?? ''}</>}
                        </div>
                      )}
                    </div>
                    <ChevronRight className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:text-primary',
                      isSelected && 'text-primary',
                    )} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
