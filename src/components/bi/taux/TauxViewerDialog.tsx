import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getTauxData } from '@/lib/bi/tauxApi';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nome: string | null;
  tabela?: string | null;
}

function formatCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'number') return v.toLocaleString('pt-BR');
  if (typeof v === 'string') {
    const iso = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/.test(v);
    if (iso) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toLocaleString('pt-BR');
    }
    return v;
  }
  try { return JSON.stringify(v); } catch { return String(v); }
}

export function TauxViewerDialog({ open, onOpenChange, nome, tabela }: Props) {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!open) {
      setQ(''); setDebouncedQ(''); setLimit(100); setOffset(0);
    }
  }, [open, nome]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setOffset(0); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching, error } = useQuery({
    queryKey: ['taux-data', nome, debouncedQ, limit, offset],
    queryFn: () => getTauxData(nome!, { q: debouncedQ, limit, offset }),
    enabled: !!nome && open,
  });

  const rows = data?.data ?? [];
  const columns = useMemo(() => {
    if (data?.columns?.length) return data.columns;
    if (rows.length) return Object.keys(rows[0]);
    return [];
  }, [data, rows]);

  const total = data?.total;
  const page = Math.floor(offset / limit) + 1;
  const hasNext = total != null ? offset + limit < total : rows.length === limit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>{nome ?? ''}</DialogTitle>
          <DialogDescription>
            Tabela Cloud: <code className="text-xs">{tabela ?? '—'}</code>
            {total != null && <> · {total.toLocaleString('pt-BR')} registros</>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="pl-8"
            />
          </div>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setOffset(0); }}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[50, 100, 200, 500].map((n) => (
                <SelectItem key={n} value={String(n)}>{n} / pág.</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[60vh] overflow-auto rounded border">
          {isFetching && rows.length === 0 ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-destructive">Erro ao carregar dados.</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sem registros.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="px-2 py-1.5 text-left font-medium border-b">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/40">
                    {columns.map((c) => (
                      <td key={c} className="px-2 py-1 whitespace-nowrap">{formatCell((row as any)[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Página {page} · mostrando {rows.length} registro(s)
            {isFetching && ' · atualizando…'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setOffset(offset + limit)}>
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
