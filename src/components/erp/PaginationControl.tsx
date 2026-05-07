import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export type PageSize = number | 'todos';

interface PaginationControlProps {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  onPageChange: (page: number) => void;
  /** Tamanho atual; quando definido junto com onPageSizeChange, mostra o seletor */
  pageSize?: PageSize;
  onPageSizeChange?: (size: PageSize) => void;
  pageSizeOptions?: PageSize[];
}

const DEFAULT_OPTIONS: PageSize[] = [100, 250, 500, 1000, 'todos'];

export function PaginationControl({
  pagina, totalPaginas, totalRegistros, onPageChange,
  pageSize, onPageSizeChange, pageSizeOptions = DEFAULT_OPTIONS,
}: PaginationControlProps) {
  const showSizer = pageSize !== undefined && !!onPageSizeChange;
  const isTodos = pageSize === 'todos';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-2">
      <span className="text-xs text-muted-foreground">
        {isTodos
          ? `Mostrando todos os ${totalRegistros} registros`
          : `Página ${pagina} de ${totalPaginas} (${totalRegistros} registros)`}
      </span>
      <div className="ml-auto flex items-center gap-2">
        {showSizer && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Mostrar:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange!(v === 'todos' ? 'todos' : Number(v))}
            >
              <SelectTrigger className="h-7 w-[90px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={String(opt)} value={String(opt)} className="text-xs">
                    {opt === 'todos' ? 'Todos' : opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-7 w-7" disabled={isTodos || pagina <= 1} onClick={() => onPageChange(1)}>
            <ChevronsLeft className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" disabled={isTodos || pagina <= 1} onClick={() => onPageChange(pagina - 1)}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" disabled={isTodos || pagina >= totalPaginas} onClick={() => onPageChange(pagina + 1)}>
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" disabled={isTodos || pagina >= totalPaginas} onClick={() => onPageChange(totalPaginas)}>
            <ChevronsRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
