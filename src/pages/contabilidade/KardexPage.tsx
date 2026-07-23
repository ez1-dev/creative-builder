import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, FileSpreadsheet, Loader2, Package, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumberBR, formatDateBR } from '@/lib/format';
import { CODEMP } from '@/lib/contabilConfig';
import { AutocompleteAsync } from '@/components/erp/AutocompleteAsync';
import type { CadastroOption } from '@/hooks/useCadastrosErp';
import { requisicoesApi } from '@/services/requisicoesApi';
import { fetchKardex, downloadKardexExcel, type KardexMovimento, type KardexResponse } from '@/lib/contabil/kardexApi';
import { DataTableBI, type Column } from '@/components/bi/tables/DataTableBI';

function dataISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Adapta o lookup de componentes do ERP para o formato do AutocompleteAsync.
async function fetchComponentesOptions(q: string): Promise<CadastroOption[]> {
  try {
    const list = await requisicoesApi.buscarComponentes({ q });
    return list.map((c) => ({
      codigo: c.codigo,
      descricao: c.descricao,
      label: c.descricao ? `${c.codigo} - ${c.descricao}` : c.codigo,
    }));
  } catch {
    return [];
  }
}

function tipoBadge(t: string) {
  const isEntrada = t === 'entrada';
  const isTransf = t === 'transferencia';
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] uppercase',
        isEntrada && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
        isTransf && 'border-sky-500/50 text-sky-600 dark:text-sky-400 bg-sky-500/10',
        !isEntrada && !isTransf && 'border-destructive/50 text-destructive bg-destructive/10',
      )}
    >
      {t}
    </Badge>
  );
}

function rowClassKardex(row: KardexMovimento): string {
  if (row.tipo === 'entrada') return 'bg-emerald-500/5';
  if (row.tipo === 'transferencia') return 'bg-sky-500/5';
  if (row.tipo === 'saida') return 'bg-destructive/5';
  return '';
}

export default function KardexPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const hoje = useMemo(() => new Date(), []);
  const _90d = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d; }, []);

  const [codpro, setCodpro] = useState<string>(searchParams.get('codpro') || '');
  const [dataIni, setDataIni] = useState<string>(searchParams.get('data_ini') || dataISO(_90d));
  const [dataFim, setDataFim] = useState<string>(searchParams.get('data_fim') || dataISO(hoje));
  const [codemp, setCodemp] = useState<number>(Number(searchParams.get('codemp')) || CODEMP || 1);
  const [codfil, setCodfil] = useState<number | undefined>(
    searchParams.get('codfil') ? Number(searchParams.get('codfil')) : undefined,
  );
  const [coddep, setCoddep] = useState<string>(searchParams.get('coddep') || '');
  const [codder, setCodder] = useState<string>(searchParams.get('codder') || '');

  const [data, setData] = useState<KardexResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const carregar = useCallback(async () => {
    if (!codpro) { toast.info('Selecione um produto para consultar o Kardex.'); return; }
    if (!dataIni || !dataFim) { toast.info('Informe o período (início e fim).'); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await fetchKardex({
        codpro, data_ini: dataIni, data_fim: dataFim, codemp, codfil,
        coddep: coddep || undefined, codder: codder || undefined,
      });
      setData(r);
      const sp = new URLSearchParams();
      sp.set('codpro', codpro);
      sp.set('data_ini', dataIni);
      sp.set('data_fim', dataFim);
      sp.set('codemp', String(codemp));
      if (codfil) sp.set('codfil', String(codfil));
      if (coddep) sp.set('coddep', coddep);
      if (codder) sp.set('codder', codder);
      setSearchParams(sp, { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar Kardex.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [codpro, dataIni, dataFim, codemp, codfil, coddep, codder, setSearchParams]);

  // Auto-carrega se veio codpro por query string
  useEffect(() => {
    if (searchParams.get('codpro')) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportar = async () => {
    if (!codpro) return;
    setExporting(true);
    try {
      await downloadKardexExcel({
        codpro, data_ini: dataIni, data_fim: dataFim, codemp, codfil,
        coddep: coddep || undefined, codder: codder || undefined,
      });
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao exportar Kardex.');
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<KardexMovimento>[] = useMemo(() => [
    { key: 'data', header: 'Data', align: 'left', sortable: true,
      render: (v) => <span className="text-xs tabular-nums">{formatDateBR(v)}</span> },
    { key: 'transacao', header: 'Transação', align: 'left',
      render: (_v, row) => (
        <div className="text-xs">
          <div className="font-medium tabular-nums">{row.transacao ?? '—'}</div>
          {row.transacao_desc && <div className="text-[10px] text-muted-foreground truncate max-w-[280px]">{row.transacao_desc}</div>}
        </div>
      ) },
    { key: 'deposito', header: 'Depósito', align: 'left',
      render: (v) => <span className="text-xs truncate">{v ?? '—'}</span> },
    { key: 'lote', header: 'Lote', align: 'left',
      render: (v) => <span className="text-xs tabular-nums">{v ?? '—'}</span> },
    { key: 'tipo', header: 'Tipo', align: 'center',
      render: (v) => tipoBadge(String(v)) },
    { key: 'qtd_movimento', header: 'Qtd movimento', align: 'right', sortable: true,
      render: (v) => <span className={cn('text-xs tabular-nums',
        Number(v) < 0 && 'text-destructive', Number(v) > 0 && 'text-emerald-600 dark:text-emerald-400')}>
        {formatNumberBR(Number(v || 0), 3)}
      </span> },
    { key: 'qtd_saldo', header: 'Qtd saldo', align: 'right', sortable: true,
      render: (v) => <span className="text-xs tabular-nums font-medium">{formatNumberBR(Number(v || 0), 3)}</span> },
    { key: 'valor_movimento', header: 'Valor movimento', align: 'right', sortable: true,
      render: (v) => <span className="text-xs tabular-nums">{formatCurrency(Number(v || 0))}</span> },
    { key: 'valor_saldo', header: 'Valor saldo', align: 'right', sortable: true,
      render: (v) => <span className="text-xs tabular-nums font-medium">{formatCurrency(Number(v || 0))}</span> },
    { key: 'custo_medio_saldo', header: 'Custo médio', align: 'right', sortable: true,
      render: (v) => <span className="text-xs tabular-nums">{v != null ? formatCurrency(Number(v)) : '—'}</span> },
  ], []);

  // Conferência de saldo (inclui transferências)
  const conferencia = useMemo(() => {
    if (!data) return null;
    const transfQtd = data.resumo.transferencias_qtd || 0;
    const esperadoQtd =
      data.saldo_inicial.quantidade +
      data.resumo.entradas_qtd -
      data.resumo.saidas_qtd +
      transfQtd;
    const diffQtd = esperadoQtd - data.saldo_final.quantidade;
    const bate = Math.abs(diffQtd) < 0.001;
    return { esperadoQtd, diffQtd, bate, transfQtd };
  }, [data]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Kardex — Ficha de Estoque</h1>
          <p className="text-xs text-muted-foreground">
            Movimentação do produto com saldo corrido (relatório 512 do ERP).
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
          <div className="md:col-span-2">
            <Label className="text-xs">Produto (codpro)</Label>
            <AutocompleteAsync
              value={codpro}
              onChange={(v) => setCodpro(v)}
              fetcher={fetchComponentesOptions}
              placeholder="Buscar componente..."
            />
          </div>
          <div>
            <Label className="text-xs">Data início</Label>
            <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Data fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Empresa</Label>
            <Input type="number" value={codemp} onChange={(e) => setCodemp(Number(e.target.value))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Filial</Label>
            <Input type="number" value={codfil ?? ''} onChange={(e) => setCodfil(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="opcional" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Depósito (coddep)</Label>
            <Input value={coddep} onChange={(e) => setCoddep(e.target.value)} placeholder="opcional" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Derivação (codder)</Label>
            <Input value={codder} onChange={(e) => setCodder(e.target.value)} placeholder="opcional" className="h-9" />
          </div>
          <Button onClick={carregar} className="h-9 md:col-span-2" disabled={!codpro || loading}>
            Consultar
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Kardex indisponível</AlertTitle>
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
          {/* Cabeçalho do produto */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-baseline gap-3">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Produto</p>
                <p className="text-sm font-semibold tabular-nums">{data.produto.codpro}</p>
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="text-[10px] uppercase text-muted-foreground">Descrição</p>
                <p className="text-sm">{data.produto.descricao}</p>
              </div>
              {data.produto.unidade && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Unidade</p>
                  <p className="text-sm">{data.produto.unidade}</p>
                </div>
              )}
              {data.produto.origem && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Origem</p>
                  <p className="text-sm tabular-nums">{data.produto.origem}</p>
                </div>
              )}
              {data.produto.familia && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Família</p>
                  <p className="text-sm">{data.produto.familia}</p>
                </div>
              )}
              {data.produto.conta_contabil && (
                <div className="min-w-[200px]">
                  <p className="text-[10px] uppercase text-muted-foreground">Conta contábil</p>
                  <p className="text-sm tabular-nums">
                    <span className="font-medium">{data.produto.conta_contabil.clacta}</span>
                    <span className="text-muted-foreground"> — {data.produto.conta_contabil.descricao}</span>
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Total de movimentos</p>
                <p className="text-sm tabular-nums">{formatNumberBR(data.total_movimentos, 0)}</p>
              </div>
              {((data.resumo.transferencias_qtd || 0) !== 0 || (data.resumo.transferencias_valor || 0) !== 0) && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Transferências</p>
                  <p className="text-sm tabular-nums text-sky-600 dark:text-sky-400">
                    {formatNumberBR(data.resumo.transferencias_qtd || 0, 3)}
                    {(data.resumo.transferencias_valor || 0) !== 0 && (
                      <> · {formatCurrency(data.resumo.transferencias_valor || 0)}</>
                    )}
                  </p>
                </div>
              )}
              {data.resumo.giro != null && (
                <div title="Giro = saídas ÷ estoque médio ((inicial + final) / 2)">
                  <p className="text-[10px] uppercase text-muted-foreground">Giro (período)</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatNumberBR(Number(data.resumo.giro), 2)}
                  </p>
                  {data.resumo.estoque_medio != null && (
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      est. médio {formatNumberBR(Number(data.resumo.estoque_medio), 3)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4 cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Saldo inicial</p>
              <p className="text-lg font-bold tabular-nums">{formatNumberBR(data.saldo_inicial.quantidade, 3)}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(data.saldo_inicial.valor)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Entradas no período</p>
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatNumberBR(data.resumo.entradas_qtd, 3)}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(data.resumo.entradas_valor)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Saídas no período</p>
              <p className="text-lg font-bold tabular-nums text-destructive">
                {formatNumberBR(data.resumo.saidas_qtd, 3)}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(data.resumo.saidas_valor)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Saldo final</p>
              <p className="text-lg font-bold tabular-nums">{formatNumberBR(data.saldo_final.quantidade, 3)}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatCurrency(data.saldo_final.valor)}
                {data.saldo_final.custo_medio != null && (
                  <> · CM {formatCurrency(data.saldo_final.custo_medio)}</>
                )}
              </p>
            </CardContent></Card>
          </div>

          {/* Conferência */}
          {conferencia && (
            <Alert className={cn(
              conferencia.bate
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-amber-500/50 bg-amber-500/5',
            )}>
              {conferencia.bate
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                : <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
              <AlertTitle className="text-xs">
                Conferência: Saldo inicial + Entradas − Saídas {conferencia.transfQtd !== 0 ? '± Transferências ' : ''}= Saldo final
              </AlertTitle>
              <AlertDescription className="text-xs tabular-nums">
                {formatNumberBR(data.saldo_inicial.quantidade, 3)} +{' '}
                {formatNumberBR(data.resumo.entradas_qtd, 3)} −{' '}
                {formatNumberBR(data.resumo.saidas_qtd, 3)}
                {conferencia.transfQtd !== 0 && (
                  <> {conferencia.transfQtd >= 0 ? '+' : '−'} {formatNumberBR(Math.abs(conferencia.transfQtd), 3)} (transf.)</>
                )}{' '}
                = <strong>{formatNumberBR(conferencia.esperadoQtd, 3)}</strong>{' '}
                vs. saldo final <strong>{formatNumberBR(data.saldo_final.quantidade, 3)}</strong>
                {!conferencia.bate && (
                  <> · diferença {formatNumberBR(conferencia.diffQtd, 3)}</>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Movimentos */}
          <DataTableBI
            columns={columns}
            data={data.movimentos}
            defaultSort={{ key: 'data', dir: 'asc' }}
            rowClassName={rowClassKardex}
            emptyMessage="Nenhum movimento no período."
          />
        </>
      )}

      {!loading && !data && !error && (
        <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">
          Selecione um produto e clique em <strong>Consultar</strong>.
        </CardContent></Card>
      )}
    </div>
  );
}
