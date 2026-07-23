import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, FileSpreadsheet, Landmark, Loader2, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumberBR } from '@/lib/format';
import { CODEMP } from '@/lib/contabilConfig';
import {
  fetchAging, downloadAgingExcel, AGING_FAIXAS, AGING_FAIXA_LABEL,
  type AgingBloco, type AgingResponse, type AgingParceiro, type AgingFaixa,
} from '@/lib/contabil/agingApi';
import { DataTableBI, type Column } from '@/components/bi/tables/DataTableBI';

function hojeISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function totaisVencido(t: AgingBloco['totais']) {
  return t.v_1_30 + t.v_31_60 + t.v_61_90 + t.v_90_mais;
}

function ResumoCards({ bloco, tipo }: { bloco: AgingBloco; tipo: 'receber' | 'pagar' }) {
  const t = bloco.totais;
  const vencido = totaisVencido(t);
  const pct = t.total > 0 ? (vencido / t.total) * 100 : 0;
  const rotulo = tipo === 'receber' ? 'a receber' : 'a pagar';
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card><CardContent className="p-4 space-y-1">
        <p className="text-xs text-muted-foreground">Total em aberto</p>
        <p className="text-2xl font-bold tabular-nums">{formatCurrency(t.total)}</p>
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-1">
        <p className="text-xs text-muted-foreground">Total vencido {rotulo}</p>
        <p className="text-2xl font-bold tabular-nums text-destructive">{formatCurrency(vencido)}</p>
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-1">
        <p className="text-xs text-muted-foreground">% da carteira vencida</p>
        <p className={cn('text-2xl font-bold tabular-nums', pct > 20 && 'text-destructive')}>
          {formatNumberBR(pct, 1)}%
        </p>
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-1">
        <p className="text-xs text-muted-foreground">Vencido +90 dias (crítico)</p>
        <p className="text-2xl font-bold tabular-nums text-destructive">{formatCurrency(t.v_90_mais)}</p>
      </CardContent></Card>
    </div>
  );
}

function corFaixa(faixa: AgingFaixa, valor: number): string {
  if (valor <= 0) return '';
  if (faixa === 'v_90_mais') return 'text-destructive font-semibold';
  if (faixa === 'v_61_90') return 'text-amber-600 dark:text-amber-400 font-semibold';
  return '';
}

function TabelaBloco({ bloco }: { bloco: AgingBloco }) {
  const columns: Column<AgingParceiro>[] = useMemo(() => [
    { key: 'codigo', header: 'Código', align: 'left', sortable: true,
      render: (v) => <span className="tabular-nums text-xs">{v}</span> },
    { key: 'nome', header: 'Parceiro', align: 'left', sortable: true,
      render: (v) => <span className="text-xs">{v}</span> },
    ...AGING_FAIXAS.map<Column<AgingParceiro>>((f) => ({
      key: f,
      header: AGING_FAIXA_LABEL[f],
      align: 'right',
      sortable: true,
      aggregate: 'sum',
      render: (v: number) => (
        <span className={cn('tabular-nums text-xs', corFaixa(f, Number(v || 0)))}>
          {formatCurrency(Number(v || 0))}
        </span>
      ),
    })),
    { key: 'total', header: 'Total', align: 'right', sortable: true, aggregate: 'sum',
      render: (v: number) => <span className="tabular-nums text-xs font-semibold">{formatCurrency(Number(v || 0))}</span> },
  ], []);

  const parceirosOrdenados = useMemo(
    () => [...bloco.parceiros].sort((a, b) => (b.total || 0) - (a.total || 0)),
    [bloco.parceiros],
  );

  return (
    <div className="space-y-2">
      <DataTableBI
        columns={columns}
        data={parceirosOrdenados}
        defaultSort={{ key: 'total', dir: 'desc' }}
        emptyMessage="Nenhum título em aberto no período."
      />
      {/* Rodapé de totais */}
      <div className="rounded-md border bg-muted/40 px-3 py-2">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-xs">
          <div className="md:col-span-2 font-medium">Totais</div>
          {AGING_FAIXAS.map((f) => (
            <div key={f} className="text-right tabular-nums">
              <div className="text-[10px] uppercase text-muted-foreground">{AGING_FAIXA_LABEL[f]}</div>
              <div className={cn(corFaixa(f, bloco.totais[f]))}>{formatCurrency(bloco.totais[f])}</div>
            </div>
          ))}
          <div className="text-right tabular-nums">
            <div className="text-[10px] uppercase text-muted-foreground">Total</div>
            <div className="font-semibold">{formatCurrency(bloco.totais.total)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgingPage() {
  const [codemp, setCodemp] = useState<number>(CODEMP || 1);
  const [codfil, setCodfil] = useState<number | undefined>(undefined);
  const [dataBase, setDataBase] = useState<string>(hojeISO());
  const [topN, setTopN] = useState<number>(50);
  const [aba, setAba] = useState<'receber' | 'pagar'>('receber');

  const [data, setData] = useState<AgingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'receber' | 'pagar' | null>(null);

  const carregar = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchAging({
        tipo: 'ambos', codemp, codfil, data_base: dataBase, top: topN,
      });
      setData(r);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar Aging.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  const exportar = async (tipo: 'receber' | 'pagar') => {
    setExporting(tipo);
    try {
      await downloadAgingExcel({ tipo, codemp, codfil, data_base: dataBase });
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao exportar.');
    } finally {
      setExporting(null);
    }
  };

  const bloco = aba === 'receber' ? data?.receber : data?.pagar;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Landmark className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Aging — Receber e Pagar</h1>
          <p className="text-xs text-muted-foreground">
            Títulos em aberto agrupados por faixa de atraso (data-base configurável).
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={() => exportar(aba)}
          disabled={!!exporting || loading || !bloco}
        >
          {exporting === aba
            ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            : <FileSpreadsheet className="h-4 w-4 mr-1" />}
          Exportar Excel ({aba === 'receber' ? 'Receber' : 'Pagar'})
        </Button>
        <Button size="sm" variant="outline" onClick={carregar} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} /> Atualizar
        </Button>
      </header>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <Label className="text-xs">Empresa (codemp)</Label>
            <Input type="number" value={codemp} onChange={(e) => setCodemp(Number(e.target.value))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Filial (codfil)</Label>
            <Input type="number" value={codfil ?? ''} onChange={(e) => setCodfil(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="opcional" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Data-base</Label>
            <Input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Top N maiores parceiros</Label>
            <Input type="number" min={5} value={topN} onChange={(e) => setTopN(Number(e.target.value) || 50)} className="h-9" />
          </div>
          <Button onClick={carregar} className="h-9">Aplicar</Button>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className="text-xs">Dica de negócio</AlertTitle>
        <AlertDescription className="text-xs">
          O Aging mostra o <strong>passado</strong> (o que já venceu). Cruze com a{' '}
          <Link to="/contabilidade/fluxo-caixa" className="underline text-primary">Projeção de vencimentos</Link>{' '}
          (Fluxo de Caixa) para ver o <strong>futuro</strong>.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Aging indisponível</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!loading && data && (
        <Tabs value={aba} onValueChange={(v) => setAba(v as 'receber' | 'pagar')}>
          <TabsList>
            <TabsTrigger value="receber" disabled={!data.receber}>A Receber</TabsTrigger>
            <TabsTrigger value="pagar" disabled={!data.pagar}>A Pagar</TabsTrigger>
          </TabsList>

          <TabsContent value="receber" className="space-y-4">
            {data.receber ? (
              <>
                <ResumoCards bloco={data.receber} tipo="receber" />
                <TabelaBloco bloco={data.receber} />
              </>
            ) : <p className="text-xs text-muted-foreground">Sem dados de contas a receber.</p>}
          </TabsContent>

          <TabsContent value="pagar" className="space-y-4">
            {data.pagar ? (
              <>
                <ResumoCards bloco={data.pagar} tipo="pagar" />
                <TabelaBloco bloco={data.pagar} />
              </>
            ) : <p className="text-xs text-muted-foreground">Sem dados de contas a pagar.</p>}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
