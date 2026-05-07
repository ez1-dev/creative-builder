import { ReactNode } from 'react';

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-2 rounded-md border bg-card p-2">{children}</div>;
}
