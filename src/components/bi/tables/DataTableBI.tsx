import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';

export type { Column };

export interface DataTableBIProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  enableSearch?: boolean;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
  defaultSort?: { key: string; dir: 'asc' | 'desc' } | null;
  pagination?: {
    pagina: number;
    totalPaginas: number;
    totalRegistros: number;
    onPageChange: (p: number) => void;
  };
}

/** DataTableBI = wrapper sobre DataTable existente, adicionando paginação opcional integrada. */
export function DataTableBI<T extends Record<string, any>>({
  pagination, ...rest
}: DataTableBIProps<T>) {
  return (
    <div className="space-y-2">
      <DataTable {...rest} />
      {pagination && pagination.totalPaginas > 1 && (
        <PaginationControl
          pagina={pagination.pagina}
          totalPaginas={pagination.totalPaginas}
          totalRegistros={pagination.totalRegistros}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
