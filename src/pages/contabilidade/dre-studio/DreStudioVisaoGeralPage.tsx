import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { DreHealthBanner } from '@/components/dre-studio/DreHealthBanner';
import { DreFilters, type DreStudioFilters } from '@/components/dre-studio/DreFilters';
import { useResultadoCache } from '@/hooks/contabil/useDreStudio';
import { currentAnomes } from '@/lib/contabil/anomes';
import { Landmark, TrendingUp, ArrowUpRight, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function sumRow(r?: Record<string, number | null>): number {
  if (!r) return 0;
  return Object.values(r).reduce((s, v) => s + (v != null && Number.isFinite(v) ? v : 0), 0);
}

const KPI_MATCHERS: Array<{ label: string; test: (desc: string) => boolean }> = [
  { label: 'Receita Bruta', test: (d) => /receita.*brut/i.test(d) },
  { label: 'Receita Líquida', test: (d) => /receita.*liq/i.test(d) },
  { label: 'Lucro Bruto', test: (d) => /lucro.*brut/i.test(d) },
  { label: 'EBITDA', test: (d) => /ebitda/i.test(d) },
  { label: 'Resultado Operacional', test: (d) => /resultado.*opera/i.test(d) },
  { label: 'Resultado Líquido', test: (d) => /resultado.*(liq|final|antes.*trib)|lucro.*liq/i.test(d) },
];

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DreStudioVisaoGeralPage() {
  const nav = useNavigate();
  const ano = Math.floor(currentAnomes() / 100);
  const [filters, setFilters] = useState<DreStudioFilters>({
    codemp: 1,
    codfil: null,
    modelo_id: null,
    anomes_ini: ano * 100 + 1,
    anomes_fim: currentAnomes(),
    codccu: null,
  });

  const resultadoQ = useResultadoCache({
    modelo_id: filters.modelo_id ?? '',
    codemp: filters.codemp,
    codfil: filters.codfil ?? undefined,
    anomes_ini: filters.anomes_ini,
    anomes_fim: filters.anomes_fim,
    codccu: filters.codccu,
  }, !!filters.modelo_id);

  const kpis = useMemo(() => {
    const linhas = resultadoQ.data?.linhas ?? [];
    return KPI_MATCHERS.map(({ label, test }) => {
      const linha = linhas.find((l) => test(l.descricao));
      if (!linha) return null;
      const real = sumRow(linha.realizado);
      const orc = sumRow(linha.orcado);
      const varR = real - orc;
      const varP = orc ? (varR / orc) * 100 : null;
      return { label, real, orc, varR, varP };
    }).filter(Boolean) as { label: string; real: number; orc: number; varR: number; varP: number | null }[];
  }, [resultadoQ.data]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Landmark className="h-5 w-5" /> DRE Studio — Visão Geral</h1>
          <p className="text-xs text-muted-foreground">Indicadores executivos com base no modelo selecionado.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => nav('/contabilidade/dre-studio/modelos')}>
            <Settings2 className="h-3.5 w-3.5 mr-1" /> Modelos
          </Button>
          <Button size="sm" onClick={() => nav('/contabilidade/dre-studio/resultado')}>
            <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> Ver resultado detalhado
          </Button>
        </div>
      </div>

      <DreHealthBanner />
      <DreFilters value={filters} onChange={setFilters} onApply={() => resultadoQ.refetch()} />

      {!filters.modelo_id && (
        <Card className="p-6 text-sm text-muted-foreground">Selecione um modelo de DRE para ver os indicadores.</Card>
      )}

      {filters.modelo_id && resultadoQ.isFetching && (
        <Card className="p-6 text-sm text-muted-foreground">Carregando dados…</Card>
      )}

      {filters.modelo_id && resultadoQ.error && (
        <Card className="p-6 text-sm text-destructive">{(resultadoQ.error as any)?.message}</Card>
      )}

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {kpis.map((k) => (
            <Card key={k.label} className="p-4">
              <div className="flex items-start justify-between">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</div>
                <TrendingUp className={`h-4 w-4 ${k.varR >= 0 ? 'text-emerald-500' : 'text-destructive'}`} />
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{fmt(k.real)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Orçado: <span className="tabular-nums">{fmt(k.orc)}</span>
                {' · '}Var: <span className={k.varR >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                  {fmt(k.varR)}{k.varP != null ? ` (${k.varP.toFixed(1)}%)` : ''}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {filters.modelo_id && !resultadoQ.isFetching && kpis.length === 0 && !resultadoQ.error && (
        <Card className="p-6 text-sm text-muted-foreground">
          Este modelo ainda não possui linhas suficientes para calcular indicadores executivos, ou não foram encontrados valores para o período.
        </Card>
      )}
    </div>
  );
}
