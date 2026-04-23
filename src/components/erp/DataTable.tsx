import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
  stickyWidth?: number;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  enableSearch?: boolean;
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

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  rowClassName,
  onRowClick,
  enableSearch = true,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Ctrl+K shortcut
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

  const filteredData = useMemo(() => {
    if (!debouncedSearch.trim()) return data;
    const term = debouncedSearch.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        if (val == null) return false;
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [data, debouncedSearch, columns]);

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

  return (
    <div data-ai-avoid="datatable" className="space-y-2">
      {enableSearch && data.length > 0 && (
        <div className="flex items-center gap-3">
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
          {debouncedSearch.trim() && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Exibindo {sortedData.length} de {data.length}
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
            ) : (
              sortedData.map((row, rowIndex) => (
                <TableRow key={rowIndex} className={`${rowClassName ? rowClassName(row, rowIndex) : (rowIndex % 2 === 0 ? '' : 'table-stripe-bg')} ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(row, rowIndex)}>
                  {columns.map((col, colIndex) => {
                    const stickyStyle = col.sticky ? {
                      position: 'sticky' as const,
                      left: stickyOffsets[colIndex],
                      zIndex: 20,
                      minWidth: col.stickyWidth || 120,
                    } : {};
                    const isLastSticky = colIndex === lastStickyIndex;
                    return (
                      <TableCell
                        key={col.key}
                        style={stickyStyle}
                        className={`whitespace-nowrap text-xs ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } ${col.className || ''} ${col.sticky ? 'bg-background' : ''} ${isLastSticky ? 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]' : ''}`}
                      >
                        {renderCellContent(col, row)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>
    </div>
  );
}
