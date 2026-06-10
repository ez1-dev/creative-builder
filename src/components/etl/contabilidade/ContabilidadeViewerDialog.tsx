import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getContabilidadeData } from '@/lib/bi/contabilidadeApi';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nomeBase: string | null;
  anomesIni: string;
  anomesFim: string;
}

const PAGE_SIZE = 100;

export function ContabilidadeViewerDialog({ open, onOpenChange, nomeBase, anomesIni, anomesFim }: Props) {
  const [offset, setOffset] = useState(0);

  const q = useQuery({
    queryKey: ['contab-data', nomeBase, anomesIni, anomesFim, offset],
    queryFn: () => getContabilidadeData(nomeBase!, anomesIni, anomesFim, PAGE_SIZE, offset),
    enabled: open && !!nomeBase,
  });

  const cols = useMemo<string[]>(() => {
    const c = q.data?.columns;
    if (c && c.length) return c;
    const first = q.data?.data?.[0];
    return first ? Object.keys(first) : [];
  }, [q.data]);

  const total = q.data?.total ?? null;
  const rows = q.data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setOffset(0); }}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{nomeBase}</span>
            <span className="text-xs text-muted-foreground font-normal">
              {anomesIni} a {anomesFim}
            </span>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => q.refetch()} disabled={q.isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${q.isFetching ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-md">
          {q.isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : q.isError ? (
            <div className="p-6 text-sm text-destructive">
              {(q.error as Error)?.message ?? 'Erro ao carregar dados'}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              Nenhum registro encontrado para o período.
            </div>
          ) : (
            <table className="text-xs w-full">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {cols.map((c) => (
                    <th key={c} className="text-left px-2 py-1.5 font-semibold whitespace-nowrap border-b">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/40">
                    {cols.map((c) => {
                      const v = (row as any)[c];
                      const display = v === null || v === undefined
                        ? '—'
                        : typeof v === 'object' ? JSON.stringify(v)
                        : String(v);
                      return (
                        <td key={c} className="px-2 py-1 whitespace-nowrap font-mono">{display}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>
            {total !== null ? `${rows.length} de ${total} registros` : `${rows.length} registros`}
            {' · '}offset {offset}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={offset === 0 || q.isFetching}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </Button>
            <Button size="sm" variant="outline" disabled={rows.length < PAGE_SIZE || q.isFetching}
              onClick={() => setOffset(offset + PAGE_SIZE)}>
              Próximo <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
