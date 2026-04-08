import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Search, X, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  children: React.ReactNode;
  onSearch: () => void;
  onClear: () => void;
  onClearResults?: () => void;
  defaultOpen?: boolean;
}

export function FilterPanel({ children, onSearch, onClear, onClearResults, defaultOpen = true }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-md border bg-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/50"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Filtros
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      <div className={cn('overflow-hidden transition-all', isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0')}>
        <div className="border-t px-4 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {children}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={onSearch}>
              <Search className="mr-1 h-3 w-3" />
              Pesquisar
            </Button>
            <Button size="sm" variant="outline" onClick={onClear}>
              <X className="mr-1 h-3 w-3" />
              Limpar Filtros
            </Button>
            {onClearResults && (
              <Button size="sm" variant="outline" onClick={onClearResults}>
                <Eraser className="mr-1 h-3 w-3" />
                Limpar Resultados
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
