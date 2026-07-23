import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, FileSpreadsheet, Landmark, Loader2,
  RefreshCw, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumberBR } from '@/lib/format';
import { CODEMP } from '@/lib/contabilConfig';
import {
  fetchConciliacaoEstoque,
  downloadConciliacaoEstoqueExcel,
  type ConciliacaoEstoqueResponse,
  type ConciliacaoEstoqueConta,
} from '@/lib/contabil/conciliacaoEstoqueApi';
import { DataTableBI, type Column } from '@/components/bi/tables/DataTableBI';

function hojeISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function ConciliacaoEstoquePage() {
  const [dataFim, setDataFim] = useState<string>(hojeISO());
  const [codemp, setCodemp] = useState<number>(CODEMP || 1);
  const [codfil, setCodfil] = useState<number | undefined>(undefined);
  const [clacta, setClacta] = useState<string>('');
  const [tolerancia, setTolerancia] = useState<number>(1);
  const [somenteDiv, setSomenteDiv] = useState<boolean>(false);

  const [data, setData] = useState<ConciliacaoEstoqueResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const carregar = useCallback(async () => {
    if (!dataFim) { toast.info('Informe a data de corte.'); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await fetchConciliacaoEstoque({
        data_fim: dataFim,
        codemp,
        codfil,
        clacta: clacta || undefined,
        tolerancia,
        somente_divergencias: somenteDiv || undefined,
      });
      setData(r);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar conciliação.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dataFim, codemp, codfil, clacta, tolerancia, somenteDiv]);

  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportar = async () => {
    setExporting(true);
    try {
      await downloadConciliacaoEstoqueExcel({
        data_fim: dataFim,
        codemp,
        codfil,
        clacta: clacta || undefined,
        tolerancia,
        somente_divergencias: somenteDiv || undefined,
      });
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao exportar conciliação.');
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<ConciliacaoEstoqueConta>[] = useMemo(() => [
    { key: 'clacta', header: 'Classificação', align: 'left', sortable: true,
      render: (v) => <span className="text-xs font-mono tabular-nums">{String(v)}</span> },
    { key: 'descricao', header: 'Descrição', align: 'left', sortable: true,
      render: (v) => <span className="text-xs">{v}</span> },
    { key: 'saldo_estoque', header: 'Saldo Estoque', align: 'right', sortable: true,
      render: (v) => <span className="text-xs tabular-nums">{formatCurrency(Number(v || 0))}</span> },
    { key: 'saldo_contabil', header: 'Saldo Contábil', align: 'right', sortable: true,
      render: (v) => <span className="text-xs tabular-nums">{formatCurrency(Number(v || 0))}</span> },
    { key: 'diferenca', header: 'Diferença', align: 'right', sortable: true,
      render: (v) => {
        const n = Number(v || 0);
        return (
          <span className={cn(
            'text-xs tabular-nums font-medium',
            n > 0 && 'text-emerald-600 dark:text-emerald-400',
            n < 0 && 'text-destructive',
          )}>{formatCurrency(n)}</span>
        );
      } },
    { key: 'ok', header: 'Situação', align: 'center', sortable: true,
      render: (_v, row) => row.ok
        ? <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-600 bg-emerald-500/10">OK</Badge>
        : <Badge variant="outline" className="text-[10px] border-destructive/50 text-destructive bg-destructive/10">Divergente</Badge> },
    { key: 'acoes' as any, header: 'Ações', align: 'center',
      render: (_v, row) => (
        <Button asChild size="sm" variant="ghost" className="h-7 text-[11px]">
          <Link to={`/contabilidade/kardex?clacta=${encodeURIComponent(row.clacta)}`}>
            <ExternalLink className="h-3 w-3 mr-1" /> Kardex
          </Link>
        </Button>
      ) },
  ], []);

  const contas = useMemo(() => {
    const list = data?.contas || [];
    return somenteDiv ? list.filter(c => !c.ok) : list;
  }, [data, somenteDiv]);

  const rowClassConta = (r: ConciliacaoEstoqueConta) => (!r.ok ? 'bg-destructive/5' : '');

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Landmark className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Conciliação Estoque × Contábil</h1>
          <p className="text-xs text-muted-foreground">
            Regra 81 do relatório 512: compara, por conta contábil, o saldo de estoque
            (E210MVP) com o saldo contábil (E640LCT) até a data de corte.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={exportar} disabled={exporting || loading || !data}>
          {exporting
            ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            : <FileSpreadsheet className="h-4 w-4 mr-1" />}
          Exportar Excel
        </Button>
        <Button size="sm" variant="outline" onClick={carregar} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} /> Atualizar
        </Button>
      </header>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div>
            <Label className="text-xs">Data de corte</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Empresa</Label>
            <Input type="number" value={codemp} onChange={(e) => setCodemp(Number(e.target.value))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Filial</Label>
            <Input type="number" value={codfil ?? ''}
              onChange={(e) => setCodfil(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="opcional" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Classe contábil (clacta)</Label>
            <Input value={clacta} onChange={(e) => setClacta(e.target.value)}
              placeholder="ex.: 1125" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Tolerância (R$)</Label>
            <Input type="number" min={0} step="0.01" value={tolerancia}
              onChange={(e) => setTolerancia(Number(e.target.value) || 0)} className="h-9" />
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Checkbox id="somente-div" checked={somenteDiv}
              onCheckedChange={(v) => setSomenteDiv(Boolean(v))} />
            <Label htmlFor="somente-div" className="text-xs cursor-pointer">
              Somente divergências
            </Label>
          </div>
          <Button onClick={carregar} className="h-9 md:col-span-2" disabled={loading}>
            Consultar
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Conciliação indisponível</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* Selo global de conciliação */}
          <Alert className={cn(
            data.resumo.conciliado
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-destructive/50 bg-destructive/5',
          )}>
            {data.resumo.conciliado
              ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              : <AlertTriangle className="h-4 w-4 text-destructive" />}
            <AlertTitle className="text-sm">
              {data.resumo.conciliado
                ? 'CONCILIADO'
                : `DIVERGE (${data.resumo.contas_divergentes} conta${data.resumo.contas_divergentes === 1 ? '' : 's'})`}
            </AlertTitle>
            <AlertDescription className="text-xs">
              Data de corte {data.data_corte}
              {data.clacta_filtro && <> · classe {data.clacta_filtro}</>}
              {' '}· {data.resumo.contas_analisadas} conta{data.resumo.contas_analisadas === 1 ? '' : 's'} analisada{data.resumo.contas_analisadas === 1 ? '' : 's'}.
            </AlertDescription>
          </Alert>

          {/* Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Saldo Estoque</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(data.totais.saldo_estoque)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Saldo Contábil</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(data.totais.saldo_contabil)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Diferença</p>
              <p className={cn(
                'text-lg font-bold tabular-nums',
                data.totais.diferenca > 0 && 'text-emerald-600 dark:text-emerald-400',
                data.totais.diferenca < 0 && 'text-destructive',
              )}>{formatCurrency(data.totais.diferenca)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Contas divergentes</p>
              <p className={cn(
                'text-lg font-bold tabular-nums',
                data.resumo.contas_divergentes > 0 && 'text-destructive',
              )}>
                {data.resumo.contas_divergentes} / {data.resumo.contas_analisadas}
              </p>
              <p className="text-[10px] text-muted-foreground">Tolerância {formatCurrency(tolerancia)}</p>
            </CardContent></Card>
          </div>

          {/* Tabela */}
          <DataTableBI
            columns={columns}
            data={contas}
            rowClassName={rowClassConta}
            emptyMessage="Nenhuma conta a exibir."
          />
        </>
      )}
    </div>
  );
}
