import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function AdvancedFiltersPanel({ children, title = 'Filtros avançados' }: { children: ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border bg-card">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium hover:bg-accent/30">
        {title}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && <div className="grid grid-cols-1 gap-3 border-t p-3 sm:grid-cols-2 md:grid-cols-3">{children}</div>}
    </div>
  );
}
