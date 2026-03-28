import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlProps {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  onPageChange: (page: number) => void;
}

export function PaginationControl({ pagina, totalPaginas, totalRegistros, onPageChange }: PaginationControlProps) {
  return (
    <div className="flex items-center justify-between px-1 py-2">
      <span className="text-xs text-muted-foreground">
        Página {pagina} de {totalPaginas} ({totalRegistros} registros)
      </span>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="outline" className="h-7 w-7" disabled={pagina <= 1} onClick={() => onPageChange(1)}>
          <ChevronsLeft className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="outline" className="h-7 w-7" disabled={pagina <= 1} onClick={() => onPageChange(pagina - 1)}>
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="outline" className="h-7 w-7" disabled={pagina >= totalPaginas} onClick={() => onPageChange(pagina + 1)}>
          <ChevronRight className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="outline" className="h-7 w-7" disabled={pagina >= totalPaginas} onClick={() => onPageChange(totalPaginas)}>
          <ChevronsRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
