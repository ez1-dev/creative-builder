import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, X, ArrowUp, ArrowDown, ArrowUpDown, ChevronRight, ChevronDown, Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export interface Column<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
  stickyWidth?: number;
  sortable?: boolean;
  /** Como agregar essa coluna quando há agrupamento. Default: auto (sum se numérica, none senão). */
  aggregate?: 'sum' | 'none';
  /** Se essa coluna pode ser usada para agrupar. Default: auto (true se não numérica). */
  groupable?: boolean;
  /** Formatador opcional para o valor agregado. Se omitido usa `render` (com row vazia) ou toLocaleString. */
  aggregateFormatter?: (v: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  enableSearch?: boolean;
  /** Habilita a barra "Agrupar por" + soma nas colunas numéricas. Default: true. */
  groupable?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

type SortDir = 'asc' | 'desc' | null;

const NON_SUMMABLE_NAME = /(^|_)(ano|mes|anomes|year|month|ticket_medio|preco_medio|media|avg|cod|id|numero|num)($|_)/i;

function inferNumeric<T extends Record<string, any>>(data: T[], key: string): boolean {
  let nums = 0;
  let total = 0;
  const sample = data.slice(0, 50);
  for (const row of sample) {
    const v = row?.[key];
    if (v == null || v === '') continue;
    total++;
    if (typeof v === 'number' && Number.isFinite(v)) nums++;
  }
  return total > 0 && nums / total >= 0.8;
}

function defaultNumberFormat(v: number): string {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

interface GroupNode<T> {
  key: string;
  colKey: string;
  value: string;
  level: number;
  count: number;
  totals: Record<string, number>;
  children: GroupNode<T>[];
  rows: T[];
}

function buildTree<T extends Record<string, any>>(
  rows: T[],
  groupKeys: string[],
  numericKeys: string[],
  level = 0,
  parentKey = '',
): GroupNode<T>[] {
  if (level >= groupKeys.length) return [];
  const colKey = groupKeys[level];
  const buckets = new Map<string, T[]>();
  for (const r of rows) {
    const raw = r?.[colKey];
    const v = raw == null || raw === '' ? '—' : String(raw);
    const arr = buckets.get(v);
    if (arr) arr.push(r);
    else buckets.set(v, [r]);
  }
  const out: GroupNode<T>[] = [];
  for (const [value, bucketRows] of buckets) {
    const key = parentKey ? `${parentKey}|${colKey}=${value}` : `${colKey}=${value}`;
    const totals: Record<string, number> = {};
    for (const k of numericKeys) totals[k] = 0;
    for (const r of bucketRows) {
      for (const k of numericKeys) totals[k] += Number(r?.[k] ?? 0);
    }
    const isLeaf = level === groupKeys.length - 1;
    out.push({
      key,
      colKey,
      value,
      level,
      count: bucketRows.length,
      totals,
      children: isLeaf ? [] : buildTree(bucketRows, groupKeys, numericKeys, level + 1, key),
      rows: isLeaf ? bucketRows : [],
    });
  }
  const sortKey = numericKeys[0];
  if (sortKey) out.sort((a, b) => (b.totals[sortKey] ?? 0) - (a.totals[sortKey] ?? 0));
  else out.sort((a, b) => a.value.localeCompare(b.value, 'pt-BR'));
  return out;
}

function collectAllKeys<T>(nodes: GroupNode<T>[]): string[] {
  const out: string[] = [];
  const walk = (n: GroupNode<T>) => { out.push(n.key); n.children.forEach(walk); };
  nodes.forEach(walk);
  return out;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  rowClassName,
  onRowClick,
  enableSearch = true,
  groupable = true,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [groupKeys, setGroupKeys] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => {
          if (d === 'asc') return 'desc';
          if (d === 'desc') { setSortKey(null); return null; }
          return 'asc';
        });
        return key;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const stickyOffsets = useMemo(() => {
    const offsets: number[] = [];
    let accum = 0;
    columns.forEach((col) => {
      offsets.push(accum);
      if (col.sticky) accum += (col.stickyWidth || 120);
    });
    return offsets;
  }, [columns]);

  const lastStickyIndex = useMemo(() => {
    let last = -1;
    columns.forEach((col, i) => { if (col.sticky) last = i; });
    return last;
  }, [columns]);

  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Detecta colunas numéricas (somáveis) e colunas agrupáveis
  const { numericKeys, groupableCols } = useMemo(() => {
    const nums: string[] = [];
    const groupables: Column<T>[] = [];
    for (const col of columns) {
      const autoNumeric =
        col.aggregate === 'sum'
          ? true
          : col.aggregate === 'none'
          ? false
          : inferNumeric(safeData, col.key) && !NON_SUMMABLE_NAME.test(col.key);
      if (autoNumeric) nums.push(col.key);

      const canGroup = col.groupable ?? true;
      if (canGroup) groupables.push(col);
    }
    return { numericKeys: nums, groupableCols: groupables };
  }, [columns, safeData]);

  const filteredData = useMemo(() => {
    if (!debouncedSearch.trim()) return safeData;
    const term = debouncedSearch.toLowerCase();
    return safeData.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        if (val == null) return false;
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [safeData, debouncedSearch, columns]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filteredData;
    return [...filteredData].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      const cmp = sa.localeCompare(sb, 'pt-BR');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  const tree = useMemo(
    () => (groupable && groupKeys.length ? buildTree(sortedData, groupKeys, numericKeys) : []),
    [groupable, groupKeys, numericKeys, sortedData],
  );

  const toggleGroup = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const renderCellContent = useCallback((col: Column<T>, row: T) => {
    if (col.render) {
      return col.render(row[col.key], row);
    }
    const raw = row[col.key];
    if (raw == null) return '-';
    const text = String(raw);
    if (debouncedSearch.trim()) {
      return <HighlightText text={text} highlight={debouncedSearch.trim()} />;
    }
    return text;
  }, [debouncedSearch]);

  const renderAggregate = useCallback((col: Column<T>, total: number) => {
    if (col.aggregateFormatter) return col.aggregateFormatter(total);
    if (col.render) {
      try {
        return col.render(total, { [col.key]: total } as any);
      } catch {
        return defaultNumberFormat(total);
      }
    }
    return defaultNumberFormat(total);
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    if (sortDir === 'asc') return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const renderLeafRow = (row: T, rowIndex: number, indentPx = 0) => (
    <TableRow
      key={`leaf-${rowIndex}`}
      className={`${rowClassName ? rowClassName(row, rowIndex) : (rowIndex % 2 === 0 ? '' : 'table-stripe-bg')} ${onRowClick ? 'cursor-pointer' : ''}`}
      onClick={() => onRowClick?.(row, rowIndex)}
    >
      {columns.map((col, colIndex) => {
        const stickyStyle = col.sticky ? {
          position: 'sticky' as const,
          left: stickyOffsets[colIndex],
          zIndex: 20,
          minWidth: col.stickyWidth || 120,
        } : {};
        const isLastSticky = colIndex === lastStickyIndex;
        const padLeft = colIndex === 0 && indentPx ? { paddingLeft: 12 + indentPx } : {};
        return (
          <TableCell
            key={col.key}
            style={{ ...stickyStyle, ...padLeft }}
            className={`whitespace-nowrap text-xs ${
              col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
            } ${col.className || ''} ${col.sticky ? 'bg-background' : ''} ${isLastSticky ? 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]' : ''}`}
          >
            {renderCellContent(col, row)}
          </TableCell>
        );
      })}
    </TableRow>
  );

  const renderGroupNode = (node: GroupNode<T>, rowCounter: { i: number }) => {
    const isOpen = expanded.has(node.key);
    const groupCol = columns.find((c) => c.key === node.colKey);
    const indent = node.level * 14;
    const rows: React.ReactNode[] = [];
    rows.push(
      <TableRow
        key={`g-${node.key}`}
        className="cursor-pointer bg-muted/40 hover:bg-muted/60 font-semibold"
        onClick={() => toggleGroup(node.key)}
      >
        {columns.map((col, colIndex) => {
          const isFirst = colIndex === 0;
          const isNumeric = numericKeys.includes(col.key);
          const total = node.totals[col.key] ?? 0;
          return (
            <TableCell
              key={col.key}
              className={`whitespace-nowrap text-xs ${
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
              } ${col.className || ''}`}
              style={isFirst ? { paddingLeft: 8 + indent } : undefined}
            >
              {isFirst ? (
                <span className="inline-flex items-center gap-1">
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <span className="text-muted-foreground">{groupCol?.header}:</span>
                  <span>{node.value}</span>
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{node.count}</Badge>
                </span>
              ) : isNumeric ? (
                renderAggregate(col, total)
              ) : null}
            </TableCell>
          );
        })}
      </TableRow>
    );
    if (isOpen) {
      if (node.children.length) {
        for (const child of node.children) rows.push(...(renderGroupNode(child, rowCounter) as any));
      } else {
        for (const r of node.rows) {
          rows.push(renderLeafRow(r, rowCounter.i++, indent + 14));
        }
      }
    }
    return rows;
  };

  const addGroup = (key: string) => {
    if (groupKeys.includes(key)) return;
    setGroupKeys([...groupKeys, key]);
    setExpanded(new Set());
  };
  const removeGroup = (key: string) => {
    setGroupKeys(groupKeys.filter((k) => k !== key));
    setExpanded(new Set());
  };

  const grouping = groupable && groupableCols.length > 0;

  return (
    <div data-ai-avoid="datatable" className="space-y-2">
      {(enableSearch || grouping) && safeData.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {enableSearch && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar nos resultados... (Ctrl+K)"
                className="h-8 pl-8 pr-8 text-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {grouping && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Agrupar por:</span>
              {groupKeys.map((k) => {
                const col = columns.find((c) => c.key === k);
                return (
                  <Badge key={k} variant="secondary" className="gap-1 pr-1 text-xs">
                    {col?.header ?? k}
                    <button
                      onClick={() => removeGroup(k)}
                      className="ml-1 rounded hover:bg-background/60"
                      aria-label="Remover agrupamento"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    {groupKeys.length === 0 ? 'Adicionar' : 'Adicionar nível'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-auto">
                  <DropdownMenuLabel className="text-xs">Colunas</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {groupableCols
                    .filter((c) => !groupKeys.includes(c.key))
                    .map((c) => (
                      <DropdownMenuItem key={c.key} onClick={() => addGroup(c.key)} className="text-xs">
                        {c.header}
                      </DropdownMenuItem>
                    ))}
                  {groupableCols.filter((c) => !groupKeys.includes(c.key)).length === 0 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">Nenhuma coluna disponível</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {groupKeys.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setExpanded(new Set(collectAllKeys(tree)))}
                  >
                    Expandir tudo
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setExpanded(new Set())}
                  >
                    Recolher tudo
                  </Button>
                </>
              )}
            </div>
          )}
          {debouncedSearch.trim() && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Exibindo {sortedData.length} de {safeData.length}
            </span>
          )}
        </div>
      )}
      <div className="rounded-md border overflow-auto max-h-[60vh]">
        <table className="w-full caption-bottom text-sm">
          <TableHeader>
            <TableRow className="table-header-bg hover:bg-transparent">
              {columns.map((col, colIndex) => {
                const isSticky = col.sticky;
                const isLastSticky = colIndex === lastStickyIndex;
                const isSortable = col.sortable !== false;
                const headerStyle: React.CSSProperties = {
                  position: 'sticky',
                  top: 0,
                  zIndex: isSticky ? 40 : 20,
                  ...(isSticky ? {
                    left: stickyOffsets[colIndex],
                    width: col.stickyWidth || 120,
                    minWidth: col.stickyWidth || 120,
                  } : {}),
                };
                return (
                  <TableHead
                    key={col.key}
                    style={headerStyle}
                    className={`whitespace-nowrap text-xs font-semibold text-[hsl(var(--table-header-foreground))] bg-[hsl(var(--table-header))] ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.className || ''} ${isLastSticky ? 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]' : ''} ${isSortable ? 'cursor-pointer select-none hover:bg-[hsl(var(--table-header)/0.8)]' : ''}`}
                    onClick={isSortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center">
                      {col.header}
                      {isSortable && <SortIcon colKey={col.key} />}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {debouncedSearch.trim() ? 'Nenhum resultado encontrado para a busca.' : emptyMessage}
                </TableCell>
              </TableRow>
            ) : grouping && groupKeys.length > 0 ? (
              (() => {
                const counter = { i: 0 };
                return tree.flatMap((n) => renderGroupNode(n, counter) as any);
              })()
            ) : (
              sortedData.map((row, rowIndex) => renderLeafRow(row, rowIndex))
            )}
          </TableBody>
          {sortedData.length > 0 && numericKeys.length > 0 && (
            <tfoot>
              <TableRow className="hover:bg-transparent border-t-2">
                {columns.map((col, colIndex) => {
                  const isNumeric = numericKeys.includes(col.key);
                  const isFirst = colIndex === 0;
                  const total = isNumeric
                    ? sortedData.reduce((acc, r) => acc + Number(r?.[col.key] ?? 0), 0)
                    : 0;
                  const isLastSticky = colIndex === lastStickyIndex;
                  const stickyStyle: React.CSSProperties = col.sticky
                    ? {
                        position: 'sticky',
                        left: stickyOffsets[colIndex],
                        bottom: 0,
                        zIndex: 30,
                        minWidth: col.stickyWidth || 120,
                      }
                    : { position: 'sticky', bottom: 0, zIndex: 10 };
                  return (
                    <TableCell
                      key={col.key}
                      style={stickyStyle}
                      className={`whitespace-nowrap text-xs font-semibold bg-muted ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      } ${col.className || ''} ${isLastSticky ? 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]' : ''}`}
                    >
                      {isNumeric ? (
                        renderAggregate(col, total)
                      ) : isFirst ? (
                        <span className="text-muted-foreground">Total ({sortedData.length})</span>
                      ) : null}
                    </TableCell>
                  );
                })}
              </TableRow>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
