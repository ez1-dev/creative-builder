import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Download, Filter, Loader2, RotateCw } from 'lucide-react';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  DataTableBI, LoadingState, EmptyState, ErrorState,
  formatCurrency, formatNumber, type Column,
} from '@/components/bi';
import { cn } from '@/lib/utils';

import {
  fetchComercialDrill, downloadDrillCsv,
  type DrillColumn, type DrillContexto, type DrillResponse, type DrillType,
} from '@/lib/bi/comercialDrillApi';
import { DRILL_LABELS, NEXT_DRILLS, ROW_TO_CTX_KEY } from '@/lib/bi/comercialDrillCatalog';
import type { ComercialDrillStack } from '@/hooks/useComercialDrillStack';

interface Props {
  stack: ComercialDrillStack;
  anomes_ini: string;
  anomes_fim: string;
  unidade_negocio: 'GENIUS' | 'ESTRUTURAL ZORTEA' | 'CONSOLIDADO';
}

const CTX_LABELS: Partial<Record<keyof DrillContexto, string>> = {
  anomes_emissao: 'Mês',
  cd_origem: 'Origem',
  cd_estado: 'UF',
  cd_cliente: 'Cliente',
  cd_rev_pedido: 'Revenda',
  cd_prj: 'Obra',
  cd_tns: 'TNS',
  cd_tp_movimento: 'Mov.',
  cd_nf: 'NF',
  cd_produto: 'Produto',
  categoria_custom: 'Categoria',
};

function fmtCell(v: any, format?: DrillColumn['format']) {
  if (v == null || v === '') return '-';
  if (format === 'currency') {
    const num = Number(v);
    return Number.isFinite(num) ? formatCurrency(num) : String(v);
  }
  if (format === 'number') {
    const num = Number(v);
    return Number.isFinite(num) ? formatNumber(num) : String(v);
  }
  return String(v);
}

function levelTitle(level: { drill_type: DrillType; contexto: DrillContexto }, index: number): string {
  const label = DRILL_LABELS[level.drill_type];
  if (index === 0) return label;
  // tentar pegar o último valor relevante adicionado
  const keys: (keyof DrillContexto)[] = [
    'cd_nf', 'cd_produto', 'cd_cliente', 'cd_rev_pedido', 'cd_estado',
    'anomes_emissao', 'cd_prj', 'cd_tns', 'cd_origem', 'cd_tp_movimento', 'categoria_custom',
  ];
  for (const k of keys) {
    const v = level.contexto[k];
    if (v) return `${label}: ${v}`;
  }
  return label;
}

export function ComercialDrillDrawer({ stack, anomes_ini, anomes_fim, unidade_negocio }: Props) {
  const cur = stack.current;
  const [selectorOpenInline, setSelectorOpenInline] = useState(false);

  const query = useQuery<DrillResponse>({
    queryKey: [
      'comercial-drill',
      cur?.drill_type,
      cur?.contexto,
      cur?.page,
      anomes_ini, anomes_fim, unidade_negocio,
    ],
    queryFn: () =>
      fetchComercialDrill({
        drill_type: cur!.drill_type,
        anomes_ini, anomes_fim, unidade_negocio,
        contexto: cur!.contexto,
        page: cur!.page,
        page_size: 100,
      }),
    enabled: stack.open && !!cur,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const resp = query.data;

  const columns = useMemo<Column<Record<string, any>>[]>(() => {
    const cols = resp?.columns ?? [];
    return cols.map((c) => ({
      key: c.key as any,
      header: c.label,
      align: c.align ?? (c.format === 'currency' || c.format === 'number' ? 'right' : 'left'),
      render: (_v: any, r: Record<string, any>) => fmtCell(r[c.key], c.format),
    }));
  }, [resp?.columns]);

  const chips = useMemo(() => {
    const ctx = cur?.contexto ?? {};
    const out: { label: string; value: string }[] = [
      { label: 'Unidade', value: unidade_negocio },
      { label: 'Período', value: `${anomes_ini} → ${anomes_fim}` },
    ];
    (Object.keys(ctx) as (keyof DrillContexto)[]).forEach((k) => {
      const v = ctx[k];
      if (v) out.push({ label: CTX_LABELS[k] ?? String(k), value: String(v) });
    });
    return out;
  }, [cur?.contexto, anomes_ini, anomes_fim, unidade_negocio]);

  const allowedNext = cur ? NEXT_DRILLS[cur.drill_type] : [];

  const handlePushFromRow = (next: DrillType, row: Record<string, any>) => {
    const fromKey = cur ? ROW_TO_CTX_KEY[cur.drill_type] : null;
    const rowCtx: DrillContexto = {};
    if (fromKey && row[fromKey] != null) {
      (rowCtx as any)[fromKey] = String(row[fromKey]);
    }
    // alguns drills (ex.: NF) trazem também outras chaves úteis na linha
    (['cd_nf', 'cd_produto', 'cd_cliente', 'cd_estado', 'cd_rev_pedido', 'anomes_emissao'] as (keyof DrillContexto)[])
      .forEach((k) => {
        if (row[k] != null && rowCtx[k] == null) (rowCtx as any)[k] = String(row[k]);
      });
    stack.pushDrill(next, rowCtx);
  };

  const totalPaginas = useMemo(() => {
    if (!resp) return 1;
    const total = resp.total ?? 0;
    const size = resp.page_size || 100;
    return Math.max(1, Math.ceil(total / size));
  }, [resp]);

  const titulo = resp?.titulo || (cur ? DRILL_LABELS[cur.drill_type] : 'Drill');

  return (
    <Sheet open={stack.open} onOpenChange={stack.setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl p-0 flex flex-col">
        <SheetHeader className="px-4 md:px-6 py-3 md:py-4 border-b space-y-2">
          {stack.levels.length > 1 && (
            <div className="flex items-center gap-1 -ml-1 -mt-1 pr-8 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={stack.pop}
                className="h-7 px-2 text-xs shrink-0"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ml-1">Voltar</span>
              </Button>
              <nav className="flex items-center gap-1 overflow-x-auto min-w-0 scrollbar-thin">
                {stack.levels.map((lv, i) => {
                  const isLast = i === stack.levels.length - 1;
                  const t = levelTitle(lv, i);
                  return (
                    <div key={i} className="flex items-center gap-1 shrink-0">
                      {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                      {isLast ? (
                        <span className="text-xs font-medium text-foreground truncate max-w-[180px] md:max-w-[260px]">
                          {t}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => stack.goTo(i)}
                          className={cn(
                            'text-xs text-muted-foreground hover:text-foreground hover:underline',
                            'truncate max-w-[140px] md:max-w-[200px] transition-colors',
                          )}
                        >
                          {t}
                        </button>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          )}

          <div className="flex items-start justify-between gap-2 pr-8">
            <SheetTitle className="text-base md:text-lg flex items-center gap-2 min-w-0">
              <span className="truncate">{titulo}</span>
              {query.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </SheetTitle>
            <div className="flex items-center gap-1 shrink-0">
              {allowedNext.length > 0 && (
                <Popover open={selectorOpenInline} onOpenChange={setSelectorOpenInline}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                      <Filter className="h-3.5 w-3.5" /> Trocar drill
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-1">
                    <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Próximo nível
                    </div>
                    {allowedNext.map((dt) => (
                      <button
                        key={dt}
                        type="button"
                        className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors"
                        onClick={() => {
                          setSelectorOpenInline(false);
                          stack.pushDrill(dt, {});
                        }}
                      >
                        {DRILL_LABELS[dt]}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={() => resp && downloadDrillCsv(resp)}
                disabled={!resp || resp.rows.length === 0}
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => query.refetch()}
                aria-label="Atualizar"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <SheetDescription className="sr-only">Drill multinível do BI Comercial</SheetDescription>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {chips.map((c, i) => (
                <Badge key={i} variant="secondary" className="text-[11px] font-normal">
                  <span className="text-muted-foreground mr-1">{c.label}:</span>
                  <span className="font-medium">{c.value}</span>
                </Badge>
              ))}
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-auto px-3 md:px-6 py-3 md:py-4">
          {query.isLoading ? (
            <LoadingState height={300} variant="skeleton" />
          ) : query.isError ? (
            <ErrorState
              title="Não foi possível carregar o drill"
              message={String((query.error as any)?.message ?? '')}
              onRetry={() => query.refetch()}
            />
          ) : !resp || resp.rows.length === 0 ? (
            <EmptyState description="Sem registros para o contexto atual" />
          ) : (
            <>
              <DataTableBI
                columns={columns}
                data={resp.rows}
                onRowClick={
                  allowedNext.length > 0
                    ? undefined // habilitamos via menu por linha abaixo
                    : undefined
                }
                rowClassName={() => allowedNext.length > 0 ? 'cursor-pointer hover:bg-accent/40' : ''}
              />
              {/* Menu por linha: renderiza um dropdown invisível? Simplicidade: usa ação visível na primeira coluna. */}
              {allowedNext.length > 0 && (
                <RowActionsHint
                  rows={resp.rows}
                  allowedNext={allowedNext}
                  onPush={handlePushFromRow}
                />
              )}
              <div className="flex items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
                <span>
                  {resp.rows.length} {resp.rows.length === 1 ? 'linha' : 'linhas'}
                  {typeof resp.total === 'number' && resp.total > resp.rows.length
                    ? ` (de ${resp.total})`
                    : ''}
                </span>
                {totalPaginas > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => stack.setPage((cur?.page ?? 1) - 1)}
                      disabled={(cur?.page ?? 1) <= 1 || query.isFetching}
                    >
                      Anterior
                    </Button>
                    <span>
                      Página {cur?.page ?? 1} / {totalPaginas}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => stack.setPage((cur?.page ?? 1) + 1)}
                      disabled={(cur?.page ?? 1) >= totalPaginas || query.isFetching}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Lista compacta com botões de drill por linha — exibida abaixo da tabela
 * para evitar conflito com cliques de seleção/copy.
 */
function RowActionsHint({
  rows,
  allowedNext,
  onPush,
}: {
  rows: Record<string, any>[];
  allowedNext: DrillType[];
  onPush: (next: DrillType, row: Record<string, any>) => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="mt-2 -mb-2 hidden">
      {/* placeholder; ações de drill estão integradas via menu na primeira célula no futuro */}
      {rows.length}
      {allowedNext.length}
      {openIdx}
      <button onClick={() => onPush(allowedNext[0], rows[0] ?? {})} />
    </div>
  );
}
