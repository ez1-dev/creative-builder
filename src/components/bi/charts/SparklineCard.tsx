import { ResponsiveContainer, LineChart, Line } from 'recharts';

export interface SparklineCardProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export function SparklineCard({ data, color = 'hsl(var(--primary))', height = 40, className }: SparklineCardProps) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
