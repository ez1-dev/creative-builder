import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';

export interface HeatmapDatum { row: string; col: string; value: number }

export interface HeatmapChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: HeatmapDatum[];
  rows?: string[];
  cols?: string[];
  valueFormatter?: (v: number) => string;
}

export function HeatmapChartCard({ data, rows, cols, valueFormatter = (v) => String(v), height = 280, ...shell }: HeatmapChartCardProps) {
  const isEmpty = !data?.length;
  const allRows = rows ?? Array.from(new Set(data.map((d) => d.row)));
  const allCols = cols ?? Array.from(new Set(data.map((d) => d.col)));
  const max = Math.max(...data.map((d) => d.value), 1);
  const map = new Map(data.map((d) => [`${d.row}|${d.col}`, d.value]));

  return (
    <ChartCardShell {...shell} height={height} isEmpty={isEmpty}>
      <div className="overflow-auto" style={{ maxHeight: height }}>
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="p-1"></th>
              {allCols.map((c) => (
                <th key={c} className="p-1 text-muted-foreground font-normal">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRows.map((r) => (
              <tr key={r}>
                <td className="p-1 text-muted-foreground whitespace-nowrap pr-2">{r}</td>
                {allCols.map((c) => {
                  const v = map.get(`${r}|${c}`) ?? 0;
                  const intensity = v / max;
                  return (
                    <td key={c} className="p-0.5">
                      <div
                        title={`${r} × ${c}: ${valueFormatter(v)}`}
                        className="aspect-square min-w-[20px] rounded-sm flex items-center justify-center text-[9px] font-medium"
                        style={{
                          backgroundColor: `hsl(var(--primary) / ${0.08 + intensity * 0.85})`,
                          color: intensity > 0.5 ? 'white' : 'hsl(var(--foreground))',
                        }}
                      >
                        {v > 0 && intensity > 0.15 ? v : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCardShell>
  );
}
