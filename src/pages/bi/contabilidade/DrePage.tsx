import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/erp/PageHeader';
import { KpiGrid } from '@/components/bi/kpis/KpiGrid';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatPercent } from '@/components/bi/utils/formatters';
import { toast } from 'sonner';
import { RefreshCw, TrendingUp, DollarSign, BarChart3, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageDataProvider } from '@/lib/bi/PageDataContext';
import { UserWidgetsSlot } from '@/components/bi';

type Unidade = 'TODOS' | 'GENIUS' | 'ESTRUTURAL' | 'OUTROS';

interface DreLinha {
  ordem?: number;
  mascara?: string;
  descricao?: string;
  totalizadora?: boolean;
  nivel?: number;
  [k: string]: any; // jan_realizado, jan_av, jan_orcado, ..., total_realizado, total_av, total_orcado
}

const MESES: { key: string; label: string }[] = [
  { key: 'jan', label: 'Janeiro' },
  { key: 'fev', label: 'Fevereiro' },
  { key: 'mar', label: 'Março' },
  { key: 'abr', label: 'Abril' },
  { key: 'mai', label: 'Maio' },
  { key: 'jun', label: 'Junho' },
  { key: 'jul', label: 'Julho' },
  { key: 'ago', label: 'Agosto' },
  { key: 'set', label: 'Setembro' },
  { key: 'out', label: 'Outubro' },
  { key: 'nov', label: 'Novembro' },
  { key: 'dez', label: 'Dezembro' },
  { key: 'total', label: 'TOTAL' },
];

const TOTALIZADORAS = new Set([
  'RECEITA LÍQUIDA', 'RECEITA LIQUIDA',
  'LUCRO BRUTO', 'EBITDA', 'EBIT',
  'RESULTADO DO EXERCÍCIO', 'RESULTADO DO EXERCICIO',
]);

const fmtSigned = (v: number | null | undefined) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
  const n = Number(v);
  if (n < 0) return `(${formatCurrency(Math.abs(n))})`;
  return formatCurrency(n);
};

const fmtSignedPct = (v: number | null | undefined) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
  const n = Number(v);
  if (n < 0) return `(${formatPercent(Math.abs(n))})`;
  return formatPercent(n);
};

const currentYear = new Date().getFullYear();

function findLinhaByDesc(linhas: DreLinha[], needles: string[]): DreLinha | undefined {
  return linhas.find((l) => {
    const d = String(l.descricao ?? '').trim().toUpperCase();
    return needles.some((n) => d === n || d.startsWith(n));
  });
}

export default function DrePage() {
  const [ano, setAno] = useState<number>(currentYear);
  const [unidade, setUnidade] = useState<Unidade>('TODOS');
  const [loading, setLoading] = useState(false);
  const [linhas, setLinhas] = useState<DreLinha[]>([]);

  const fetchDre = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('bi_dre_matriz_anual' as any, {
        p_ano: ano,
        p_unidade_negocio: unidade === 'TODOS' ? null : unidade,
      });
      if (error) throw error;
      setLinhas((data as DreLinha[]) ?? []);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao carregar DRE');
      setLinhas([]);
    } finally {
      setLoading(false);
    }
  };

  const isTotalizadora = (l: DreLinha) => {
    if (l.totalizadora) return true;
    const nome = String(l.descricao ?? '').trim().toUpperCase();
    return TOTALIZADORAS.has(nome);
  };

  // KPIs derivados das linhas totalizadoras
  const lReceita = findLinhaByDesc(linhas, ['RECEITA BRUTA']);
  const lLucroBruto = findLinhaByDesc(linhas, ['LUCRO BRUTO']);
  const lEbitda = findLinhaByDesc(linhas, ['EBITDA']);
  const lLiquido = findLinhaByDesc(linhas, ['RESULTADO DO EXERCÍCIO', 'RESULTADO DO EXERCICIO', 'LUCRO LÍQUIDO', 'LUCRO LIQUIDO']);

  const negClass = (v: any) => (v != null && Number(v) < 0 ? 'text-destructive' : '');

  return (
    <PageDataProvider
      pageKey="contabilidade-dre"
      kpis={{}}
      series={{}}
      rows={linhas}
      filtros={{ ano, unidade }}
    >
      <div className="space-y-4 p-4">
        <PageHeader
          title="Contabilidade — DRE"
          description="Demonstração do Resultado em formato matriz mensal (RPC bi_dre_matriz_anual)."
        />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 items-end">
              <div>
                <Label className="text-xs">Ano</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value) || currentYear)}
                />
              </div>
              <div>
                <Label className="text-xs">Unidade de negócio</Label>
                <Select value={unidade} onValueChange={(v) => setUnidade(v as Unidade)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="GENIUS">GENIUS</SelectItem>
                    <SelectItem value="ESTRUTURAL">Estrutural</SelectItem>
                    <SelectItem value="OUTROS">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-start-4">
                <Button size="sm" className="h-8 w-full" onClick={fetchDre} disabled={loading}>
                  <RefreshCw className={cn('h-3.5 w-3.5 mr-1', loading && 'animate-spin')} />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <KpiGrid cols={4}>
          <KpiCard
            title="Receita Bruta"
            value={fmtSigned(lReceita?.total_realizado ?? 0)}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KpiCard
            title="Lucro Bruto"
            value={fmtSigned(lLucroBruto?.total_realizado ?? 0)}
            subtitle={lLucroBruto?.total_av != null ? fmtSignedPct(Number(lLucroBruto.total_av)) : undefined}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard
            title="EBITDA"
            value={fmtSigned(lEbitda?.total_realizado ?? 0)}
            subtitle={lEbitda?.total_av != null ? fmtSignedPct(Number(lEbitda.total_av)) : undefined}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <KpiCard
            title="Lucro Líquido"
            value={fmtSigned(lLiquido?.total_realizado ?? 0)}
            subtitle={lLiquido?.total_av != null ? fmtSignedPct(Number(lLiquido.total_av)) : undefined}
            icon={<PiggyBank className="h-4 w-4" />}
          />
        </KpiGrid>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Demonstração do Resultado — {ano}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[70vh] relative">
              <table className="text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="bg-muted">
                    <th
                      rowSpan={2}
                      className="sticky left-0 top-0 z-40 bg-muted px-3 py-2 text-left font-semibold border-b border-r min-w-[260px]"
                    >
                      Máscara / Linha
                    </th>
                    {MESES.map((m) => (
                      <th
                        key={m.key}
                        colSpan={3}
                        className={cn(
                          'sticky top-0 z-30 bg-muted px-3 py-2 text-center font-semibold border-b border-l',
                          m.key === 'total' && 'bg-primary/15',
                        )}
                      >
                        {m.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-muted">
                    {MESES.map((m) => (
                      <>
                        <th key={`${m.key}-r`} className={cn('sticky top-[34px] z-30 bg-muted px-2 py-1 text-right font-medium border-b border-l', m.key === 'total' && 'bg-primary/15')}>
                          Realizado
                        </th>
                        <th key={`${m.key}-av`} className={cn('sticky top-[34px] z-30 bg-muted px-2 py-1 text-right font-medium border-b', m.key === 'total' && 'bg-primary/15')}>
                          A.V.
                        </th>
                        <th key={`${m.key}-o`} className={cn('sticky top-[34px] z-30 bg-muted px-2 py-1 text-right font-medium border-b', m.key === 'total' && 'bg-primary/15')}>
                          Orçado
                        </th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.length === 0 && (
                    <tr>
                      <td colSpan={1 + MESES.length * 3} className="px-3 py-6 text-center text-muted-foreground">
                        {loading ? 'Carregando...' : 'Selecione o ano e clique em Atualizar.'}
                      </td>
                    </tr>
                  )}
                  {linhas.map((l, i) => {
                    const total = isTotalizadora(l);
                    const rowBg = total ? 'bg-primary/10 font-semibold' : i % 2 === 0 ? 'bg-background' : 'bg-muted/30';
                    const stickyBg = total ? 'bg-primary/10' : i % 2 === 0 ? 'bg-background' : 'bg-muted/30';
                    const indent = Math.max(0, (l.nivel ?? 0) - 1) * 12;
                    return (
                      <tr key={i} className={cn('border-t', rowBg)}>
                        <td
                          className={cn(
                            'sticky left-0 z-20 px-3 py-1.5 border-r border-b whitespace-nowrap',
                            stickyBg,
                          )}
                        >
                          <span className="font-mono text-[10px] text-muted-foreground mr-2">{l.mascara ?? ''}</span>
                          <span style={{ paddingLeft: indent }}>{l.descricao ?? ''}</span>
                        </td>
                        {MESES.map((m) => {
                          const r = l[`${m.key}_realizado`];
                          const av = l[`${m.key}_av`];
                          const o = l[`${m.key}_orcado`];
                          const totalCol = m.key === 'total';
                          return (
                            <>
                              <td key={`${i}-${m.key}-r`} className={cn('px-2 py-1.5 text-right tabular-nums border-b border-l', negClass(r), totalCol && 'bg-primary/10 font-semibold')}>
                                {fmtSigned(r)}
                              </td>
                              <td key={`${i}-${m.key}-av`} className={cn('px-2 py-1.5 text-right tabular-nums border-b', negClass(av), totalCol && 'bg-primary/10 font-semibold')}>
                                {av != null ? fmtSignedPct(Number(av)) : '-'}
                              </td>
                              <td key={`${i}-${m.key}-o`} className={cn('px-2 py-1.5 text-right tabular-nums border-b', negClass(o), totalCol && 'bg-primary/10 font-semibold')}>
                                {fmtSigned(o)}
                              </td>
                            </>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 mt-4">
          <UserWidgetsSlot section="kpis" cols={4} emptyHint={false} />
          <UserWidgetsSlot section="charts" cols={2} emptyHint={false} />
          <UserWidgetsSlot section="tables" cols={1} emptyHint={false} />
        </div>
      </div>
    </PageDataProvider>
  );
}
