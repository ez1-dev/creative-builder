import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export interface Column<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
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
    <div className="rounded-md border overflow-auto max-h-[60vh]">
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="table-header-bg hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={`whitespace-nowrap text-xs font-semibold text-[hsl(var(--table-header-foreground))] ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.className || ''}`}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow key={rowIndex} className={`${rowClassName ? rowClassName(row, rowIndex) : (rowIndex % 2 === 0 ? '' : 'table-stripe-bg')} ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(row, rowIndex)}>
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={`whitespace-nowrap text-xs ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
