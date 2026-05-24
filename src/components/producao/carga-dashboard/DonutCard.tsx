import { Card } from '@/components/ui/card';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { fmtNum } from './aggregations';
import { cn } from '@/lib/utils';

const PALETTE = [
  'hsl(var(--primary))',
  'hsl(217 91% 60%)',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(280 65% 60%)',
  'hsl(199 89% 48%)',
  'hsl(0 84% 60%)',
  'hsl(160 60% 40%)',
  'hsl(340 75% 55%)',
];

export function DonutCard({
  title,
  subtitle,
  data,
  centerLabel,
  centerValue,
  totalLabel,
  totalValue,
  onSelect,
}: {
  title: string;
  subtitle?: string;
  data: { name: string; value: number }[];
  centerLabel: string;
  centerValue: string;
  totalLabel?: string;
  totalValue?: string;
  onSelect?: (name: string) => void;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const clickable = !!onSelect;
  return (
    <Card className="p-3 md:p-4 rounded-2xl shadow-sm border h-full">
      <div className="mb-3">
        <div className="text-sm font-semibold truncate">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div className="relative h-[180px] md:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: any, n: any) => [
                  `${fmtNum(Number(v))} (${total > 0 ? ((Number(v) / total) * 100).toFixed(1) : 0}%)`,
                  n,
                ]}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                cursor={clickable ? 'pointer' : 'default'}
                onClick={(d: any) => onSelect?.(String(d?.name ?? ''))}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{centerLabel}</div>
            <div className="text-base font-bold">{centerValue}</div>
          </div>
        </div>
        <div className="space-y-1.5 text-xs">
          {data.map((d, i) => {
            const pct = total > 0 ? (d.value / total) * 100 : 0;
            return (
              <button
                type="button"
                key={d.name}
                onClick={() => onSelect?.(d.name)}
                disabled={!clickable}
                className={cn(
                  'w-full flex items-center gap-2 text-left rounded px-1 py-0.5 -mx-1',
                  clickable && 'hover:bg-muted/60 cursor-pointer',
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                <span className="flex-1 truncate">{d.name}</span>
                <span className="tabular-nums text-muted-foreground">{fmtNum(d.value)}</span>
                <span className="tabular-nums font-medium w-12 text-right">{pct.toFixed(1)}%</span>
              </button>
            );
          })}
        </div>
      </div>
      {totalLabel && (
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{totalLabel}</span>
          <span className="font-semibold tabular-nums">{totalValue}</span>
        </div>
      )}
    </Card>
  );
}
