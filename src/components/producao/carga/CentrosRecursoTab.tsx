import { useMemo, useState } from 'react';
import { useCargaCentros } from '@/hooks/useCargaProducao';
import { CargaCentroRow, CargaFiltros } from '@/lib/producao/cargaApi';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ArrowUpDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnidadeNegocioBadge, TipoRecursoBadge } from './badges';

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

type SortKey = 'carga_prevista_horas' | 'unidade_negocio' | 'codcre' | 'codopr';

export function CentrosRecursoTab({
  filtros,
  onAbrirDetalhe,
}: {
  filtros: CargaFiltros;
  onAbrirDetalhe: (row: CargaCentroRow) => void;
}) {
  const { data, isLoading, isError, error } = useCargaCentros(filtros);
  const [busca, setBusca] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('carga_prevista_horas');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo(() => {
    const list = data?.centros ?? [];
    const term = busca.trim().toLowerCase();
    const filtered = term
      ? list.filter((r) =>
          [r.codcre, r.descre, r.codopr, r.descricao_operacao].some((v) => String(v ?? '').toLowerCase().includes(term)),
        )
      : list;
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av ?? '').localeCompare(String(bv ?? ''))
        : String(bv ?? '').localeCompare(String(av ?? ''));
    });
    return sorted;
  }, [data, busca, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir(k === 'carga_prevista_horas' ? 'desc' : 'asc'); }
  };

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <TableHead>
      <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-foreground">
        {children}<ArrowUpDown className="h-3 w-3 opacity-60" />
      </button>
    </TableHead>
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por centro, descrição ou operação..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-8 max-w-sm text-xs"
        />
        <div className="ml-auto text-xs text-muted-foreground">{rows.length} registro(s)</div>
      </div>

      {isError && (
        <div className="p-6 flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" /> {(error as Error)?.message}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <Th k="unidade_negocio">Unidade</Th>
              <TableHead>Tipo</TableHead>
              <TableHead>CCusto</TableHead>
              <Th k="codcre">Centro recurso</Th>
              <TableHead>Descrição recurso</TableHead>
              <Th k="codopr">Operação</Th>
              <TableHead>Descrição operação</TableHead>
              <TableHead className="text-right">Qtd OPs</TableHead>
              <TableHead className="text-right">Qtd prevista</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <Th k="carga_prevista_horas">Horas</Th>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={12}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ))}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={`${r.codcre}-${r.codopr}-${i}`} className="cursor-pointer hover:bg-muted/40" onClick={() => onAbrirDetalhe(r)}>
                <TableCell><UnidadeNegocioBadge value={r.unidade_negocio} /></TableCell>
                <TableCell><TipoRecursoBadge value={r.tipo_recurso} /></TableCell>
                <TableCell className="text-xs">{r.codccu}</TableCell>
                <TableCell className="text-xs font-mono">{r.codcre}</TableCell>
                <TableCell className="text-xs">{r.descre}</TableCell>
                <TableCell className="text-xs font-mono">{r.codopr}</TableCell>
                <TableCell className="text-xs">{r.descricao_operacao}</TableCell>
                <TableCell className="text-right text-xs">{fmt(r.qtd_ops)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(r.qtd_prevista)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(r.carga_prevista_min)}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{fmt(r.carga_prevista_horas)}</TableCell>
                <TableCell><Button size="sm" variant="ghost" className="h-7 text-xs">Detalhe</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
