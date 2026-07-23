import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, Info, Sparkles, RefreshCw, Landmark, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumberBR } from '@/lib/format';
import { CODEMP } from '@/lib/contabilConfig';
import { useIndicadores } from '@/hooks/contabil/useIndicadores';
import { streamIndicadoresAnalise, downloadIndicadoresExcel } from '@/lib/contabil/indicadoresApi';
import { normalizarNarrativa, narrativaTruncada } from '@/lib/contabil/indicadoresNarrativa';
import { gerarPdfIndicadores } from '@/lib/contabil/indicadoresRelatorio';
import type { Indicador, IndicadorUnidade, IndicadorStatus } from '@/lib/contabil/indicadoresApi';

// ---- Seções (agrupamento por nome) ----
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

type SecaoDef = { titulo: string; testa: (nome: string) => boolean };

const SECOES: SecaoDef[] = [
  { titulo: 'Resultado (R$)',      testa: (n) => /^(receita|custo|resultado bruto|lucro liquido)/.test(n) },
  { titulo: 'EBITDA',              testa: (n) => n.startsWith('ebitda') || n.startsWith('margem ebitda') },
  { titulo: 'Rentabilidade (%)',   testa: (n) => /^(margem bruta|roe|roa)/.test(n) },
  { titulo: 'Prazos (dias)',       testa: (n) => n.startsWith('pme') || n.startsWith('pmp') },
  { titulo: 'Liquidez (índice)',   testa: (n) => n.startsWith('liquidez') && !n.includes('conferencia') },
  { titulo: 'Endividamento (%)',   testa: (n) => n.startsWith('endividamento') || n.startsWith('composicao') },
  { titulo: 'Capital de giro (R$)', testa: (n) => n.startsWith('cdg') || n.startsWith('capital de giro') },
];

function agruparPorSecao(indicadores: Indicador[]) {
  const grupos: Record<string, Indicador[]> = {};
  const tecnicos: Indicador[] = [];
  const outros: Indicador[] = [];
  for (const ind of indicadores) {
    const n = norm(ind.indicador);
    if (n.includes('conferencia') || n.includes('ac-pc') || n.includes('ac−pc')) {
      tecnicos.push(ind);
      continue;
    }
    const sec = SECOES.find((s) => s.testa(n));
    if (sec) {
      (grupos[sec.titulo] ||= []).push(ind);
    } else {
      outros.push(ind);
    }
  }
  return { grupos, tecnicos, outros };
}

// ---- Formatação ----
function fmtValor(v: number | null, unidade: IndicadorUnidade): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  switch (unidade) {
    case 'R$':      return formatCurrency(v);
    case '%':       return `${formatNumberBR(v, 2)}%`;
    case 'dias':    return `${formatNumberBR(v, 0)} dias`;
    case 'índice':  return formatNumberBR(v, 2);
    default:        return String(v);
  }
}

function StatusBadge({ status, avisos }: { status: IndicadorStatus; avisos: string[] }) {
  const base = 'text-[10px] uppercase tracking-wider';
  if (status === 'simulado') {
    const badge = (
      <Badge variant="outline" className={cn(base, 'border-[hsl(var(--warning))] text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10')}>
        simulado
      </Badge>
    );
    if (!avisos?.length) return badge;
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild><span>{badge}</span></TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <ul className="list-disc pl-4 space-y-0.5">
              {avisos.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (status === 'gerencial') return <Badge variant="secondary" className={base}>gerencial</Badge>;
  return <Badge className={cn(base, 'bg-primary/10 text-primary hover:bg-primary/10')}>oficial</Badge>;
}

// ---- Card ----
function IndicadorCard({ ind, onClick }: { ind: Indicador; onClick: () => void }) {
  const negativo = typeof ind.valor === 'number' && ind.valor < 0;
  return (
    <Card
      role="button"
      onClick={onClick}
      className="cursor-pointer transition-shadow hover:shadow-md"
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground leading-tight">{ind.indicador}</p>
          <StatusBadge status={ind.status} avisos={ind.avisos || []} />
        </div>
        <p className={cn('text-2xl font-bold tabular-nums', negativo && 'text-destructive')}>
          {fmtValor(ind.valor, ind.unidade)}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3" />
          <span className="truncate">{ind.formula}</span>
        </div>
        {ind.tipo_saldo && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            saldo {ind.tipo_saldo}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Drawer detalhe ----
function DetalheDrawer({ ind, onClose }: { ind: Indicador | null; onClose: () => void }) {
  return (
    <Sheet open={!!ind} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {ind && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between gap-2">
                <span>{ind.indicador}</span>
                <StatusBadge status={ind.status} avisos={ind.avisos || []} />
              </SheetTitle>
              <SheetDescription className="text-xs">{ind.formula}</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className={cn('text-2xl font-bold tabular-nums',
                  typeof ind.valor === 'number' && ind.valor < 0 && 'text-destructive')}>
                  {fmtValor(ind.valor, ind.unidade)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Info2 label="Numerador" value={ind.numerador === null ? '—' : formatCurrency(ind.numerador)} />
                <Info2 label="Denominador" value={ind.denominador === null ? '—' : formatCurrency(ind.denominador)} />
                {ind.dias !== null && <Info2 label="Dias" value={String(ind.dias)} />}
                {ind.tipo_saldo && <Info2 label="Tipo de saldo" value={ind.tipo_saldo} />}
              </div>
              {ind.avisos?.length > 0 && (
                <Alert variant="default" className="border-[hsl(var(--warning))]/40">
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
                  <AlertTitle className="text-xs">Ressalvas</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      {ind.avisos.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="tabular-nums text-sm">{value}</p>
    </div>
  );
}

// ---- Página ----
export default function IndicadoresContabeisPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const ano = now.getFullYear();
  const defaultIni = Number(searchParams.get('anomes_ini')) || Number(`${ano}01`);
  const defaultFim = Number(searchParams.get('anomes_fim')) || Number(`${ano}${String(now.getMonth() + 1).padStart(2, '0')}`);
  const defaultCodemp = Number(searchParams.get('codemp')) || CODEMP || 1;
  const defaultCodfil = searchParams.get('codfil') ? Number(searchParams.get('codfil')) : undefined;

  const [anomesIni, setAnomesIni] = useState<number>(defaultIni);
  const [anomesFim, setAnomesFim] = useState<number>(defaultFim);
  const [codemp, setCodemp] = useState<number>(defaultCodemp);
  const [codfil, setCodfil] = useState<number | undefined>(defaultCodfil);
  const [detalhe, setDetalhe] = useState<Indicador | null>(null);

  const params = { anomes_ini: anomesIni, anomes_fim: anomesFim, codemp, codfil };
  const { data, isLoading, error, refetch, isFetching } = useIndicadores(params);

  // ---- Streaming da análise IA ----
  type StreamStatus = 'idle' | 'streaming' | 'done' | 'erro';
  const [narrativaStream, setNarrativaStream] = useState('');
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [streamErro, setStreamErro] = useState<string | undefined>();
  const [modeloIA, setModeloIA] = useState<string | undefined>();
  const [finishReason, setFinishReason] = useState<string | undefined>();
  const streamAbortRef = useRef<AbortController | null>(null);

  // Abortar stream ativo ao trocar filtros/desmontar
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);
  useEffect(() => {
    // Se filtros mudaram, cancela stream em curso e limpa análise antiga.
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setNarrativaStream('');
    setStreamStatus('idle');
    setStreamErro(undefined);
    setModeloIA(undefined);
    setFinishReason(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anomesIni, anomesFim, codemp, codfil]);

  // ---- Exportar Excel ----
  const [exporting, setExporting] = useState(false);

  const aplicarFiltros = () => {
    const sp = new URLSearchParams();
    sp.set('anomes_ini', String(anomesIni));
    sp.set('anomes_fim', String(anomesFim));
    sp.set('codemp', String(codemp));
    if (codfil) sp.set('codfil', String(codfil));
    setSearchParams(sp, { replace: true });
  };

  const { grupos, tecnicos, outros } = useMemo(
    () => agruparPorSecao(data?.indicadores || []),
    [data],
  );

  const gerarAnalise = async () => {
    streamAbortRef.current?.abort();
    const ctrl = new AbortController();
    streamAbortRef.current = ctrl;
    setNarrativaStream('');
    setStreamErro(undefined);
    setModeloIA(undefined);
    setFinishReason(undefined);
    setStreamStatus('streaming');
    await streamIndicadoresAnalise(params, {
      signal: ctrl.signal,
      onMeta: (m) => { if (m?.modelo) setModeloIA(m.modelo); },
      onDelta: (t) => setNarrativaStream((prev) => prev + t),
      onDone: (info) => {
        if (info?.finish_reason) setFinishReason(String(info.finish_reason));
        setStreamStatus('done');
      },
      onErro: (msg) => {
        setStreamErro(msg);
        setStreamStatus('erro');
        toast.error(msg);
      },
    });
    // Se o stream fechou sem `done` nem `erro`, considera concluído.
    setStreamStatus((s) => (s === 'streaming' ? 'done' : s));
  };

  const exportarExcel = async () => {
    setExporting(true);
    try {
      await downloadIndicadoresExcel(params);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao exportar planilha.');
    } finally {
      setExporting(false);
    }
  };

  const [exportingPdf, setExportingPdf] = useState(false);
  const baixarRelatorio = async () => {
    if (!data) return;
    setExportingPdf(true);
    try {
      gerarPdfIndicadores({
        periodoIni: anomesIni,
        periodoFim: anomesFim,
        codemp,
        codfil,
        grupos,
        ordemSecoes: SECOES.map((s) => s.titulo),
        outros,
        tecnicos,
        duplicidade612: data.duplicidade_612_ativa,
        narrativa: narrativaStream,
        modeloIA,
      });
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao gerar PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const narrativa = narrativaStream;
  const analiseErro = streamErro;
  const analiseCarregando = streamStatus === 'streaming';

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Landmark className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Indicadores Contábeis</h1>
          <p className="text-xs text-muted-foreground">
            Analytics de gestão contábil — valores auditáveis, calculados no backend.
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={baixarRelatorio} disabled={exportingPdf || isLoading || !data}>
                {exportingPdf
                  ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  : <FileText className="h-4 w-4 mr-1" />}
                {exportingPdf ? 'Gerando PDF…' : 'Baixar relatório'}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              PDF com os indicadores do período + a última análise da IA gerada nesta tela.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={exportarExcel} disabled={exporting || isLoading}>
                {exporting
                  ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  : <FileSpreadsheet className="h-4 w-4 mr-1" />}
                {exporting ? 'Gerando Excel…' : 'Exportar Excel'}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              Baixa a planilha com os números auditáveis conta a conta, para a contabilidade validar.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4 mr-1', isFetching && 'animate-spin')} /> Atualizar
        </Button>
      </header>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <Label className="text-xs">Competência inicial</Label>
            <Input type="number" value={anomesIni} onChange={(e) => setAnomesIni(Number(e.target.value))}
              placeholder="AAAAMM" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Competência final</Label>
            <Input type="number" value={anomesFim} onChange={(e) => setAnomesFim(Number(e.target.value))}
              placeholder="AAAAMM" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Empresa (codemp)</Label>
            <Input type="number" value={codemp} onChange={(e) => setCodemp(Number(e.target.value))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Filial (codfil)</Label>
            <Input type="number" value={codfil ?? ''} onChange={(e) => setCodfil(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="opcional" className="h-9" />
          </div>
          <Button onClick={aplicarFiltros} className="h-9">Aplicar</Button>
        </CardContent>
      </Card>

      {/* Alerta duplicidade */}
      {data?.duplicidade_612_ativa && (
        <Alert className="border-[hsl(var(--warning))]/50 bg-[hsl(var(--warning))]/5">
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
          <AlertTitle>Duplicidade detectada no cadastro do Senior</AlertTitle>
          <AlertDescription className="text-xs">
            A conta 612 aparece nos aglutinadores 9 e 10, o que infla o custo. Os
            indicadores de resultado estão na versão <strong>simulada</strong> (sem
            a duplicidade). Corrija no ERP (tela <code>E045CAG</code>) para os valores
            virarem <em>oficiais</em>.
          </AlertDescription>
        </Alert>
      )}

      {/* Erro */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Indicadores indisponíveis</AlertTitle>
          <AlertDescription className="text-xs">
            {error.message}
            <br />
            Se o problema persistir, verifique o restart da API (porta 8070).
          </AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      )}

      {/* Seções */}
      {!isLoading && data && (
        <div className="space-y-4">
          {SECOES.map(({ titulo }) => {
            const itens = grupos[titulo];
            if (!itens?.length) return null;
            return (
              <section key={titulo}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {titulo}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {itens.map((ind, i) => (
                    <IndicadorCard key={`${ind.indicador}-${i}`} ind={ind} onClick={() => setDetalhe(ind)} />
                  ))}
                </div>
              </section>
            );
          })}
          {outros.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Outros</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {outros.map((ind, i) => (
                  <IndicadorCard key={`outros-${i}`} ind={ind} onClick={() => setDetalhe(ind)} />
                ))}
              </div>
            </section>
          )}
          {tecnicos.length > 0 && (
            <section className="pt-4 border-t">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Conferências técnicas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {tecnicos.map((ind, i) => (
                  <IndicadorCard key={`tec-${i}`} ind={ind} onClick={() => setDetalhe(ind)} />
                ))}
              </div>
            </section>
          )}

          {/* Painel IA — no final da página */}
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                Análise (IA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
                  A IA <strong>interpreta</strong> os números acima — não recalcula nada.
                </p>
                <Button
                  size="sm"
                  onClick={gerarAnalise}
                  disabled={analiseCarregando}
                  className="sm:w-auto"
                >
                  {analiseCarregando
                    ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    : <Sparkles className="h-4 w-4 mr-1" />}
                  {analiseCarregando
                    ? 'Gerando…'
                    : narrativa
                      ? 'Gerar novamente'
                      : 'Gerar análise'}
                </Button>
              </div>
              {analiseErro && !narrativa && (
                <Alert variant="destructive">
                  <AlertTitle className="text-xs">Análise indisponível</AlertTitle>
                  <AlertDescription className="text-xs">{analiseErro}</AlertDescription>
                </Alert>
              )}
              {narrativa && (
                <div className="prose prose-sm max-w-3xl text-sm dark:prose-invert">
                  <ReactMarkdown>{narrativa}</ReactMarkdown>
                  {modeloIA && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Modelo: {modeloIA}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <DetalheDrawer ind={detalhe} onClose={() => setDetalhe(null)} />
    </div>
  );
}
