import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
  stickyWidth?: number;
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

  const stickyOffsets = useMemo(() => {
    const offsets: number[] = [];
    let accum = 0;
    columns.forEach((col, i) => {
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
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        if (val == null) return false;
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, columns]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {enableSearch && data.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nos resultados..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          {searchTerm.trim() && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Exibindo {filteredData.length} de {data.length}
            </span>
          )}
        </div>
      )}
      <div className="rounded-md border overflow-auto max-h-[60vh]">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="table-header-bg hover:bg-transparent">
              {columns.map((col, colIndex) => {
                const stickyStyle = col.sticky ? {
                  position: 'sticky' as const,
                  left: stickyOffsets[colIndex],
                  zIndex: 30,
                  minWidth: col.stickyWidth || 120,
                } : {};
                const isLastSticky = colIndex === lastStickyIndex;
                return (
                  <TableHead
                    key={col.key}
                    style={stickyStyle}
                    className={`whitespace-nowrap text-xs font-semibold text-[hsl(var(--table-header-foreground))] ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.className || ''} ${col.sticky ? 'bg-[hsl(var(--table-header))]' : ''} ${isLastSticky ? 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]' : ''}`}
                  >
                    {col.header}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {searchTerm.trim() ? 'Nenhum resultado encontrado para a busca.' : emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, rowIndex) => (
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
                        {col.render ? col.render(row[col.key], row) : row[col.key] ?? '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}