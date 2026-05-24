import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import type { RecursoAgg } from './aggregations';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function colorFor(pct: number) {
  if (pct > 95) return 'bg-destructive/80 text-destructive-foreground';
  if (pct > 80) return 'bg-orange-500/80 text-white';
  if (pct > 60) return 'bg-amber-400/80 text-amber-950';
  return 'bg-emerald-500/70 text-emerald-950';
}

// Mock determinístico a partir do recurso para visualização — sem dado real.
function fakeOcc(codcre: string, diaIdx: number) {
  let h = 0;
  for (const c of codcre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const base = (h % 50) + 40; // 40..89
  const wig = ((h >> diaIdx) % 25) - 10;
  return Math.max(20, Math.min(99, base + wig + diaIdx * 2));
}

export function HeatmapMock({ recursos }: { recursos: RecursoAgg[] }) {
  const top = recursos.slice(0, 10);
  return (
    <Card className="p-4 rounded-2xl shadow-sm border h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-semibold">Mapa de gargalos (ocupação % por dia da semana)</div>
          <div className="text-[11px] text-muted-foreground">Visualização mockada — aguardando endpoint /api/producao/carga/ocupacao-semanal</div>
        </div>
        <Badge variant="outline" className="text-[10px] flex items-center gap-1 shrink-0">
          <Info className="h-3 w-3" /> Dados de exemplo
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left font-medium text-muted-foreground py-1 pr-2">Recurso</th>
              {DIAS.map((d) => (
                <th key={d} className="font-medium text-muted-foreground py-1 px-1 text-center">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top.map((r) => (
              <tr key={r.codcre}>
                <td className="py-1 pr-2 truncate max-w-[180px]">{r.descre || r.codcre}</td>
                {DIAS.map((_, i) => {
                  const v = fakeOcc(r.codcre, i);
                  return (
                    <td key={i} className="px-0.5 py-0.5">
                      <div className={`rounded text-center py-1 font-medium ${colorFor(v)}`}>{v}%</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500/70" /> ≤ 60% Baixo</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-400/80" /> 60–80% Médio</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-orange-500/80" /> 80–95% Alto</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-destructive/80" /> &gt; 95% Crítico</span>
      </div>
    </Card>
  );
}
