import { Card } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, Building2, Sparkles, Lightbulb, ArrowRight } from 'lucide-react';
import type { RecursoAgg } from './aggregations';
import { aggByKey, fmtDec, fmtNum } from './aggregations';
import type { CargaCentroRow } from '@/lib/producao/cargaApi';
import { cn } from '@/lib/utils';

interface Props {
  recursos: RecursoAgg[];
  rows: CargaCentroRow[];
  semMapeamento: number;
  onVerTodasObras?: () => void;
}

type Insight = {
  kind: 'critical' | 'warn' | 'info' | 'success';
  icon: any;
  title: string;
  body: string;
};

function buildInsights({ recursos, rows, semMapeamento }: Pick<Props, 'recursos' | 'rows' | 'semMapeamento'>): Insight[] {
  const out: Insight[] = [];
  if (!recursos.length) return out;

  const top = recursos[0];
  out.push({
    kind: 'warn',
    icon: TrendingUp,
    title: `${top.descre || top.codcre} concentra a maior carga`,
    body: `${fmtDec(top.carga_prevista_horas)} h previstos · ${fmtNum(top.qtd_ops)} OPs · unidade ${top.unidade_negocio}.`,
  });

  const porUnidade = aggByKey(rows, 'unidade_negocio');
  if (porUnidade.length) {
    const totalH = porUnidade.reduce((a, b) => a + b.carga_horas, 0);
    const u = porUnidade[0];
    const pct = totalH > 0 ? (u.carga_horas / totalH) * 100 : 0;
    out.push({
      kind: 'info',
      icon: Building2,
      title: `Unidade ${u.name}: ${pct.toFixed(1)}% da carga`,
      body: `${fmtDec(u.carga_horas)} h de ${fmtDec(totalH)} h totais.`,
    });
  }

  if (semMapeamento > 0) {
    out.push({
      kind: 'info',
      icon: AlertTriangle,
      title: 'Linhas classificadas por regra automática',
      body: `${fmtNum(semMapeamento)} linhas foram classificadas automaticamente por centro de custo ou origem da OP.`,
    });
  }

  const horas = recursos.map((r) => r.carga_prevista_horas);
  if (horas.length >= 3) {
    const media = horas.reduce((a, b) => a + b, 0) / horas.length;
    const desvio = Math.sqrt(horas.reduce((a, h) => a + (h - media) ** 2, 0) / horas.length);
    const limite = media + desvio;
    const concentrados = recursos.filter((r) => r.carga_prevista_horas >= limite);
    if (concentrados.length >= 2) {
      out.push({
        kind: 'warn',
        icon: Sparkles,
        title: `${concentrados.length} recursos acima da média + 1σ`,
        body: concentrados.slice(0, 4).map((r) => r.descre || r.codcre).join(', '),
      });
    }
  }

  if (out.length === 0) {
    out.push({
      kind: 'success',
      icon: Lightbulb,
      title: 'Sem alertas no período',
      body: 'Distribuição de carga uniforme entre os recursos.',
    });
  }

  return out;
}

const kindStyles: Record<Insight['kind'], string> = {
  critical: 'border-l-destructive bg-destructive/5',
  warn: 'border-l-amber-500 bg-amber-500/5',
  info: 'border-l-primary bg-primary/5',
  success: 'border-l-emerald-500 bg-emerald-500/5',
};

const iconStyles: Record<Insight['kind'], string> = {
  critical: 'text-destructive',
  warn: 'text-amber-600 dark:text-amber-500',
  info: 'text-primary',
  success: 'text-emerald-600 dark:text-emerald-500',
};

export function InsightsPanel({ recursos, rows, semMapeamento, onVerTodasObras }: Props) {
  const insights = buildInsights({ recursos, rows, semMapeamento });
  return (
    <Card className="p-4 rounded-2xl shadow-sm border h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">7. Insights e alertas</div>
      </div>
      <div className="space-y-2 flex-1">
        {insights.map((it, i) => (
          <div key={i} className={cn('rounded-lg border-l-4 p-2.5', kindStyles[it.kind])}>
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  'h-5 w-5 rounded-full bg-card border flex items-center justify-center text-[10px] font-semibold tabular-nums shrink-0',
                  iconStyles[it.kind],
                )}
              >
                {i + 1}
              </span>
              <it.icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconStyles[it.kind])} />
              <div className="min-w-0">
                <div className="text-xs font-semibold">{it.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 break-words">{it.body}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {onVerTodasObras && (
        <button
          type="button"
          onClick={onVerTodasObras}
          className="mt-3 self-end text-xs font-medium text-primary hover:underline flex items-center gap-1 transition-colors"
        >
          Ver todas as obras <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </Card>
  );
}
