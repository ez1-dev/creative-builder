import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { ChartCardShell, ChartCardShellProps } from './ChartCardShell';
import { formatCurrency } from '../utils/formatters';
import { BI_PALETTE } from '../utils/chartHelpers';
import { BarChartDatum } from './BarChartCard';
import { mergeVisualConfig, formatDataLabel, legendPositionProps, fontFamilyCss } from '@/lib/bi/visualConfig';

export interface PieChartCardProps extends Omit<ChartCardShellProps, 'children' | 'isEmpty'> {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  donut?: boolean;
  centerLabel?: string;
  centerValue?: string;
  onItemClick?: (d: BarChartDatum) => void;
}

export function PieChartCard({
  data, valueFormatter = formatCurrency, donut, centerLabel, centerValue, onItemClick, height = 280, visualConfig, ...shell
}: PieChartCardProps) {
  const vc = mergeVisualConfig(visualConfig);
  const fmtLabel = (v: any) => formatDataLabel(v, vc.dataLabels);
  return (
    <ChartCardShell {...shell} height={height} isEmpty={!data?.length} visualConfig={visualConfig}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="valor" nameKey="label" cx="50%" cy="50%"
              innerRadius={donut ? 55 : 0} outerRadius={90} paddingAngle={donut ? 2 : 0}
              cursor={onItemClick ? 'pointer' : undefined}
              onClick={(d: any) => onItemClick?.(d as BarChartDatum)}
            >
              {data.map((_, i) => <Cell key={i} fill={BI_PALETTE[i % BI_PALETTE.length]} />)}
              {vc.dataLabels.visible && (
                <LabelList dataKey="valor" position={vc.dataLabels.position === 'inside' ? 'inside' : 'outside'}
                  style={{ fontSize: vc.dataLabels.fontSize, fontFamily: fontFamilyCss(vc.dataLabels.fontFamily), fill: 'hsl(var(--foreground))' }}
                  formatter={fmtLabel as any} />
              )}
            </Pie>
            {vc.tooltip.visible && (
              <Tooltip formatter={(v: number) => vc.dataLabels.visible ? fmtLabel(v) : valueFormatter(v)}
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
            )}
            {vc.legend.visible && (
              <Legend {...legendPositionProps(vc.legend.position)} wrapperStyle={{ fontSize: vc.legend.fontSize, fontFamily: fontFamilyCss(vc.legend.fontFamily) }} />
            )}
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
