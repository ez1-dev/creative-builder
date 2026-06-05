/**
 * Gauge semicircular de % de atingimento — estilo Upquery.
 * Arco segmentado vermelho → laranja → amarelo → verde com pequenos gaps,
 * ponteiro fino com pivô central, valor em destaque abaixo.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface GaugeAchievementCardProps {
  title?: string;
  /** Valor em percentual (ex.: 28.52 para 28,52%). */
  value: number | null | undefined;
  /** Máximo do arco (default 120%). */
  max?: number;
  className?: string;
}

const SEGMENT_COLORS = [
  'hsl(0 84% 55%)',     // vermelho
  'hsl(25 95% 55%)',    // laranja
  'hsl(48 95% 55%)',    // amarelo
  'hsl(142 70% 45%)',   // verde
];

// Geometria base (viewBox 200x115)
const CX = 100;
const CY = 100;
const R_OUTER = 80;
const R_INNER = 55;
const GAP_DEG = 3;
const ARC_DEG = 180;

const deg2rad = (d: number) => (d * Math.PI) / 180;

/** Path SVG de "rosca" entre os ângulos a0..a1 (180 = esquerda, 0 = direita). */
function arcSegmentPath(a0: number, a1: number): string {
  const r1 = deg2rad(a0);
  const r2 = deg2rad(a1);
  const x1o = CX + R_OUTER * Math.cos(r1);
  const y1o = CY - R_OUTER * Math.sin(r1);
  const x2o = CX + R_OUTER * Math.cos(r2);
  const y2o = CY - R_OUTER * Math.sin(r2);
  const x1i = CX + R_INNER * Math.cos(r2);
  const y1i = CY - R_INNER * Math.sin(r2);
  const x2i = CX + R_INNER * Math.cos(r1);
  const y2i = CY - R_INNER * Math.sin(r1);

  return [
    `M ${x1o} ${y1o}`,
    `A ${R_OUTER} ${R_OUTER} 0 0 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${R_INNER} ${R_INNER} 0 0 0 ${x2i} ${y2i}`,
    'Z',
  ].join(' ');
}

function buildSegments(n: number) {
  const totalGap = GAP_DEG * (n - 1);
  const segDeg = (ARC_DEG - totalGap) / n;
  const segs: { a0: number; a1: number; color: string }[] = [];
  for (let i = 0; i < n; i++) {
    const start = 180 - i * (segDeg + GAP_DEG);
    const end = start - segDeg;
    segs.push({ a0: start, a1: end, color: SEGMENT_COLORS[i] });
  }
  return segs;
}

const SEGMENTS = buildSegments(SEGMENT_COLORS.length);

export function GaugeAchievementCard({
  title, value, max = 120, className,
}: GaugeAchievementCardProps) {
  const v = Number(value ?? 0);
  const pct = Math.max(0, Math.min(1, v / max));
  const display = isFinite(v)
    ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  // Ponteiro: do centro até a borda interna do arco
  const needleAngle = deg2rad(180 - pct * ARC_DEG);
  const needleLen = R_INNER - 4;
  const tipX = CX + needleLen * Math.cos(needleAngle);
  const tipY = CY - needleLen * Math.sin(needleAngle);

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      {title && (
        <CardHeader className="pb-1">
          <CardTitle className="text-center text-sm 3xl:text-base font-semibold">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 flex flex-col items-center justify-center gap-2 py-2">
        <div className="relative w-full max-w-[280px] aspect-[200/115]">
          <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
            {SEGMENTS.map((s, i) => (
              <path key={i} d={arcSegmentPath(s.a0, s.a1)} fill={s.color} />
            ))}

            <line
              x1={CX}
              y1={CY}
              x2={tipX}
              y2={tipY}
              stroke="hsl(var(--foreground))"
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{ transition: 'all 700ms ease-out' }}
            />
            <circle cx={CX} cy={CY} r={7} fill="hsl(var(--foreground))" />
            <circle cx={CX} cy={CY} r={2.5} fill="hsl(var(--background))" />
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
