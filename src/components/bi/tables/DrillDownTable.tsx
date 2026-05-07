import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../utils/formatters';
import { EmptyState } from '../states/EmptyState';

export interface DrillLevel { key: string; label: string }

export interface DrillDownTableProps {
  data: any[];
  levels: DrillLevel[];
  valueKey?: string;
  valueFormatter?: (v: number) => string;
  onLeafClick?: (row: any) => void;
}

interface Group {
  key: string;
  label: string;
  total: number;
  count: number;
  children: Group[] | null;
  rows: any[];
}

function groupBy(rows: any[], levels: DrillLevel[], valueKey: string, depth = 0): Group[] {
  if (depth >= levels.length) return [];
  const lv = levels[depth];
  const map = new Map<string, any[]>();
  rows.forEach((r) => {
    const k = String(r[lv.key] ?? '—');
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  });
  return [...map.entries()].map(([k, rs]) => {
    const total = rs.reduce((s, r) => s + Number(r[valueKey] || 0), 0);
    const isLeaf = depth === levels.length - 1;
    return {
      key: `${depth}-${k}`,
      label: k,
      total,
      count: rs.length,
      children: isLeaf ? null : groupBy(rs, levels, valueKey, depth + 1),
      rows: rs,
    };
  }).sort((a, b) => b.total - a.total);
}

function GroupRow({ g, depth, valueFormatter, onLeafClick }: {
  g: Group; depth: number; valueFormatter: (v: number) => string; onLeafClick?: (row: any) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const isLeaf = !g.children;
  return (
    <>
      <div
        className={cn(
          'flex cursor-pointer items-center gap-2 border-b px-2 py-1.5 text-xs hover:bg-accent/30',
          depth === 0 && 'bg-muted/40 font-semibold',
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => isLeaf ? onLeafClick?.(g.rows[0]) : setOpen((o) => !o)}
      >
        {isLeaf ? <span className="w-3" /> : (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
        <span className="flex-1 truncate">{g.label}</span>
        <span className="text-muted-foreground tabular-nums">{g.count}</span>
        <span className="w-32 text-right font-semibold tabular-nums">{valueFormatter(g.total)}</span>
      </div>
      {!isLeaf && open && g.children!.map((c) => (
        <GroupRow key={c.key} g={c} depth={depth + 1} valueFormatter={valueFormatter} onLeafClick={onLeafClick} />
      ))}
    </>
  );
}

export function DrillDownTable({
  data, levels, valueKey = 'valor_liquido', valueFormatter = formatCurrency, onLeafClick,
}: DrillDownTableProps) {
  const groups = useMemo(() => groupBy(data || [], levels, valueKey), [data, levels, valueKey]);
  if (!groups.length) return <EmptyState />;
  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted/60 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="w-3" />
        <span className="flex-1">Nível</span>
        <span>Itens</span>
        <span className="w-32 text-right">Valor</span>
      </div>
      {groups.map((g) => (
        <GroupRow key={g.key} g={g} depth={0} valueFormatter={valueFormatter} onLeafClick={onLeafClick} />
      ))}
    </div>
  );
}
