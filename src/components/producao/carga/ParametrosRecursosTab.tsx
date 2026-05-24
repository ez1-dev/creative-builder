import { useMemo, useState } from 'react';
import { useCargaCentros } from '@/hooks/useCargaProducao';
import { CargaFiltros } from '@/lib/producao/cargaApi';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Info, Search, ArrowUpDown } from 'lucide-react';
import { UnidadeNegocioBadge, TipoRecursoBadge } from './badges';

const fmt = (n: number | undefined) =>
  (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

type Row = {
  codcre: string;
  descre: string;
  codccu: string;
  unidade_negocio: string;
  tipo_recurso: string;
  qtd_operacoes: number;
  qtd_ops: number;
  carga_prevista_min: number;
  carga_prevista_horas: number;
};

type SortKey = 'carga_prevista_horas' | 'codcre' | 'unidade_negocio' | 'qtd_ops';

export function ParametrosRecursosTab({ filtros }: { filtros: CargaFiltros }) {
  const { data, isLoading, isError, error } = useCargaCentros(filtros);
  const [busca, setBusca] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('carga_prevista_horas');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo<Row[]>(() => {
    const list = data?.dados ?? [];
    const map = new Map<string, Row>();
    for (const r of list) {
      const key = `${r.codcre}|${r.codccu}`;
      const cur = map.get(key);
      if (cur) {
        cur.qtd_operacoes += 1;
        cur.qtd_ops += r.qtd_ops ?? 0;
        cur.carga_prevista_min += r.carga_prevista_min ?? 0;
        cur.carga_prevista_horas += r.carga_prevista_horas ?? 0;
      } else {
        map.set(key, {
          codcre: r.codcre,
          descre: r.descre,
          codccu: r.codccu,
          unidade_negocio: r.unidade_negocio,
          tipo_recurso: r.tipo_recurso,
          qtd_operacoes: 1,
          qtd_ops: r.qtd_ops ?? 0,
          carga_prevista_min: r.carga_prevista_min ?? 0,
          carga_prevista_horas: r.carga_prevista_horas ?? 0,
        });
      }
    }
    let out = Array.from(map.values());
    const term = busca.trim().toLowerCase();
    if (term) {
      out = out.filter((r) =>
        [r.codcre, r.descre, r.codccu, r.unidade_negocio, r.tipo_recurso].some((v) =>
          String(v ?? '').toLowerCase().includes(term),
        ),
      );
    }
    out.sort((a, b) => {
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av ?? '').localeCompare(String(bv ?? ''))
        : String(bv ?? '').localeCompare(String(av ?? ''));
    });
    return out;
  }, [data, busca, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir(k === 'carga_prevista_horas' || k === 'qtd_ops' ? 'desc' : 'asc'); }
  };

  const Th = ({ k, children, align }: { k: SortKey; children: React.ReactNode; align?: 'right' }) => (
    <TableHead className={align === 'right' ? 'text-right' : ''}>
      <button
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${align === 'right' ? 'justify-end' : ''}`}
      >
        {children}<ArrowUpDown className="h-3 w-3 opacity-60" />
      </button>
    </TableHead>
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por recurso, descrição, CCusto, unidade ou tipo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-8 max-w-sm text-xs"
        />
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Consulta — parametrização definitiva ainda será definida.
          </div>
          <div className="text-xs text-muted-foreground">{rows.length} recurso(s)</div>
        </div>
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
              <Th k="codcre">Recurso</Th>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Qtd operações</TableHead>
              <Th k="qtd_ops" align="right">Qtd OPs</Th>
              <TableHead className="text-right">Carga (min)</TableHead>
              <Th k="carga_prevista_horas" align="right">Carga (h)</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ))}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">Nenhum recurso no período</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={`${r.codcre}-${r.codccu}`}>
                <TableCell><UnidadeNegocioBadge value={r.unidade_negocio} /></TableCell>
                <TableCell><TipoRecursoBadge value={r.tipo_recurso} /></TableCell>
                <TableCell className="text-xs">{r.codccu}</TableCell>
                <TableCell className="text-xs font-mono">{r.codcre}</TableCell>
                <TableCell className="text-xs">{r.descre}</TableCell>
                <TableCell className="text-right text-xs">{fmt(r.qtd_operacoes)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(r.qtd_ops)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(r.carga_prevista_min)}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{fmt(r.carga_prevista_horas)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
