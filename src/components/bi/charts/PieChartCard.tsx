import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { BI_PALETTE } from '../utils/chartHelpers';
import { BarChartDatum } from './BarChartCard';

export interface PieChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  donut?: boolean;
  centerLabel?: string;
  centerValue?: string;
  onItemClick?: (d: BarChartDatum) => void;
}

export function PieChartCard({
  data, valueFormatter = formatCurrency, donut, centerLabel, centerValue, onItemClick, height = 280, ...shell
}: PieChartCardProps) {
  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="valor" nameKey="label" cx="50%" cy="50%"
              innerRadius={donut ? 55 : 0} outerRadius={90} paddingAngle={donut ? 2 : 0}
              cursor={onItemClick ? 'pointer' : undefined}
              onClick={(d: any) => onItemClick?.(d as BarChartDatum)}
            >
              {data.map((_, i) => <Cell key={i} fill={BI_PALETTE[i % BI_PALETTE.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => valueFormatter(v)}
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
        {donut && (centerLabel || centerValue) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-10">
            {centerLabel && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{centerLabel}</span>}
            {centerValue && <span className="text-sm font-bold tabular-nums">{centerValue}</span>}
          </div>
        )}
      </div>
    </ChartCardShell>
  );
}
