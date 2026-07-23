import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import {
  AlertTriangle, RefreshCw, Waves, FileSpreadsheet, Sparkles, Loader2,
  TrendingDown, TrendingUp, ShieldCheck, ShieldAlert, ChevronDown, ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ReferenceDot, ReferenceLine,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency, formatCompactCurrency } from '@/lib/format';
import { CODEMP } from '@/lib/contabilConfig';
import {
  fetchProjecao, fetchDireto, fetchIndireto,
  streamFluxoCaixaAnalise, downloadFluxoCaixaExcel,
  type ProjecaoResponse, type DiretoResponse, type IndiretoResponse, type IndiretoAtividade,
} from '@/lib/contabil/fluxoCaixaApi';
import { normalizarNarrativa, narrativaTruncada } from '@/lib/contabil/indicadoresNarrativa';

// ============================================================
// Helpers
// ============================================================

const fmt = (v: number | null | undefined) =>
  (v === null || v === undefined || Number.isNaN(v)) ? '—' : formatCurrency(v);

const fmtShort = (v: number | null | undefined) =>
  (v === null || v === undefined || Number.isNaN(v)) ? '—' : formatCompactCurrency(v);

function ValorPN({ v, className }: { v: number | null | undefined; className?: string }) {
  const neg = typeof v === 'number' && v < 0;
  return <span className={cn('tabular-nums', neg && 'text-destructive', className)}>{fmt(v)}</span>;
}

// ============================================================
// Página
// ============================================================

export default function FluxoCaixaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const defaultIni = Number(searchParams.get('anomes_ini')) || Number(`${ano}01`);
  const defaultFim = Number(searchParams.get('anomes_fim')) || Number(`${ano}${mes}`);
  const defaultCodemp = Number(searchParams.get('codemp')) || CODEMP || 1;
  const defaultCodfil = searchParams.get('codfil') ? Number(searchParams.get('codfil')) : undefined;

  const [anomesIni, setAnomesIni] = useState<number>(defaultIni);
  const [anomesFim, setAnomesFim] = useState<number>(defaultFim);
  const [codemp, setCodemp] = useState<number>(defaultCodemp);
  const [codfil, setCodfil] = useState<number | undefined>(defaultCodfil);

  const [horizonteDias, setHorizonteDias] = useState<number>(120);
  const [granularidade, setGranularidade] = useState<'mes' | 'semana'>('mes');
  const [dataBase, setDataBase] = useState<string>('');
  const [saldoInicialOverride, setSaldoInicialOverride] = useState<string>('');

  const paramsBase = { anomes_ini: anomesIni, anomes_fim: anomesFim, codemp, codfil };

  const projecaoParams = useMemo(() => ({
    codemp, codfil, horizonte_dias: horizonteDias, granularidade,
    ...(dataBase ? { data_base: dataBase } : {}),
    ...(saldoInicialOverride && !Number.isNaN(Number(saldoInicialOverride))
      ? { saldo_inicial: Number(saldoInicialOverride) } : {}),
  }), [codemp, codfil, horizonteDias, granularidade, dataBase, saldoInicialOverride]);

  const projecao = useQuery({
    queryKey: ['fc-projecao', projecaoParams],
    queryFn: () => fetchProjecao(projecaoParams),
  });
  const direto = useQuery({
    queryKey: ['fc-direto', paramsBase],
    queryFn: () => fetchDireto(paramsBase),
  });
  const indireto = useQuery({
    queryKey: ['fc-indireto', paramsBase],
    queryFn: () => fetchIndireto(paramsBase),
  });

  const aplicar = () => {
    const sp = new URLSearchParams();
    sp.set('anomes_ini', String(anomesIni));
    sp.set('anomes_fim', String(anomesFim));
    sp.set('codemp', String(codemp));
    if (codfil) sp.set('codfil', String(codfil));
    setSearchParams(sp, { replace: true });
    projecao.refetch(); direto.refetch(); indireto.refetch();
  };

  const [exporting, setExporting] = useState(false);
  const exportarExcel = async () => {
    setExporting(true);
    try {
      await downloadFluxoCaixaExcel({
        ...paramsBase, horizonte_dias: horizonteDias, granularidade,
        ...(dataBase ? { data_base: dataBase } : {}),
        ...(saldoInicialOverride && !Number.isNaN(Number(saldoInicialOverride))
          ? { saldo_inicial: Number(saldoInicialOverride) } : {}),
      });
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao exportar planilha.');
    } finally { setExporting(false); }
  };

  // ---- Streaming IA ----
  type StreamStatus = 'idle' | 'streaming' | 'done' | 'erro';
  const [narrativa, setNarrativa] = useState('');
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [streamErro, setStreamErro] = useState<string | undefined>();
  const [modeloIA, setModeloIA] = useState<string | undefined>();
  const [finishReason, setFinishReason] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setNarrativa(''); setStreamStatus('idle'); setStreamErro(undefined);
    setModeloIA(undefined); setFinishReason(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anomesIni, anomesFim, codemp, codfil, horizonteDias, granularidade]);

  const gerarAnalise = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setNarrativa(''); setStreamErro(undefined); setFinishReason(undefined);
    setStreamStatus('streaming');
    await streamFluxoCaixaAnalise(
      { ...paramsBase, horizonte_dias: horizonteDias, granularidade,
        ...(dataBase ? { data_base: dataBase } : {}),
        ...(saldoInicialOverride && !Number.isNaN(Number(saldoInicialOverride))
          ? { saldo_inicial: Number(saldoInicialOverride) } : {}), },
      {
        signal: ctrl.signal,
        onMeta: (m) => { if (m?.modelo) setModeloIA(m.modelo); },
        onDelta: (t) => setNarrativa((p) => p + t),
        onDone: (info) => { if (info?.finish_reason) setFinishReason(String(info.finish_reason)); setStreamStatus('done'); },
        onErro: (msg) => { setStreamErro(msg); setStreamStatus('erro'); toast.error(msg); },
      },
    );
    setStreamStatus((s) => (s === 'streaming' ? 'done' : s));
  };
  const cancelarAnalise = () => { abortRef.current?.abort(); setStreamStatus('idle'); };

  const narrativaFmt = useMemo(() => normalizarNarrativa(narrativa), [narrativa]);
  const truncada = useMemo(
    () => streamStatus === 'done' && narrativaTruncada(narrativa, finishReason),
    [streamStatus, narrativa, finishReason],
  );

  const anyLoading = projecao.isFetching || direto.isFetching || indireto.isFetching;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Waves className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Fluxo de Caixa</h1>
          <p className="text-xs text-muted-foreground">
            Tesouraria — projeção, realizado direto e realizado indireto. Reconciliados ao centavo.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={exportarExcel} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-1" />}
          {exporting ? 'Gerando…' : 'Exportar Excel'}
        </Button>
        <Button size="sm" variant="outline" onClick={aplicar} disabled={anyLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-1', anyLoading && 'animate-spin')} /> Atualizar
        </Button>
      </header>

      {/* Filtros globais */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <Label className="text-xs">Competência inicial</Label>
            <Input type="number" value={anomesIni} onChange={(e) => setAnomesIni(Number(e.target.value))} placeholder="AAAAMM" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Competência final</Label>
            <Input type="number" value={anomesFim} onChange={(e) => setAnomesFim(Number(e.target.value))} placeholder="AAAAMM" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Empresa (codemp)</Label>
            <Input type="number" value={codemp} onChange={(e) => setCodemp(Number(e.target.value))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Filial (codfil)</Label>
            <Input type="number" value={codfil ?? ''} onChange={(e) => setCodfil(e.target.value ? Number(e.target.value) : undefined)} placeholder="opcional" className="h-9" />
          </div>
          <Button onClick={aplicar} className="h-9">Aplicar</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="projecao" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projecao">Projeção</TabsTrigger>
          <TabsTrigger value="direto">Realizado — Direto</TabsTrigger>
          <TabsTrigger value="indireto">Realizado — Indireto</TabsTrigger>
        </TabsList>

        {/* ============ PROJEÇÃO ============ */}
        <TabsContent value="projecao" className="space-y-4">
          <ProjecaoControles
            horizonteDias={horizonteDias} setHorizonteDias={setHorizonteDias}
            granularidade={granularidade} setGranularidade={setGranularidade}
            dataBase={dataBase} setDataBase={setDataBase}
            saldoInicialOverride={saldoInicialOverride} setSaldoInicialOverride={setSaldoInicialOverride}
          />
          {projecao.isLoading && <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>}
          {projecao.error && <ErroBox err={projecao.error as Error} />}
          {projecao.data && <ProjecaoBloco data={projecao.data} />}
        </TabsContent>

        {/* ============ DIRETO ============ */}
        <TabsContent value="direto" className="space-y-4">
          {direto.isLoading && <Skeleton className="h-64" />}
          {direto.error && <ErroBox err={direto.error as Error} />}
          {direto.data && <DiretoBloco data={direto.data} />}
        </TabsContent>

        {/* ============ INDIRETO ============ */}
        <TabsContent value="indireto" className="space-y-4">
          {indireto.isLoading && <Skeleton className="h-64" />}
          {indireto.error && <ErroBox err={indireto.error as Error} />}
          {indireto.data && <IndiretoBloco data={indireto.data} />}
        </TabsContent>
      </Tabs>

      {/* ============ IA (full-width, rodapé) ============ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" /> Análise (IA) — tesouraria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
              A IA lê os três fluxos e <strong>interpreta</strong> — geração de caixa,
              risco de aperto (menor saldo e quando), recebíveis vencidos e recomendações.
              Nunca recalcula valores.
            </p>
            <div className="flex items-center gap-2">
              {streamStatus === 'streaming' && (
                <Button size="sm" variant="outline" onClick={cancelarAnalise}>Cancelar</Button>
              )}
              <Button size="sm" onClick={gerarAnalise} disabled={streamStatus === 'streaming'}>
                {streamStatus === 'streaming'
                  ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  : <Sparkles className="h-4 w-4 mr-1" />}
                {streamStatus === 'streaming' ? 'Gerando…' : narrativa ? 'Gerar novamente' : 'Gerar análise'}
              </Button>
            </div>
          </div>
          {streamErro && !narrativa && (
            <Alert variant="destructive">
              <AlertTitle className="text-xs">Análise indisponível</AlertTitle>
              <AlertDescription className="text-xs">{streamErro}</AlertDescription>
            </Alert>
          )}
          {truncada && narrativa && (
            <Alert className="border-[hsl(var(--warning))]/50 bg-[hsl(var(--warning))]/5">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
              <AlertTitle className="text-xs">Resposta cortada pelo limite do modelo</AlertTitle>
              <AlertDescription className="text-xs flex flex-wrap items-center gap-2">
                <span>A análise atingiu o limite de tokens. Clique em <strong>Gerar novamente</strong> para uma nova redação.</span>
                <Button size="sm" variant="outline" onClick={gerarAnalise}>
                  <Sparkles className="h-3 w-3 mr-1" /> Gerar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {narrativa && (
            <article
              className={cn(
                'rounded-lg border bg-card px-5 py-4 max-w-[900px] mx-auto',
                'text-[13.5px] leading-relaxed text-foreground',
                'prose prose-sm dark:prose-invert',
                'prose-headings:font-semibold prose-headings:tracking-tight',
                'prose-h2:text-primary prose-h2:text-[13px] prose-h2:uppercase prose-h2:tracking-wider',
                'prose-h2:mt-5 prose-h2:mb-2 prose-h2:pb-1 prose-h2:border-b prose-h2:border-border',
                'prose-p:my-2 prose-p:text-foreground/90',
                'prose-strong:text-foreground prose-strong:font-semibold',
                'prose-ul:my-2 prose-li:my-0.5 marker:text-primary',
              )}
            >
              <ReactMarkdown>{narrativaFmt}</ReactMarkdown>
              <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                {modeloIA && <span>Modelo: <strong className="text-foreground/80">{modeloIA}</strong></span>}
                <span>Período: {anomesIni} – {anomesFim}</span>
                <span>Horizonte: {horizonteDias} dias · {granularidade}</span>
                <span>{narrativa.length.toLocaleString('pt-BR')} caracteres</span>
                {finishReason && <span>finish_reason: {finishReason}</span>}
              </div>
            </article>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

function ErroBox({ err }: { err: Error }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Dados indisponíveis</AlertTitle>
      <AlertDescription className="text-xs">{err.message}</AlertDescription>
    </Alert>
  );
}

function ProjecaoControles(props: {
  horizonteDias: number; setHorizonteDias: (n: number) => void;
  granularidade: 'mes' | 'semana'; setGranularidade: (g: 'mes' | 'semana') => void;
  dataBase: string; setDataBase: (s: string) => void;
  saldoInicialOverride: string; setSaldoInicialOverride: (s: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <div>
          <Label className="text-xs">Horizonte</Label>
          <Select value={String(props.horizonteDias)} onValueChange={(v) => props.setHorizonteDias(Number(v))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[30, 60, 90, 120, 180, 365].map((d) => (
                <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Granularidade</Label>
          <Select value={props.granularidade} onValueChange={(v) => props.setGranularidade(v as any)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Mensal</SelectItem>
              <SelectItem value="semana">Semanal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Data-base</Label>
          <Input type="date" value={props.dataBase} onChange={(e) => props.setDataBase(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs flex items-center gap-1">
            Saldo inicial (override)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild><span className="text-muted-foreground cursor-help">ⓘ</span></TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  Padrão: saldo contábil de fim de mês. Digite o saldo real do banco
                  para simular a projeção a partir dele.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input type="number" step="0.01" value={props.saldoInicialOverride}
            onChange={(e) => props.setSaldoInicialOverride(e.target.value)}
            placeholder="Usa o contábil" className="h-9" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProjecaoBloco({ data }: { data: ProjecaoResponse }) {
  const menorSaldoEm = data.resumo_horizonte?.menor_saldo_em;
  const menorSaldo = data.resumo_horizonte?.menor_saldo;
  const temAperto = (data.curva || []).some((p) => p.saldo_projetado < 0);

  const chartData = (data.curva || []).map((p) => ({
    ...p,
    entradas_pos: p.entradas,
    saidas_neg: -Math.abs(p.saidas),
    isMenor: p.periodo === menorSaldoEm,
  }));

  return (
    <>
      {/* Alertas */}
      {data.alertas?.length ? (
        <div className="space-y-2">
          {data.alertas.map((a, i) => (
            <Alert key={i} className="border-[hsl(var(--warning))]/50 bg-[hsl(var(--warning))]/5">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
              <AlertDescription className="text-xs">{a}</AlertDescription>
            </Alert>
          ))}
        </div>
      ) : null}

      {/* Cards de topo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Saldo inicial</p>
            <p className="text-lg font-bold tabular-nums">{fmt(data.saldo_inicial)}</p>
            <p className="text-[10px] text-muted-foreground">
              Fonte: {data.saldo_inicial_fonte || '—'} · Data-base {data.data_base}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[hsl(var(--warning))]/40">
          <CardContent className="p-4 space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Vencidos — a receber</p>
            <p className="text-lg font-bold tabular-nums text-[hsl(var(--warning))]">{fmt(data.vencidos?.receber)}</p>
            <p className="text-[10px] text-muted-foreground">Dinheiro parado em atraso · não entra na curva</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/40">
          <CardContent className="p-4 space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Vencidos — a pagar</p>
            <p className="text-lg font-bold tabular-nums text-destructive">{fmt(data.vencidos?.pagar)}</p>
            <p className="text-[10px] text-muted-foreground">Compromissos em atraso · não entra na curva</p>
          </CardContent>
        </Card>
        <Card className={cn(typeof menorSaldo === 'number' && menorSaldo < 0 && 'border-destructive/50')}>
          <CardContent className="p-4 space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Menor saldo no horizonte
            </p>
            <ValorPN v={menorSaldo} className="text-lg font-bold" />
            <p className="text-[10px] text-muted-foreground">em {menorSaldoEm || '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Curva de saldo projetado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmtShort(v)} width={90} />
                <RTooltip
                  formatter={(v: any, name: any) => [fmt(Number(v)), String(name)]}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                <Bar dataKey="entradas_pos" name="Entradas" fill="hsl(var(--success, 142 71% 45%))" opacity={0.7} />
                <Bar dataKey="saidas_neg" name="Saídas" fill="hsl(var(--destructive))" opacity={0.6} />
                <Line
                  type="monotone" dataKey="saldo_projetado" name="Saldo projetado"
                  stroke="hsl(var(--primary))" strokeWidth={2.5}
                  dot={(props: any) => {
                    const isMenor = props?.payload?.isMenor;
                    const neg = props?.payload?.saldo_projetado < 0;
                    return (
                      <circle cx={props.cx} cy={props.cy}
                        r={isMenor ? 6 : 3}
                        fill={isMenor ? 'hsl(var(--destructive))' : (neg ? 'hsl(var(--destructive))' : 'hsl(var(--primary))')}
                        stroke="hsl(var(--card))" strokeWidth={2}
                      />
                    );
                  }}
                />
                {menorSaldoEm && typeof menorSaldo === 'number' && (
                  <ReferenceDot x={menorSaldoEm} y={menorSaldo} r={7}
                    fill="hsl(var(--destructive))" stroke="hsl(var(--card))" strokeWidth={2}
                    label={{ value: 'vale', position: 'top', fontSize: 10, fill: 'hsl(var(--destructive))' }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {temAperto && (
            <p className="text-[11px] text-destructive mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Há períodos com saldo projetado negativo — aperto de caixa.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detalhe por período</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Período</th>
                  <th className="text-right px-4 py-2">Entradas</th>
                  <th className="text-right px-4 py-2">Saídas</th>
                  <th className="text-right px-4 py-2">Fluxo líquido</th>
                  <th className="text-right px-4 py-2">Saldo projetado</th>
                </tr>
              </thead>
              <tbody>
                {(data.curva || []).map((p) => (
                  <tr key={p.periodo} className={cn('border-t border-border/60',
                    p.periodo === menorSaldoEm && 'bg-destructive/5')}>
                    <td className="px-4 py-2 font-medium">{p.periodo}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(p.entradas)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(p.saidas)}</td>
                    <td className="px-4 py-2 text-right"><ValorPN v={p.fluxo_liquido} /></td>
                    <td className="px-4 py-2 text-right"><ValorPN v={p.saldo_projetado} className="font-semibold" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ConciliadoBadge({ conciliado, residual }: { conciliado: boolean; residual: number }) {
  if (conciliado) {
    return (
      <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
        <ShieldCheck className="h-3 w-3 mr-1" />
        Conciliado {Math.abs(residual) > 0 && `(resíduo ${fmt(residual)})`}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      <ShieldAlert className="h-3 w-3 mr-1" /> Não conciliado (resíduo {fmt(residual)})
    </Badge>
  );
}

function DiretoBloco({ data }: { data: DiretoResponse }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Caixa inicial" value={data.caixa_inicial} />
        <StatCard label="Caixa final" value={data.caixa_final} />
        <StatCard label="Variação líquida" value={data.variacao_liquida} colorful />
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Conciliação</p>
            <ConciliadoBadge conciliado={data.conciliado} residual={data.residual_conciliacao} />
            <p className="text-[10px] text-muted-foreground">Variação real do caixa: {fmt(data.variacao_real_caixa)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Por categoria</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Categoria</th>
                  <th className="text-left px-4 py-2">Atividade</th>
                  <th className="text-right px-4 py-2">Entradas</th>
                  <th className="text-right px-4 py-2">Saídas</th>
                  <th className="text-right px-4 py-2">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {data.categorias.map((c, i) => (
                  <tr key={`${c.categoria}-${i}`} className="border-t border-border/60">
                    <td className="px-4 py-2 font-medium flex items-center gap-2">
                      {c.categoria}
                      {c.obs && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))] cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm text-xs">{c.obs}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </td>
                    <td className="px-4 py-2"><AtividadeBadge atv={c.atividade} /></td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(c.entradas)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(c.saidas)}</td>
                    <td className="px-4 py-2 text-right font-semibold"><ValorPN v={c.liquido} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 font-semibold">
                <tr className="border-t border-border">
                  <td className="px-4 py-2" colSpan={2}>Total</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt(data.total_entradas)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt(data.total_saidas)}</td>
                  <td className="px-4 py-2 text-right"><ValorPN v={data.variacao_liquida} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function AtividadeBadge({ atv }: { atv: string }) {
  const cls =
    atv === 'operacional' ? 'bg-primary/10 text-primary'
    : atv === 'investimento' ? 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]'
    : atv === 'financiamento' ? 'bg-accent text-accent-foreground'
    : 'bg-muted text-muted-foreground';
  return <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wider border-0', cls)}>{atv}</Badge>;
}

function StatCard({ label, value, colorful }: { label: string; value: number; colorful?: boolean }) {
  const neg = colorful && value < 0;
  const pos = colorful && value > 0;
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn('text-lg font-bold tabular-nums',
          neg && 'text-destructive', pos && 'text-primary')}>{fmt(value)}</p>
      </CardContent>
    </Card>
  );
}

function IndiretoBloco({ data }: { data: IndiretoResponse }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Caixa inicial" value={data.caixa_inicial} />
        <StatCard label="Caixa final" value={data.caixa_final} />
        <StatCard label="Variação calculada" value={data.variacao_liquida_calculada} colorful />
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Conciliação</p>
            <ConciliadoBadge conciliado={data.conciliado} residual={data.residual_conciliacao} />
            <p className="text-[10px] text-muted-foreground">Variação real: {fmt(data.variacao_real_caixa)}</p>
          </CardContent>
        </Card>
      </div>

      <AtividadeSecao titulo="Operacional" atv={data.atividades.operacional} />
      <AtividadeSecao titulo="Investimento" atv={data.atividades.investimento} />
      <AtividadeSecao titulo="Financiamento" atv={data.atividades.financiamento} />

      {data.observacoes?.length ? (
        <Card>
          <CardContent className="p-4 space-y-1 text-[11px] text-muted-foreground">
            <p className="uppercase tracking-wider text-[10px] font-semibold text-foreground/80">Observações</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {data.observacoes.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function AtividadeSecao({ titulo, atv }: { titulo: string; atv: IndiretoAtividade }) {
  const [aberto, setAberto] = useState(true);
  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setAberto((v) => !v)}>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {titulo}
          </span>
          <ValorPN v={atv.total} className="text-base font-bold" />
        </CardTitle>
      </CardHeader>
      {aberto && (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {atv.itens.map((it, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-4 py-2">{it.descricao}</td>
                    <td className="px-4 py-2 text-right"><ValorPN v={it.valor} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 font-semibold">
                <tr className="border-t border-border">
                  <td className="px-4 py-2">Subtotal — {titulo}</td>
                  <td className="px-4 py-2 text-right"><ValorPN v={atv.total} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
