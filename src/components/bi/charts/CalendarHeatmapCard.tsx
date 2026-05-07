import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';

export interface CalendarHeatmapDatum { date: string; value: number }

export interface CalendarHeatmapCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: CalendarHeatmapDatum[];
  weeks?: number;
}

export function CalendarHeatmapCard({ data, weeks = 26, height = 160, ...shell }: CalendarHeatmapCardProps) {
  const isEmpty = !data?.length;
  const map = new Map(data.map((d) => [d.date, d.value]));
  const max = Math.max(...data.map((d) => d.value), 1);

  const today = new Date();
  const days: { date: string; value: number }[] = [];
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, value: map.get(key) ?? 0 });
  }
  const grid: typeof days[] = [];
  for (let w = 0; w < weeks; w++) grid.push(days.slice(w * 7, (w + 1) * 7));

  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty}>
      <div className="flex gap-0.5 overflow-x-auto" style={{ height }}>
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((d) => {
              const intensity = d.value / max;
              return (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.value}`}
                  className="h-3 w-3 rounded-[2px]"
                  style={{ backgroundColor: d.value > 0 ? `hsl(var(--primary) / ${0.15 + intensity * 0.85})` : 'hsl(var(--muted))' }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </ChartCardShell>
  );
}
