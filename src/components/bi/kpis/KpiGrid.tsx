import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function KpiGrid({ children, cols, className }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 | 6; className?: string }) {
  const colsCls = cols
    ? {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
        6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
      }[cols]
    : 'grid-cols-[repeat(auto-fit,minmax(180px,1fr))]';
  return <div className={cn('grid gap-3', colsCls, className)}>{children}</div>;
}
