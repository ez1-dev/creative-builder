import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DonutChartCard, PieChartCard, BarChartCard, LineChartCard,
  formatCurrency, formatNumber,
} from '@/components/bi';
import { gerarGraficoIA, type AiChartResult, type AiDimensao, type AiMetrica } from '@/lib/bi/iaChartApi';
import { toast } from 'sonner';

interface Props {
  filtrosBase: Record<string, any>;
  onDrill?: (dimensao: AiDimensao, label: string) => void;
}

const EXEMPLOS = [
  'Crie um gráfico de rosca mostrando o faturamento da Genius separado por Peças e Serviços com percentual.',
  'Mostre as Top 10 revendas por faturamento em barras.',
  'Evolução mensal do faturamento em linha.',
  'Top 10 estados por número de vendas.',
];

const METRICA_LABEL: Record<AiMetrica, string> = {
  faturamento: 'Faturamento',
  faturamento_liquido: 'Faturamento Líquido',
  impostos: 'Impostos',
  devolucao: 'Devolução',
  quantidade: 'Quantidade',
  clientes: 'Nº de Clientes',
  vendas: 'Nº de Vendas',
  ticket_medio: 'Ticket Médio',
  preco_medio: 'Preço Médio',
};

const DIM_LABEL: Record<AiDimensao, string> = {
  anomes_emissao: 'Ano/Mês',
  unidade_negocio: 'Unidade de Negócio',
  cd_origem: 'Origem',
  cd_tp_movimento: 'Tipo de Movimento',
  cd_estado: 'Estado',
  cd_cliente: 'Cliente',
  cd_prj: 'Projeto/Obra',
  cd_rev_pedido: 'Revenda',
  cd_tns: 'TNS',
  categoria_custom: 'Categoria (Peças/Serviços)',
};

function fmtMetrica(metrica: AiMetrica) {
  return (v: number) => {
    if (metrica === 'quantidade' || metrica === 'clientes' || metrica === 'vendas') {
      return formatNumber(v);
    }
    return formatCurrency(v);
  };
}

export function AiChartGenerator({ filtrosBase, onDrill }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiChartResult | null>(null);

  const submit = async () => {
    if (loading) return;
    if (!prompt.trim()) {
      toast.error('Digite o pedido do gráfico antes de gerar.');
      return;
    }
    setLoading(true);
    try {
      const data = await gerarGraficoIA(prompt, filtrosBase);
      setResult(data);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao gerar gráfico');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (label: string) => {
    if (!result || !onDrill) return;
    if (label === 'Outros') return;
    onDrill(result.dimensao, label);
  };

  const renderDiagnostico = () => {
    if (!result) return null;
    const diag = result.diagnostico ?? {};
    const filtros = { ...(result.filtros ?? {}), ...(diag.filtros_aplicados ?? {}) };
    const periodo = diag.periodo ?? {};
    const anomesIni = periodo.ini ?? (filtros as any)?.anomes_ini ?? (filtrosBase as any)?.anomes_ini ?? '—';
    const anomesFim = periodo.fim ?? (filtros as any)?.anomes_fim ?? (filtrosBase as any)?.anomes_fim ?? '—';
    const unidade = diag.unidade_negocio ?? result.filtros?.unidade_negocio ?? 'CONSOLIDADO';
    const dimensao = diag.dimensao ?? result.dimensao;
    const qtdCategorias = typeof diag.qtd_categorias === 'number'
      ? diag.qtd_categorias
      : (Array.isArray(result.series) ? result.series.length : 0);
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-4 text-xs space-y-2">
        <div className="font-medium text-foreground">Nenhum dado encontrado com os filtros aplicados.</div>
        <ul className="space-y-1 text-muted-foreground">
          <li><span className="text-foreground/80">anomes_ini:</span> {anomesIni}</li>
          <li><span className="text-foreground/80">anomes_fim:</span> {anomesFim}</li>
          <li><span className="text-foreground/80">unidade_negocio:</span> {unidade}</li>
          <li><span className="text-foreground/80">dimensao:</span> {dimensao}</li>
          {typeof diag.linhas_view === 'number' && (
            <li><span className="text-foreground/80">qtd_linhas_base:</span> {diag.linhas_view.toLocaleString('pt-BR')}</li>
          )}
          {typeof diag.linhas_filtradas === 'number' && (
            <li><span className="text-foreground/80">qtd_linhas_filtradas:</span> {diag.linhas_filtradas.toLocaleString('pt-BR')}</li>
          )}
          <li><span className="text-foreground/80">qtd_categorias:</span> {qtdCategorias.toLocaleString('pt-BR')}</li>
          {Object.keys(filtros).length > 0 && (
            <li>
              <span className="text-foreground/80">Filtros aplicados:</span>{' '}
              {Object.entries(filtros).map(([k, v]) => `${k}=${v}`).join(', ')}
            </li>
          )}
        </ul>
        <p className="text-[10px] text-muted-foreground">
          Tente ajustar o período no topo do dashboard ou refraseie o pedido (ex.: trocar "Genius" por "total").
        </p>
      </div>
    );
  };

  const renderChart = () => {
    if (!result) return null;
    const series = Array.isArray(result?.series) ? result.series : [];
    if (series.length === 0) return renderDiagnostico();
    const data = series.map((s: any) => ({ label: s?.label, valor: s?.valor }));
    const fmt = fmtMetrica(result.metrica);
    const visualConfig = {
      legend: { visible: true, position: 'bottom' as const },
      tooltip: { visible: true },
      dataLabels: {
        visible: result.tipo_grafico === 'donut' || result.tipo_grafico === 'pie',
        format: 'percent' as const,
        position: 'outside' as const,
      },
    } as any;

    const total = result.total;
    const totalFmt = fmt(total);
    const subtitle = `${DIM_LABEL[result.dimensao]} • ${METRICA_LABEL[result.metrica]} • Total: ${totalFmt}`;

    switch (result.tipo_grafico) {
      case 'donut':
        return (
          <DonutChartCard
            title={result.titulo}
            subtitle={result.subtitulo || subtitle}
            data={data}
            valueFormatter={fmt}
            centerLabel="Total"
            centerValue={totalFmt}
            onItemClick={(d) => handleClick(d.label)}
            visualConfig={visualConfig}
            height={340}
          />
        );
      case 'pie':
        return (
          <PieChartCard
            title={result.titulo}
            subtitle={result.subtitulo || subtitle}
            data={data}
            valueFormatter={fmt}
            onItemClick={(d) => handleClick(d.label)}
            visualConfig={visualConfig}
            height={340}
          />
        );
      case 'line':
        return (
          <LineChartCard
            title={result.titulo}
            subtitle={result.subtitulo || subtitle}
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
            subtitle={result.subtitulo || subtitle}
            data={data}
            valueFormatter={fmt}
            onItemClick={(d) => handleClick(d.label)}
            visualConfig={visualConfig}
            height={320}
          />
        );
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          Gerar gráfico com IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={2}
          placeholder="Ex: Crie um gráfico de rosca mostrando o faturamento da Genius separado por Peças e Serviços com percentual."
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
              {ex.length > 60 ? ex.slice(0, 60) + '…' : ex}
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
              <Badge variant="outline">{METRICA_LABEL[result.metrica]}</Badge>
              <Badge variant="outline">{DIM_LABEL[result.dimensao]}</Badge>
              {Object.entries(result?.filtros ?? {}).map(([k, v]) => (
                <Badge key={k} variant="secondary" className="font-normal">
                  <span className="text-muted-foreground mr-1">{k}:</span>{v}
                </Badge>
              ))}
            </div>
            {renderChart()}
            {onDrill && (result.tipo_grafico === 'donut' || result.tipo_grafico === 'pie' || result.tipo_grafico === 'bar') && (
              <p className="text-[10px] text-muted-foreground text-center">
                Clique em uma fatia/barra para detalhar
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
