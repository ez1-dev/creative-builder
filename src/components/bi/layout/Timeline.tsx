import { ReactNode } from 'react';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  icon?: ReactNode;
  color?: string;
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative border-l border-border ml-2 space-y-3">
      {events.map((e) => (
        <li key={e.id} className="ml-4">
          <span
            className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background"
            style={{ backgroundColor: e.color ?? 'hsl(var(--primary))' }}
          />
          <div className="text-[10px] text-muted-foreground">{e.timestamp}</div>
          <div className="text-xs font-semibold">{e.title}</div>
          {e.description && <p className="text-[11px] text-muted-foreground">{e.description}</p>}
        </li>
      ))}
    </ol>
  );
}
