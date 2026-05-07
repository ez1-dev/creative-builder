import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DashboardPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-4 p-4', className)}>{children}</div>;
}

export function DashboardHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function DashboardSection({
  title, icon, actions, children, className,
}: { title?: string; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-2', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {icon}{title}
          </h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function DashboardGrid({
  children, cols = 3, className,
}: { children: ReactNode; cols?: 1 | 2 | 3 | 4 | 5 | 6; className?: string }) {
  const m: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };
  return <div className={cn('grid gap-3', m[cols], className)}>{children}</div>;
}

export function ChartGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4 lg:grid-cols-3', className)}>{children}</div>;
}

export function DashboardToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
}
