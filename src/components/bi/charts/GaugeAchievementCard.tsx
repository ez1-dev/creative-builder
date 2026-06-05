/**
 * Gauge semicircular vermelho → amarelo → verde para % de atingimento.
 * Mostra o valor percentual em destaque abaixo do arco.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

export interface GaugeAchievementCardProps {
  title?: string;
  /** Valor em percentual (ex.: 21.81 para 21,81%). */
  value: number | null | undefined;
  /** Máximo do arco (default 120%). */
  max?: number;
  className?: string;
}

const SEGMENTS = [
  { value: 25, color: 'hsl(0 84% 55%)' },     // vermelho
  { value: 25, color: 'hsl(25 95% 55%)' },    // laranja
  { value: 25, color: 'hsl(48 95% 55%)' },    // amarelo
  { value: 25, color: 'hsl(142 70% 45%)' },   // verde
];

function NeedleAt(pct: number, cx: number, cy: number, r: number) {
  // pct 0..1 → ângulo 180° (esquerda) → 0° (direita)
  const angle = Math.PI * (1 - pct);
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  return { x, y };
}

export function GaugeAchievementCard({
  title, value, max = 120, className,
}: GaugeAchievementCardProps) {
  const v = Number(value ?? 0);
  const pct = Math.max(0, Math.min(1, v / max));
  const display = isFinite(v) ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';

  // Geometria do ponteiro (relativa ao container 200x100)
  const cx = 100, cy = 95, needleR = 70;
  const tip = NeedleAt(pct, cx, cy, needleR);

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      {title && (
        <CardHeader className="pb-1">
          <CardTitle className="text-center text-sm 3xl:text-base font-semibold">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 flex flex-col items-center justify-center gap-1 py-2">
        <div className="relative w-full max-w-[260px] aspect-[2/1.15]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={SEGMENTS}
                dataKey="value"
                cx="50%"
                cy="92%"
                startAngle={180}
                endAngle={0}
                innerRadius="55%"
                outerRadius="100%"
                stroke="none"
                isAnimationActive={false}
              >
                {SEGMENTS.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Ponteiro */}
          <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1={cx} y1={cy} x2={tip.x} y2={tip.y}
              stroke="hsl(var(--foreground))" strokeWidth={2.5} strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r={6} fill="hsl(var(--foreground))" />
          </svg>
        </div>
        <div
          data-widget-value
          className="text-xl 3xl:text-3xl 4xl:text-4xl font-bold tabular-nums tracking-tight border-t w-full text-center pt-1"
        >
          {display} %
        </div>
      </CardContent>
    </Card>
  );
}
