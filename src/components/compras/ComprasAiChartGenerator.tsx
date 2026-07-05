/**
 * Painel colapsável "Gerar gráfico com IA" para o Painel de Compras.
 * Consome POST /api/compras/ia-grafico e reaproveita cartões da Biblioteca BI.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  DonutChartCard, PieChartCard, BarChartCard, LineChartCard,
  formatCurrency, formatNumber,
} from '@/components/bi';
import { toast } from 'sonner';
import {
  gerarGraficoIACompras,
  type ComprasIaChartResult,
  type ComprasIaMetrica,
  type ComprasIaDimensao,
} from '@/lib/bi/comprasIaChartApi';

interface Props {
  filtrosAtivos: Record<string, any>;
  onDrill?: (nivel: string, chave: any, label?: string) => void;
}

const EXEMPLOS = [
  'Top 10 fornecedores por valor comprado',
  'Evolução mensal das compras',
  'Valor pendente por projeto (top 10)',
  'Compras por centro de custo',
  'Top 5 famílias por valor recebido',
  'Quantidade de OCs por mês',
];

const METRICA_LABEL: Record<ComprasIaMetrica, string> = {
  comprado: 'Valor Comprado',
  pendente: 'Valor Pendente',
  recebido: 'Valor Recebido',
  qtd_ocs: 'Nº de OCs',
  qtd_itens: 'Nº de Itens',
};

const DIM_LABEL: Record<ComprasIaDimensao, string> = {
  fornecedor: 'Fornecedor',
  projeto: 'Projeto',
  centro_custo: 'Centro de Custo',
  mes: 'Mês',
  oc: 'Ordem de Compra',
  item: 'Item',
  familia: 'Família',
  origem: 'Origem',
};

function isMonetaria(m: ComprasIaMetrica) {
  return m === 'comprado' || m === 'pendente' || m === 'recebido';
}
function fmtMetrica(m: ComprasIaMetrica) {
  return (v: number) => (isMonetaria(m) ? formatCurrency(v) : formatNumber(v));
}

export function ComprasAiChartGenerator({ filtrosAtivos, onDrill }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComprasIaChartResult | null>(null);

  const submit = async () => {
    if (loading) return;
    if (!prompt.trim()) {
      toast.error('Digite o pedido do gráfico antes de gerar.');
      return;
    }
    setLoading(true);
    try {
      const data = await gerarGraficoIACompras(prompt, filtrosAtivos);
      setResult(data);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao gerar gráfico de compras');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (serie: any) => {
    if (!onDrill || !serie) return;
    const drill = serie.filtros_drill ?? null;
    if (drill && typeof drill === 'object') {
      const entries = Object.entries(drill);
      if (entries.length) {
        const [k, v] = entries[0];
        if (k && v != null) {
          onDrill(k, v, String(serie.label ?? v));
          return;
        }
      }
    }
    // fallback: mapear dimensão → chave do painel
    if (!result) return;
    const map: Record<ComprasIaDimensao, string> = {
      fornecedor: 'fantasia_fornecedor',
      projeto: 'numero_projeto',
      centro_custo: 'centro_custo',
      mes: 'mes_competencia_calc',
      oc: 'numero_oc',
      item: 'codigo_item',
      familia: 'codigo_familia',
      origem: 'origem_material',
    };
    const nivel = map[result.dimensao];
    if (nivel) onDrill(nivel, serie.label, serie.label);
  };

  const renderDiagnostico = () => {
    if (!result) return null;
    const diag = result.diagnostico ?? {};
    const filtros = { ...(result.filtros ?? {}), ...(diag.filtros_aplicados ?? {}) };
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-4 text-xs space-y-2">
        <div className="font-medium text-foreground">Nenhum dado encontrado com os filtros aplicados.</div>
        <ul className="space-y-1 text-muted-foreground">
          <li><span className="text-foreground/80">dimensão:</span> {DIM_LABEL[result.dimensao] ?? result.dimensao}</li>
          <li><span className="text-foreground/80">métrica:</span> {METRICA_LABEL[result.metrica] ?? result.metrica}</li>
          {typeof diag.linhas_view === 'number' && (
            <li><span className="text-foreground/80">linhas na base:</span> {diag.linhas_view.toLocaleString('pt-BR')}</li>
          )}
          {typeof diag.linhas_filtradas === 'number' && (
            <li><span className="text-foreground/80">linhas após filtro:</span> {diag.linhas_filtradas.toLocaleString('pt-BR')}</li>
          )}
          {Object.keys(filtros).length > 0 && (
            <li>
              <span className="text-foreground/80">Filtros aplicados:</span>{' '}
              {Object.entries(filtros).map(([k, v]) => `${k}=${v}`).join(', ')}
            </li>
          )}
        </ul>
        <p className="text-[10px] text-muted-foreground">
          Ajuste os filtros do painel ou refraseie o pedido.
        </p>
      </div>
    );
  };

  const renderChart = () => {
    if (!result) return null;
    const series = Array.isArray(result.series) ? result.series : [];
    if (series.length === 0) return renderDiagnostico();
    const data = series.map((s) => ({ label: s.label, valor: s.valor, _raw: s }));
    const fmt = fmtMetrica(result.metrica);
    const totalFmt = fmt(result.total ?? 0);
    const subtitle =
      result.subtitulo ||
      `${DIM_LABEL[result.dimensao] ?? result.dimensao} • ${METRICA_LABEL[result.metrica] ?? result.metrica} • Total: ${totalFmt}`;
    const visualConfig = {
      legend: { visible: true, position: 'bottom' as const },
      tooltip: { visible: true },
      dataLabels: {
        visible: result.tipo_grafico === 'donut' || result.tipo_grafico === 'pie',
        format: 'percent' as const,
        position: 'outside' as const,
      },
    } as any;

    switch (result.tipo_grafico) {
      case 'donut':
        return (
          <DonutChartCard
            title={result.titulo}
            subtitle={subtitle}
            data={data}
            valueFormatter={fmt}
            centerLabel="Total"
            centerValue={totalFmt}
            onItemClick={(d: any) => handleClick(d?._raw ?? d)}
            visualConfig={visualConfig}
            height={340}
          />
        );
      case 'pie':
        return (
          <PieChartCard
            title={result.titulo}
            subtitle={subtitle}
            data={data}
            valueFormatter={fmt}
            onItemClick={(d: any) => handleClick(d?._raw ?? d)}
            visualConfig={visualConfig}
            height={340}
          />
        );
      case 'line':
        return (
          <LineChartCard
            title={result.titulo}
            subtitle={subtitle}
            data={data}
            valueFormatter={fmt}
            visualConfig={visualConfig}
            height={320}
          />
        );
      case 'bar':
      default:
        return (
          <BarChartCard
            title={result.titulo}
            subtitle={subtitle}
            data={data}
            valueFormatter={fmt}
            onItemClick={(d: any) => handleClick(d?._raw ?? d)}
            visualConfig={visualConfig}
            height={320}
          />
        );
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Análise Gerencial com IA
            <span className="text-[10px] font-normal text-muted-foreground">
              (gráfico sob demanda)
            </span>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {open ? 'Fechar' : 'Abrir'}
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          <Textarea
            rows={2}
            placeholder="Ex: Top 10 fornecedores por valor comprado no período filtrado."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
            }}
            className="text-xs"
            maxLength={1000}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {EXEMPLOS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="text-[10px] px-2 py-0.5 rounded-full border bg-background hover:border-primary text-muted-foreground hover:text-foreground transition"
              >
                {ex}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              {result && (
                <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => { setResult(null); setPrompt(''); }}>
                  <X className="h-3 w-3" /> Limpar
                </Button>
              )}
              <Button size="sm" onClick={submit} disabled={loading || !prompt.trim()} className="h-7 gap-1">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {loading ? 'Gerando…' : 'Gerar gráfico'}
              </Button>
            </div>
          </div>

          {result && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <Badge variant="outline">{result.tipo_grafico}</Badge>
                <Badge variant="outline">{METRICA_LABEL[result.metrica] ?? result.metrica}</Badge>
                <Badge variant="outline">{DIM_LABEL[result.dimensao] ?? result.dimensao}</Badge>
                {Object.entries(result?.filtros ?? {}).slice(0, 6).map(([k, v]) => (
                  <Badge key={k} variant="secondary" className="font-normal">
                    <span className="text-muted-foreground mr-1">{k}:</span>{String(v)}
                  </Badge>
                ))}
              </div>
              {renderChart()}
              {onDrill && result.tipo_grafico !== 'line' && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Clique em uma fatia/barra para detalhar
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
