import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function KpiGrid({ children, cols, className }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 | 6 | 7; className?: string }) {
  const colsCls = cols
    ? {
        2: 'grid-cols-1 sm:grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-6',
        4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 5xl:grid-cols-8',
        5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 3xl:grid-cols-6 4xl:grid-cols-8',
        6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6 3xl:grid-cols-7 4xl:grid-cols-8',
        7: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-10',
      }[cols]
    : 'grid-cols-[repeat(auto-fit,minmax(180px,1fr))_minmax(0,1fr)] 3xl:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] 4xl:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]';
  return <div className={cn('grid gap-3 3xl:gap-5', colsCls, className)}>{children}</div>;
}
