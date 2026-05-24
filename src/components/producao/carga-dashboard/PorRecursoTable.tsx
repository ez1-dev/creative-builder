import { useMemo, useState, Fragment } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, ArrowUp, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { UnidadeNegocioBadge, TipoRecursoBadge } from '@/components/producao/carga/badges';
import { fmtDec, fmtNum } from './aggregations';
import { classifyOcupacao, statusStyle } from './statusOcupacao';
import { cn } from '@/lib/utils';
import type { CargaRecursoRow } from '@/lib/producao/cargaApi';
import { GroupByBar } from './GroupByBar';
import { GroupedRows } from './GroupedRows';
import { collectAllGroupKeys, useTableGrouping, type GroupField } from './useTableGrouping';
import { CodeWithDesc } from './CodeWithDesc';


type SortKey =
  | 'qtd_ops'
  | 'qtd_operacoes'
  | 'qtd_prevista'
  | 'carga_prevista_min'
  | 'carga_prevista_horas';
type SortDir = 'asc' | 'desc';

interface Props {
  rows: CargaRecursoRow[];
  loading?: boolean;
  error?: Error | null;
  onSelect?: (r: CargaRecursoRow) => void;
}

const NUMERIC_KEYS = ['qtd_ops', 'qtd_operacoes', 'qtd_prevista', 'carga_prevista_min', 'carga_prevista_horas'];

const SortHeader = ({
  active,
  dir,
  onClick,
  align = 'right',
  children,
}: {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: 'left' | 'right';
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors',
      align === 'right' ? 'justify-end w-full' : 'justify-start',
      active ? 'text-foreground' : 'text-muted-foreground',
    )}
  >
    {children}
    {active ? (
      dir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowUpDown className="h-3 w-3 opacity-50" />
    )}
  </button>
);

export function PorRecursoTable({ rows, loading, error, onSelect }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'carga_prevista_horas',
    dir: 'desc',
  });
  const [groupFields, setGroupFields] = useState<GroupField[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const av = (a[sort.key] as number) ?? 0;
      const bv = (b[sort.key] as number) ?? 0;
      return sort.dir === 'desc' ? bv - av : av - bv;
    });
    return out;
  }, [rows, sort]);

  const tree = useTableGrouping(sorted, groupFields, NUMERIC_KEYS);

  // Para classificação de status, usar shape compatível com RecursoAgg
  const status = useMemo(
    () =>
      classifyOcupacao(
        rows.map((r) => ({
          codcre: r.codcre,
          descre: r.descre,
          codccu: r.codccu,
          unidade_negocio: r.unidade_negocio,
          tipo_recurso: r.tipo_recurso,
          qtd_ops: r.qtd_ops,
          qtd_operacoes: r.qtd_operacoes,
          carga_prevista_min: r.carga_prevista_min,
          carga_prevista_horas: r.carga_prevista_horas,
        })),
      ),
    [rows],
  );

  const total = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.qtd_ops += r.qtd_ops ?? 0;
          acc.qtd_operacoes += r.qtd_operacoes ?? 0;
          acc.qtd_prevista += r.qtd_prevista ?? 0;
          acc.carga_prevista_min += r.carga_prevista_min ?? 0;
          acc.carga_prevista_horas += r.carga_prevista_horas ?? 0;
          return acc;
        },
        { qtd_ops: 0, qtd_operacoes: 0, qtd_prevista: 0, carga_prevista_min: 0, carga_prevista_horas: 0 },
      ),
    [rows],
  );

  const clickable = !!onSelect;
  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));

  const toggleGroup = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const renderLeaf = (r: CargaRecursoRow, i: number) => {
    const st = status.get(`${r.codcre}|${r.codccu}`) ?? 'Normal';
    const stl = statusStyle[st];
    return (
      <TableRow
        key={`${r.codcre}-${r.codccu}-${i}`}
        onClick={clickable ? () => onSelect?.(r) : undefined}
        className={cn(clickable && 'cursor-pointer hover:bg-muted/60')}
      >
        <TableCell><UnidadeNegocioBadge value={r.unidade_negocio} /></TableCell>
        <TableCell><TipoRecursoBadge value={r.tipo_recurso} /></TableCell>
        <TableCell className="text-xs">{r.codccu}</TableCell>
        <TableCell><CodeWithDesc code={r.codcre} desc={r.descre} /></TableCell>

        <TableCell className="text-right text-xs">{fmtNum(r.qtd_ops)}</TableCell>
        <TableCell className="text-right text-xs">{fmtNum(r.qtd_operacoes)}</TableCell>
        <TableCell className="text-right text-xs">{fmtDec(r.qtd_prevista)}</TableCell>
        <TableCell className="text-right text-xs">{fmtDec(r.carga_prevista_min)}</TableCell>
        <TableCell className="text-right text-xs font-semibold">{fmtDec(r.carga_prevista_horas)}</TableCell>
        <TableCell>
          <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', stl.text)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', stl.dot)} />
            {st}
          </span>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card className="rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-3 md:p-4 border-b">
        <div className="text-sm font-semibold">Por Centro de Recurso · {fmtNum(rows.length)} recursos</div>
        <div className="text-[11px] text-muted-foreground">
          Visão principal · ordenado por {sort.key.replace('_', ' ')} ({sort.dir})
          {clickable && ' · clique numa linha para detalhar as OPs do recurso'}
        </div>
      </div>

      <GroupByBar
        value={groupFields}
        onChange={(v) => {
          setGroupFields(v);
          setExpanded(new Set());
        }}
        onExpandAll={() => setExpanded(new Set(collectAllGroupKeys(tree)))}
        onCollapseAll={() => setExpanded(new Set())}
      />

      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro ao consultar recursos</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </div>
      )}

      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-md" />
          ))}
        </div>
      ) : !error && rows.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Nenhum recurso encontrado para o filtro atual.
        </div>
      ) : !error ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CCusto</TableHead>
                <TableHead>Recurso</TableHead>

                <TableHead className="text-right">
                  <SortHeader active={sort.key === 'qtd_ops'} dir={sort.dir} onClick={() => toggle('qtd_ops')}>
                    Qtd OPs
                  </SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader active={sort.key === 'qtd_operacoes'} dir={sort.dir} onClick={() => toggle('qtd_operacoes')}>
                    Qtd Operações
                  </SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader active={sort.key === 'qtd_prevista'} dir={sort.dir} onClick={() => toggle('qtd_prevista')}>
                    Qtd Prevista
                  </SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader
                    active={sort.key === 'carga_prevista_min'}
                    dir={sort.dir}
                    onClick={() => toggle('carga_prevista_min')}
                  >
                    Carga (min)
                  </SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader
                    active={sort.key === 'carga_prevista_horas'}
                    dir={sort.dir}
                    onClick={() => toggle('carga_prevista_horas')}
                  >
                    Carga (h)
                  </SortHeader>
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupFields.length === 0 ? (
                sorted.map((r, i) => renderLeaf(r, i))
              ) : (
                <GroupedRows
                  nodes={tree}
                  expanded={expanded}
                  onToggle={toggleGroup}
                  labelColspan={4}
                  renderTotals={(t) => (
                    <>
                      <TableCell className="text-right text-xs font-semibold">{fmtNum(t.qtd_ops)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{fmtNum(t.qtd_operacoes)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{fmtDec(t.qtd_prevista)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{fmtDec(t.carga_prevista_min)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{fmtDec(t.carga_prevista_horas)}</TableCell>
                    </>
                  )}
                  trailingCells={<TableCell />}
                  renderLeaf={renderLeaf}
                />
              )}
              <TableRow className="bg-muted/40">
                <TableCell colSpan={4} className="text-xs font-semibold">
                  Total geral
                </TableCell>
                <TableCell className="text-right text-xs font-semibold">{fmtNum(total.qtd_ops)}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{fmtNum(total.qtd_operacoes)}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{fmtDec(total.qtd_prevista)}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{fmtDec(total.carga_prevista_min)}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{fmtDec(total.carga_prevista_horas)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : null}
    </Card>
  );
}
