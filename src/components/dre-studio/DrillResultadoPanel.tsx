import { useMemo, useRef, useState } from 'react';
import { FloatingHScrollbar } from './FloatingHScrollbar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download, Copy, ChevronDown, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useDrillDre } from '@/hooks/contabil/useDrillDre';
import { useDrillLancamentos } from '@/hooks/contabil/useDrillLancamentos';
import {
  DRILL_LABELS,
  type DrillDimensao,
  type DrillDreColumn,
} from '@/lib/contabil/drillDreApi';
import type { DrillLancamentoItem } from '@/lib/contabil/drillLancamentosApi';

export interface DrillResultadoContext {
  modeloId: string;
  linhaId: string;
  codigoLinha?: string | null;
  linhaDescricao: string;
  agrupar_por: DrillDimensao;
  /** Valor bruto do backend (`item.agrupar_por`), preservado para a query. */
  agrupar_por_raw?: string | null;
  /** Ação do item do menu (`reabrir` | `consulta`). */
  acao?: string | null;
  /** Endpoint retornado no item do menu. Default: /api/contabil/drill-dre. */
  endpoint?: string | null;
  /** Label vindo do backend, para o título do drawer. */
  itemLabel?: string | null;
  filtros: {
    codemp?: number | null;
    codfil?: number | null;
    anomes_ini: number;
    anomes_fim: number;
    unidade?: string | null;
    centro_custo?: string | null;
    modo_balanco?: string | null;
    consolidado?: boolean | null;
  };
  /** Total oficial da linha na DRE (para conferência visual). */
  totalLinhaDre?: number | null;
}


interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctx: DrillResultadoContext | null;
}

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const num = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const intFmt = new Intl.NumberFormat('pt-BR');

function fmtMoeda(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  if (n < 0) return `(${brl.format(Math.abs(n))})`;
  return brl.format(n);
}
function fmtPct(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${num.format(n)}%`;
}
function fmtNum(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return String(v ?? '—');
  return num.format(n);
}
function fmtData(v: unknown): string {
  if (v == null || v === '') return '—';
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
  return s;
}
function fmtCell(col: DrillDreColumn, v: unknown): string {
  switch (col.format) {
    case 'currency': return fmtMoeda(v);
    case 'percent': return fmtPct(v);
    case 'number': return fmtNum(v);
    case 'date': return fmtData(v);
    default: return v == null ? '' : String(v);
  }
}

function anomesLabel(a: number): string {
  const s = String(a);
  if (s.length !== 6) return s;
  return `${s.slice(4)}/${s.slice(0, 4)}`;
}

function slug(s: string): string {
  return String(s || 'drill')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// ============== Colunas do drill de lançamentos ==============
const LCT_COLUMNS: DrillDreColumn[] = [
  { key: 'data', label: 'Data', format: 'date' },
  { key: 'lote', label: 'Lote', format: 'text' },
  { key: 'numero', label: 'Número', format: 'text' },
  { key: 'debito', label: 'Débito', format: 'currency' },
  { key: 'credito', label: 'Crédito', format: 'currency' },
  { key: 'ccu', label: 'Centro de Custo', format: 'text' },
  { key: 'historico', label: 'Histórico', format: 'text' },
  { key: 'valor', label: 'Valor', format: 'currency' },
];

// ============== Unidade de Negócio (apenas apresentação) ==============
// Mapa exclusivo do DrillResultadoPanel — o frontend NUNCA classifica
// lançamentos por prefixo do centro de custo. Estes rótulos apenas
// traduzem os códigos canônicos devolvidos pelo backend.
const UN_LABELS: Record<string, string> = {
  GENIUS: 'Genius',
  ESTRUTURAL: 'Estrutural Zortea',
  NAO_CLASSIFICADO: 'Não classificado',
};
const UN_ORDER: Record<string, number> = {
  ESTRUTURAL: 0,
  GENIUS: 1,
  NAO_CLASSIFICADO: 2,
};

function unidadeCodigoRaw(row: Record<string, any>): string {
  const raw =
    row?.unidade_negocio ??
    row?.unidade ??
    row?.codigo ??
    row?.chave ??
    '';
  return String(raw ?? '').trim().toUpperCase();
}
function unidadeLabel(row: Record<string, any>): string {
  const code = unidadeCodigoRaw(row);
  return UN_LABELS[code] ?? (row?.descricao ? String(row.descricao) : code || '—');
}
function isNaoClassificado(row: Record<string, any>): boolean {
  return unidadeCodigoRaw(row) === 'NAO_CLASSIFICADO';
}

export function DrillResultadoPanel({ open, onOpenChange, ctx }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(500);

  // reset page when ctx changes
  useMemo(() => setPage(1), [ctx?.linhaId, ctx?.agrupar_por]);

  const isLancamento = ctx?.agrupar_por === 'lancamento';

  const qAgg = useDrillDre(
    ctx && !isLancamento
      ? {
          modelo_id: ctx.modeloId,
          linha_id: ctx.linhaId,
          agrupar_por: ctx.agrupar_por,
          agrupar_por_raw: ctx.agrupar_por_raw ?? undefined,
          endpoint: ctx.endpoint ?? undefined,
          acao: ctx.acao ?? undefined,
          anomes_ini: ctx.filtros.anomes_ini,
          anomes_fim: ctx.filtros.anomes_fim,
          codemp: ctx.filtros.codemp ?? undefined,
          codfil: ctx.filtros.codfil ?? undefined,
          unidade: ctx.filtros.unidade ?? undefined,
          centro_custo: ctx.filtros.centro_custo ?? undefined,
          modo_balanco: ctx.filtros.modo_balanco ?? undefined,
          consolidado: ctx.filtros.consolidado ?? undefined,
          page,
          page_size: pageSize,
        }
      : null,
    open,
  );


  const qLct = useDrillLancamentos(
    ctx && isLancamento
      ? {
          modelo_id: ctx.modeloId,
          linha_id: ctx.linhaId,
          anomes_ini: ctx.filtros.anomes_ini,
          anomes_fim: ctx.filtros.anomes_fim,
          codemp: ctx.filtros.codemp ?? undefined,
          codfil: ctx.filtros.codfil ?? undefined,
          unidade: ctx.filtros.unidade ?? undefined,
          centro_custo: ctx.filtros.centro_custo ?? undefined,
          limite: 5000,
        }
      : null,
    open,
  );

  const isLoading = isLancamento ? qLct.isLoading : qAgg.isLoading;
  const isError = isLancamento ? qLct.isError : qAgg.isError;
  const error = (isLancamento ? qLct.error : qAgg.error) as Error | null;
  const isFetching = isLancamento ? qLct.isFetching : qAgg.isFetching;

  const isUnidade = ctx?.agrupar_por === 'unidade_negocio';

  const columns: DrillDreColumn[] = isLancamento
    ? LCT_COLUMNS
    : (qAgg.data?.columns ?? []);
  const rawRows: Array<Record<string, any>> = isLancamento
    ? ((qLct.data?.itens ?? []) as DrillLancamentoItem[])
    : (qAgg.data?.rows ?? []);

  // Ordenação Estrutural → Genius → Não classificado (apenas para a dimensão
  // unidade_negocio). Demais categorias entram no final por maior valor.
  const rows: Array<Record<string, any>> = useMemo(() => {
    if (!isUnidade || !rawRows.length) return rawRows;
    const valorKey =
      columns.find((c) => c.format === 'currency' && /valor|total|saldo/i.test(c.key))?.key ??
      'valor';
    return [...rawRows].sort((a, b) => {
      const oa = UN_ORDER[unidadeCodigoRaw(a)] ?? 99;
      const ob = UN_ORDER[unidadeCodigoRaw(b)] ?? 99;
      if (oa !== ob) return oa - ob;
      return (Number(b[valorKey]) || 0) - (Number(a[valorKey]) || 0);
    });
  }, [isUnidade, rawRows, columns]);

  const truncado = isLancamento ? Boolean(qLct.data?.truncado) : false;
  const qtdTotal = isLancamento ? (qLct.data?.qtd_total ?? 0) : 0;

  const totalDrill = useMemo(() => {
    if (isLancamento) {
      if (typeof qLct.data?.total_valor === 'number') return qLct.data.total_valor;
      return rows.reduce((s, r) => s + (Number(r.valor) || 0), 0);
    }
    if (qAgg.data?.total != null) return qAgg.data.total;
    const c =
      columns.find((x) => x.format === 'currency' && /valor|total|saldo/i.test(x.key)) ??
      columns.find((x) => x.format === 'currency');
    if (!c) return null;
    return rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
  }, [isLancamento, qLct.data, qAgg.data, rows, columns]);

  // Indicador de qualidade da classificação (apenas visual). Nunca altera
  // valores contábeis nem redistribui "Não classificado".
  const unidadeStats = useMemo(() => {
    if (!isUnidade || !rows.length) return null;
    const valorKey =
      columns.find((c) => c.format === 'currency' && /valor|total|saldo/i.test(c.key))?.key ??
      'valor';
    const pctKey =
      columns.find((c) => c.format === 'percent')?.key ??
      (rows.some((r) => r.percentual != null) ? 'percentual' : null);
    const totalAbs = rows.reduce((s, r) => s + Math.abs(Number(r[valorKey]) || 0), 0);
    let pctGenius = 0;
    let pctEstrutural = 0;
    let pctNao = 0;
    for (const r of rows) {
      const code = unidadeCodigoRaw(r);
      let pct: number;
      if (pctKey && r[pctKey] != null && Number.isFinite(Number(r[pctKey]))) {
        pct = Number(r[pctKey]);
      } else if (totalAbs > 0) {
        pct = (Math.abs(Number(r[valorKey]) || 0) / totalAbs) * 100;
      } else {
        pct = 0;
      }
      if (code === 'GENIUS') pctGenius += pct;
      else if (code === 'ESTRUTURAL') pctEstrutural += pct;
      else if (code === 'NAO_CLASSIFICADO') pctNao += pct;
    }
    return {
      classificado: pctGenius + pctEstrutural,
      naoClassificado: pctNao,
      temNaoClassificado: rows.some((r) => isNaoClassificado(r)),
    };
  }, [isUnidade, rows, columns]);

  const totalLinha = ctx?.totalLinhaDre ?? qAgg.data?.total_linha ?? null;
  const diferenca =
    totalLinha != null && totalDrill != null ? totalLinha - totalDrill : null;
  const unidadeDivergente =
    isUnidade && totalLinha != null && totalDrill != null &&
    Math.abs(totalLinha - totalDrill) > 0.01;

  const periodoLabel = ctx
    ? `${anomesLabel(ctx.filtros.anomes_ini)} a ${anomesLabel(ctx.filtros.anomes_fim)}`
    : '';

  const exportCsv = () => {
    if (!ctx || !rows.length) return;
    const header = columns.map((c) => c.label);
    const linhas = rows.map((r) => columns.map((c) => fmtCell(c, r[c.key])));
    const all = [header, ...linhas];
    const csv = all
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drill-dre-${slug(ctx.linhaDescricao)}-${ctx.agrupar_por}-${ctx.filtros.anomes_ini}-${ctx.filtros.anomes_fim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = () => {
    if (!ctx || !rows.length) return;
    const header = columns.map((c) => c.label);
    const bodyRows = rows.map((r) =>
      columns.map((c) => {
        // Na dimensão unidade_negocio, substitui a coluna textual da chave
        // pelo rótulo amigável (Genius / Estrutural Zortea / Não classificado).
        if (isUnidade && (c.format === 'text' || !c.format)) {
          const isKeyCol =
            c.key === 'unidade_negocio' ||
            c.key === 'unidade' ||
            c.key === 'codigo' ||
            c.key === 'chave' ||
            c.key === 'descricao';
          if (isKeyCol) return unidadeLabel(r);
        }
        const v = r[c.key];
        if (c.format === 'currency' || c.format === 'number' || c.format === 'percent') {
          const n = Number(v);
          return Number.isFinite(n) ? n : v ?? '';
        }
        if (c.format === 'date') return fmtData(v);
        return v ?? '';
      }),
    );

    const aoa: any[][] = [];
    if (isUnidade) {
      aoa.push(['DRE Padrão — Análise por Unidade de Negócio']);
      aoa.push(['Modelo', ctx.modeloId ?? '']);
      aoa.push(['Linha analisada', ctx.linhaDescricao]);
      aoa.push(['Período', periodoLabel]);
      aoa.push(['Empresa', ctx.filtros.codemp ?? '']);
      aoa.push(['Filial', ctx.filtros.codfil ?? '']);
      aoa.push([]);
    }
    aoa.push(header, ...bodyRows);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Drill');
    XLSX.writeFile(
      wb,
      `drill-dre-${slug(ctx.linhaDescricao)}-${ctx.agrupar_por}-${ctx.filtros.anomes_ini}-${ctx.filtros.anomes_fim}.xlsx`,
    );
  };

  const copiar = async () => {
    if (!rows.length) return;
    const header = columns.map((c) => c.label).join('\t');
    const body = rows
      .map((r) => columns.map((c) => fmtCell(c, r[c.key])).join('\t'))
      .join('\n');
    try {
      await navigator.clipboard.writeText(`${header}\n${body}`);
      toast.success('Tabela copiada');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const hasRows = rows.length > 0;
  const drillScrollRef = useRef<HTMLDivElement>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col">
        {/* Cabeçalho fixo */}
        <div className="shrink-0 border-b bg-background px-6 pt-6 pb-3">
          <SheetHeader>
            <SheetTitle>
              {ctx?.acao === 'reabrir' ? 'Reabrir — ' : 'Drill — '}
              {ctx?.linhaDescricao}
            </SheetTitle>
            <SheetDescription>
              <span className="font-medium">
                {ctx?.itemLabel ?? (ctx ? DRILL_LABELS[ctx.agrupar_por] : '')}
              </span>
              {' · '}Período: {periodoLabel}
              {ctx?.codigoLinha && <> · Código: <code className="text-xs">{ctx.codigoLinha}</code></>}
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                {ctx?.filtros.codemp != null && <span>codemp {ctx.filtros.codemp}</span>}
                {ctx?.filtros.codfil != null && <span>codfil {ctx.filtros.codfil}</span>}
                {ctx?.filtros.consolidado && <span>consolidado</span>}
                {ctx?.filtros.centro_custo && <span>CCU {ctx.filtros.centro_custo}</span>}
                {ctx?.filtros.unidade && <span>UN {ctx.filtros.unidade}</span>}
                {ctx?.filtros.modo_balanco && <span>modo {ctx.filtros.modo_balanco}</span>}
              </div>
            </SheetDescription>
          </SheetHeader>

          {truncado && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Foram exibidos os primeiros {intFmt.format(rows.length)} lançamentos
                de um total de {intFmt.format(qtdTotal)} registros. Refine o período
                ou os filtros para visualizar menos registros.
              </div>
            </div>
          )}

          {hasRows && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {rows.length} {rows.length === 1 ? 'registro' : 'registros'}
                {!isLancamento && qAgg.data?.has_more && ' · há mais resultados'}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="gap-1" onClick={copiar}>
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={exportCsv}>
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={exportXlsx}>
                  <Download className="h-3.5 w-3.5" /> XLSX
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Área rolável */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 pb-6">
          {isLoading ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground mb-1">Carregando drill...</div>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErroBloco err={error as Error} />
          ) : !hasRows ? (
            <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Nenhum dado encontrado para esta linha e período.
            </div>
          ) : (
            <>
              {isUnidade && unidadeStats && (
                <div className="mb-3 rounded-lg border bg-muted/20 p-3 text-xs">
                  <div className="mb-1 font-medium text-foreground">
                    Qualidade da classificação
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-muted-foreground">Classificado</div>
                      <div className="tabular-nums font-semibold">
                        {fmtPct(unidadeStats.classificado)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Não classificado</div>
                      <div
                        className={cn(
                          'tabular-nums font-semibold',
                          unidadeStats.naoClassificado > 0 &&
                            'text-amber-700 dark:text-amber-400',
                        )}
                      >
                        {fmtPct(unidadeStats.naoClassificado)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Indicador visual calculado a partir dos valores devolvidos pelo backend.
                    O frontend não classifica lançamentos.
                  </div>
                  {unidadeDivergente && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      A classificação por unidade não fecha com o total da linha.
                    </div>
                  )}
                </div>
              )}

              <div ref={drillScrollRef} className="overflow-x-auto rounded-lg border">
                <Table style={{ minWidth: Math.max(980, columns.length * 150) }}>
                  <TableHeader>
                    <TableRow>
                      {columns.map((c) => (
                        <TableHead
                          key={c.key}
                          className={cn(
                            c.format === 'currency' || c.format === 'number' || c.format === 'percent'
                              ? 'text-right'
                              : c.align === 'center'
                                ? 'text-center'
                                : 'text-left',
                          )}
                        >
                          {c.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => {
                      const naoClass = isUnidade && isNaoClassificado(r);
                      return (
                        <TableRow key={i}>
                          {columns.map((c, ci) => {
                            const v = r[c.key];
                            const isNumeric =
                              c.format === 'currency' || c.format === 'number' || c.format === 'percent';
                            const n = Number(v);
                            // Primeira coluna textual em dimensão unidade: mostra rótulo amigável + badge.
                            const isKeyCol =
                              isUnidade &&
                              !isNumeric &&
                              ci === 0;
                            return (
                              <TableCell
                                key={c.key}
                                className={cn(
                                  'text-xs',
                                  isNumeric && 'text-right tabular-nums',
                                  isNumeric && Number.isFinite(n) && n < 0 && 'text-destructive',
                                )}
                              >
                                {isKeyCol ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="font-medium">{unidadeLabel(r)}</span>
                                    {naoClass && (
                                      <TooltipProvider delayDuration={150}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 cursor-help">
                                              atenção
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs text-xs">
                                            Lançamentos cujo centro de custo não possui
                                            identificação G- ou E- na descrição.
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </span>
                                ) : (
                                  fmtCell(c, v)
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>


              {!isLancamento && qAgg.data?.has_more && (
                <div className="mt-3 flex justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={isFetching}
                  >
                    Carregar mais
                  </Button>
                </div>
              )}

              <div className="mt-4 rounded-lg border bg-muted/20 p-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-muted-foreground">Total do drill</div>
                    <div className="tabular-nums font-semibold">
                      {totalDrill != null ? fmtMoeda(totalDrill) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total da linha (DRE)</div>
                    <div className="tabular-nums font-semibold">
                      {totalLinha != null ? fmtMoeda(totalLinha) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Diferença</div>
                    <div
                      className={cn(
                        'tabular-nums font-semibold',
                        diferenca != null && Math.abs(diferenca) > 0.01 && 'text-destructive',
                      )}
                    >
                      {diferenca != null ? fmtMoeda(diferenca) : '—'}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Diferença é apenas conferência visual. Os valores exibidos vêm do backend sem
                  recálculo no frontend.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Barra de rolagem horizontal flutuante — sempre visível acima do rodapé */}
        {hasRows && (
          <div className="shrink-0 z-20">
            <FloatingHScrollbar targetRef={drillScrollRef} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}


function ErroBloco({ err }: { err: Error }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <div className="flex items-center gap-2 font-medium text-destructive">
        <AlertCircle className="h-4 w-4" />
        Não foi possível carregar o drill.
      </div>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn('h-3 w-3 transition', aberto && 'rotate-180')} />
        Detalhes técnicos
      </button>
      {aberto && (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-background p-2 text-[11px] text-muted-foreground">
          {err?.message}
        </pre>
      )}
    </div>
  );
}
