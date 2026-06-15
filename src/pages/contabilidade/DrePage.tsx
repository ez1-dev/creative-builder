import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/erp/PageHeader';
import { KpiGrid } from '@/components/bi/kpis/KpiGrid';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { BarChartCard } from '@/components/bi/charts/BarChartCard';
import { PieChartCard } from '@/components/bi/charts/PieChartCard';
import { api } from '@/lib/api';
import { formatCurrency, formatPercent } from '@/components/bi/utils/formatters';
import { toast } from 'sonner';
import { RefreshCw, TrendingUp, DollarSign, BarChart3, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';

type Unidade = 'TODOS' | 'GENIUS' | 'ESTRUTURAL' | 'OUTROS';

interface DreCards {
  receita_bruta?: number;
  lucro_bruto?: number;
  lucro_bruto_pct?: number;
  ebitda?: number;
  ebitda_pct?: number;
  lucro_liquido?: number;
  lucro_liquido_pct?: number;
}

interface DreLinha {
  mascara?: string;
  linha?: string;
  realizado?: number;
  av_realizado?: number;
  orcado?: number;
  av_orcado?: number;
  diferenca?: number;
  diferenca_pct?: number;
  totalizadora?: boolean;
}

interface DreSeriePoint { label: string; valor: number }
interface DreSeries {
  lucro_bruto_pct?: DreSeriePoint[];
  ebitda_pct?: DreSeriePoint[];
  ebit_pct?: DreSeriePoint[];
}

interface DreComposicaoItem { label: string; valor: number }

interface DreResponse {
  cards?: DreCards;
  linhas?: DreLinha[];
  composicao?: DreComposicaoItem[];
  series?: DreSeries;
}

const TOTALIZADORAS = new Set([
  'RECEITA LÍQUIDA',
  'RECEITA LIQUIDA',
  'LUCRO BRUTO',
  'EBITDA',
  'EBIT',
  'RESULTADO DO EXERCÍCIO',
  'RESULTADO DO EXERCICIO',
]);

const fmtSigned = (v: number | null | undefined) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '-';
  if (v < 0) return `(${formatCurrency(Math.abs(v))})`;
  return formatCurrency(v);
};

const fmtSignedPct = (v: number | null | undefined) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '-';
  if (v < 0) return `(${formatPercent(Math.abs(v))})`;
  return formatPercent(v);
};

const currentYear = new Date().getFullYear();

export default function DrePage() {
  const [anomesIni, setAnomesIni] = useState(`${currentYear}01`);
  const [anomesFim, setAnomesFim] = useState(`${currentYear}12`);
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [codigoFilial, setCodigoFilial] = useState('');
  const [unidade, setUnidade] = useState<Unidade>('TODOS');
  const [centroCusto, setCentroCusto] = useState('');
  const [loading, setLoading] = useState(false);

  const [cards, setCards] = useState<DreCards>({});
  const [linhas, setLinhas] = useState<DreLinha[]>([]);
  const [composicao, setComposicao] = useState<DreComposicaoItem[]>([]);
  const [series, setSeries] = useState<DreSeries>({});

  const fetchDre = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        anomes_ini: anomesIni,
        anomes_fim: anomesFim,
        unidade,
      };
      if (codigoEmpresa) params.codigo_empresa = codigoEmpresa;
      if (codigoFilial) params.codigo_filial = codigoFilial;
      if (centroCusto) params.centro_custo = centroCusto;
      const resp = await api.get<DreResponse>('/api/bi/contabilidade/dre', params);
      setCards(resp?.cards ?? {});
      setLinhas(resp?.linhas ?? []);
      setComposicao(resp?.composicao ?? []);
      setSeries(resp?.series ?? {});
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao carregar DRE');
      setCards({}); setLinhas([]); setComposicao([]); setSeries({});
    } finally {
      setLoading(false);
    }
  };

  const isTotalizadora = (l: DreLinha) => {
    if (l.totalizadora) return true;
    const nome = String(l.linha ?? '').trim().toUpperCase();
    return TOTALIZADORAS.has(nome);
  };

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Contabilidade — DRE"
        description="Demonstração do Resultado do Exercício consumida de /api/bi/contabilidade/dre."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7 items-end">
            <div>
              <Label className="text-xs">Competência inicial (AAAAMM)</Label>
              <Input className="h-8 text-xs" value={anomesIni} onChange={(e) => setAnomesIni(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Competência final (AAAAMM)</Label>
              <Input className="h-8 text-xs" value={anomesFim} onChange={(e) => setAnomesFim(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Empresa</Label>
              <Input className="h-8 text-xs" value={codigoEmpresa} onChange={(e) => setCodigoEmpresa(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Filial</Label>
              <Input className="h-8 text-xs" value={codigoFilial} onChange={(e) => setCodigoFilial(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Unidade</Label>
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
            <div>
              <Label className="text-xs">Centro de custo</Label>
              <Input className="h-8 text-xs" value={centroCusto} onChange={(e) => setCentroCusto(e.target.value)} />
            </div>
            <div>
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
          value={fmtSigned(cards.receita_bruta ?? 0)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Lucro Bruto"
          value={fmtSigned(cards.lucro_bruto ?? 0)}
          subtitle={cards.lucro_bruto_pct != null ? fmtSignedPct(cards.lucro_bruto_pct) : undefined}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title="EBITDA"
          value={fmtSigned(cards.ebitda ?? 0)}
          subtitle={cards.ebitda_pct != null ? fmtSignedPct(cards.ebitda_pct) : undefined}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <KpiCard
          title="Lucro Líquido"
          value={fmtSigned(cards.lucro_liquido ?? 0)}
          subtitle={cards.lucro_liquido_pct != null ? fmtSignedPct(cards.lucro_liquido_pct) : undefined}
          icon={<PiggyBank className="h-4 w-4" />}
        />
      </KpiGrid>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Demonstração do Resultado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Máscara</th>
                  <th className="px-3 py-2 text-left font-semibold">Linha DRE</th>
                  <th className="px-3 py-2 text-right font-semibold">Realizado</th>
                  <th className="px-3 py-2 text-right font-semibold">A.V. Real.</th>
                  <th className="px-3 py-2 text-right font-semibold">Orçado</th>
                  <th className="px-3 py-2 text-right font-semibold">A.V. Orç.</th>
                  <th className="px-3 py-2 text-right font-semibold">Diferença</th>
                  <th className="px-3 py-2 text-right font-semibold">Dif. %</th>
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                      {loading ? 'Carregando...' : 'Aplique os filtros e clique em Atualizar.'}
                    </td>
                  </tr>
                )}
                {linhas.map((l, i) => {
                  const total = isTotalizadora(l);
                  const negClass = (v?: number) => (v != null && v < 0 ? 'text-destructive' : '');
                  return (
                    <tr
                      key={i}
                      className={cn(
                        'border-t',
                        total ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/30',
                      )}
                    >
                      <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{l.mascara ?? ''}</td>
                      <td className="px-3 py-1.5">{l.linha ?? ''}</td>
                      <td className={cn('px-3 py-1.5 text-right tabular-nums', negClass(l.realizado))}>{fmtSigned(l.realizado)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.av_realizado != null ? fmtSignedPct(l.av_realizado) : '-'}</td>
                      <td className={cn('px-3 py-1.5 text-right tabular-nums', negClass(l.orcado))}>{fmtSigned(l.orcado)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.av_orcado != null ? fmtSignedPct(l.av_orcado) : '-'}</td>
                      <td className={cn('px-3 py-1.5 text-right tabular-nums', negClass(l.diferenca))}>{fmtSigned(l.diferenca)}</td>
                      <td className={cn('px-3 py-1.5 text-right tabular-nums', negClass(l.diferenca_pct))}>
                        {l.diferenca_pct != null ? fmtSignedPct(l.diferenca_pct) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarChartCard
          title="Lucro Bruto %"
          data={series.lucro_bruto_pct ?? []}
          valueFormatter={(v) => formatPercent(v)}
          color="hsl(var(--chart-1, var(--primary)))"
          height={260}
        />
        <BarChartCard
          title="EBITDA %"
          data={series.ebitda_pct ?? []}
          valueFormatter={(v) => formatPercent(v)}
          color="hsl(var(--chart-2, var(--primary)))"
          height={260}
        />
        <BarChartCard
          title="EBIT %"
          data={series.ebit_pct ?? []}
          valueFormatter={(v) => formatPercent(v)}
          color="hsl(var(--chart-3, var(--primary)))"
          height={260}
        />
        <PieChartCard
          title="Composição da DRE"
          data={composicao}
          height={260}
        />
      </div>
    </div>
  );
}
