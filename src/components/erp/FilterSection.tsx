import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FilterSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  /** Quantas colunas o grid interno deve usar em telas largas. Default: 5 */
  cols?: 3 | 4 | 5 | 6;
  className?: string;
}

const colsCls: Record<number, string> = {
  3: 'lg:grid-cols-3 xl:grid-cols-3',
  4: 'lg:grid-cols-3 xl:grid-cols-4',
  5: 'lg:grid-cols-4 xl:grid-cols-5',
  6: 'lg:grid-cols-4 xl:grid-cols-6',
};

/**
 * Agrupa um conjunto de filtros sob um cabeçalho dentro do FilterPanel.
 * Ocupa toda a largura do grid pai via `col-span-full`.
 */
export function FilterSection({ title, icon, children, cols = 5, className }: FilterSectionProps) {
  return (
    <div className={cn('col-span-full', className)}>
      <div className="mb-2 flex items-center gap-2 border-b pb-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3', colsCls[cols])}>
        {children}
      </div>
    </div>
  );
}
