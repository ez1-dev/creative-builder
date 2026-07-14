import { useMemo, useState } from 'react';
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
import { Download, Copy, ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useDrillDre } from '@/hooks/contabil/useDrillDre';
import {
  DRILL_LABELS,
  type DrillDimensao,
  type DrillDreColumn,
} from '@/lib/contabil/drillDreApi';

export interface DrillResultadoContext {
  modeloId: string;
  linhaId?: string | null;
  codigoLinha?: string | null;
  linhaDescricao: string;
  agrupar_por: DrillDimensao;
  filtros: {
    codemp?: number | null;
    codfil?: number | null;
    anomes_ini: number;
    anomes_fim: number;
    unidade?: string | null;
    centro_custo?: string | null;
    modo_balanco?: string | null;
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
  // aceita YYYY-MM-DD ou ISO
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

export function DrillResultadoPanel({ open, onOpenChange, ctx }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(500);

  // reset page when ctx changes
  useMemo(() => setPage(1), [ctx?.linhaId, ctx?.agrupar_por]);

  const q = useDrillDre(
    ctx
      ? {
          modelo_id: ctx.modeloId,
          linha_id: ctx.linhaId ?? undefined,
          codigo_linha: ctx.codigoLinha ?? undefined,
          agrupar_por: ctx.agrupar_por,
          anomes_ini: ctx.filtros.anomes_ini,
          anomes_fim: ctx.filtros.anomes_fim,
          codemp: ctx.filtros.codemp ?? undefined,
          codfil: ctx.filtros.codfil ?? undefined,
          unidade: ctx.filtros.unidade ?? undefined,
          centro_custo: ctx.filtros.centro_custo ?? undefined,
          modo_balanco: ctx.filtros.modo_balanco ?? undefined,
          page,
          page_size: pageSize,
        }
      : null,
    open,
  );

  const columns = q.data?.columns ?? [];
  const rows = q.data?.rows ?? [];

  const totalDrill = useMemo(() => {
    if (q.data?.total != null) return q.data.total;
    // heurística: primeira coluna currency
    const c = columns.find((x) => x.format === 'currency' && /valor|total|saldo/i.test(x.key)) ??
              columns.find((x) => x.format === 'currency');
    if (!c) return null;
    return rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
  }, [q.data, rows, columns]);

  const totalLinha = ctx?.totalLinhaDre ?? q.data?.total_linha ?? null;
  const diferenca =
    totalLinha != null && totalDrill != null ? totalLinha - totalDrill : null;

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
    const linhas = rows.map((r) =>
      columns.map((c) => {
        const v = r[c.key];
        if (c.format === 'currency' || c.format === 'number' || c.format === 'percent') {
          const n = Number(v);
          return Number.isFinite(n) ? n : v ?? '';
        }
        if (c.format === 'date') return fmtData(v);
        return v ?? '';
      }),
    );
    const ws = XLSX.utils.aoa_to_sheet([header, ...linhas]);
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Drill — {ctx?.linhaDescricao}</SheetTitle>
          <SheetDescription>
            <span className="font-medium">{ctx ? DRILL_LABELS[ctx.agrupar_por] : ''}</span>
            {' · '}Período: {periodoLabel}
            {ctx?.codigoLinha && <> · Código: <code className="text-xs">{ctx.codigoLinha}</code></>}
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {ctx?.filtros.codemp != null && <span>codemp {ctx.filtros.codemp}</span>}
              {ctx?.filtros.codfil != null && <span>codfil {ctx.filtros.codfil}</span>}
              {ctx?.filtros.centro_custo && <span>CCU {ctx.filtros.centro_custo}</span>}
              {ctx?.filtros.unidade && <span>UN {ctx.filtros.unidade}</span>}
              {ctx?.filtros.modo_balanco && <span>modo {ctx.filtros.modo_balanco}</span>}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          {q.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : q.isError ? (
            <ErroBloco err={q.error as Error} />
          ) : rows.length === 0 ? (
            <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Nenhum lançamento encontrado para esta linha e período.
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {rows.length} {rows.length === 1 ? 'registro' : 'registros'}
                  {q.data?.has_more && ' · há mais resultados'}
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

              <div className="overflow-x-auto rounded-lg border">
                <Table>
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
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        {columns.map((c) => {
                          const v = r[c.key];
                          const isNumeric =
                            c.format === 'currency' || c.format === 'number' || c.format === 'percent';
                          const n = Number(v);
                          return (
                            <TableCell
                              key={c.key}
                              className={cn(
                                'text-xs',
                                isNumeric && 'text-right tabular-nums',
                                isNumeric && Number.isFinite(n) && n < 0 && 'text-destructive',
                              )}
                            >
                              {fmtCell(c, v)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {q.data?.has_more && (
                <div className="mt-3 flex justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={q.isFetching}
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
        Não foi possível carregar o drill desta linha.
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
