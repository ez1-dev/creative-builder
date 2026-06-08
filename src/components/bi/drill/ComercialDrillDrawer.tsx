import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Download, Filter, Loader2, RotateCw, X } from 'lucide-react';

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
  DataTableBI, LoadingState, ErrorState,
  formatCurrency, formatNumber, type Column,
} from '@/components/bi';
import { cn } from '@/lib/utils';

import {
  fetchComercialDrill, downloadDrillCsv,
  type DrillColumn, type DrillContexto, type DrillResponse, type DrillType,
} from '@/lib/bi/comercialDrillApi';
import { DRILL_LABELS, NEXT_DRILLS, ROW_TO_CTX_KEY, CTX_LABELS } from '@/lib/bi/comercialDrillCatalog';
import { cleanDrillValue, compactDrillContext } from '@/lib/bi/comercialDrillContract';
import type { ComercialDrillStack } from '@/hooks/useComercialDrillStack';
import { DrillEmptyDiagnostico } from './DrillEmptyDiagnostico';

interface Props {
  stack: ComercialDrillStack;
  anomes_ini: string;
  anomes_fim: string;
  unidade_negocio: 'GENIUS' | 'ESTRUTURAL ZORTEA' | 'CONSOLIDADO';
}

const CURRENCY_KEYS = new Set([
  'faturamento', 'fat_liquido', 'faturamento_liquido', 'valor_liquido',
  'impostos', 'imposto', 'valor_imposto',
  'devolucao', 'valor_devolucao',
  'ticket_medio', 'preco_medio', 'meta', 'diferenca',
  'valor', 'valor_total', 'valor_nf', 'vl_nf', 'vl_total',
  'icms', 'pis', 'cofins', 'ipi', 'iss', 'st', 'difal', 'fcp',
]);
const NUMBER_KEYS = new Set([
  'quantidade', 'qtd', 'qt', 'numero_vendas', 'numero_clientes', 'numero_estados',
]);

const CURRENCY_PREFIXES = ['vl_', 'valor_', 'vlr_', 'total_', 'base_'];
const CURRENCY_SUBSTRINGS = [
  'imposto', 'icms', 'pis', 'cofins', 'ipi', 'iss', 'difal', 'fcp',
  'csll', 'irpj', 'inss', 'iof', 'st_', '_st',
  'base_calculo', 'base_icms',
  'vl_bruto', 'vl_liquido', 'vl_nf', 'vl_total',
  'frete', 'seguro', 'desconto', 'acrescimo', 'outros',
];
const NUMBER_PREFIXES = ['qtd_', 'qt_', 'num_', 'numero_'];
const PERCENT_KEYS = new Set(['aliquota', 'pct_atingimento']);
const PERCENT_PREFIXES = ['pct_', 'aliq_', 'perc_'];
const PERCENT_SUFFIXES = ['_pct', '_perc', '_percent'];

type InferredFormat = DrillColumn['format'] | 'percent';

function inferFormat(key: string, format?: DrillColumn['format']): InferredFormat | undefined {
  if (format) return format;
  const k = (key || '').toLowerCase();
  if (!k) return undefined;
  if (PERCENT_KEYS.has(k)) return 'percent';
  if (PERCENT_PREFIXES.some((p) => k.startsWith(p))) return 'percent';
  if (PERCENT_SUFFIXES.some((s) => k.endsWith(s))) return 'percent';
  if (CURRENCY_KEYS.has(k)) return 'currency';
  if (CURRENCY_PREFIXES.some((p) => k.startsWith(p))) return 'currency';
  if (CURRENCY_SUBSTRINGS.some((s) => k.includes(s))) return 'currency';
  if (NUMBER_KEYS.has(k)) return 'number';
  if (NUMBER_PREFIXES.some((p) => k.startsWith(p))) return 'number';
  return undefined;
}

function fmtCell(v: any, format?: DrillColumn['format'], key?: string) {
  if (v == null || v === '') return '-';
  const f = inferFormat(key ?? '', format);
  if (f === 'currency') {
    const num = Number(v);
    return Number.isFinite(num) ? formatCurrency(num) : String(v);
  }
  if (f === 'percent') {
    const num = Number(v);
    if (!Number.isFinite(num)) return String(v);
    return `${formatNumber(num, 2)}%`;
  }
  if (f === 'number') {
    const num = Number(v);
    return Number.isFinite(num) ? formatNumber(num) : String(v);
  }
  return String(v);
}

function levelTitle(
  level: { drill_type: DrillType; contexto: DrillContexto; addedFilter?: { key: keyof DrillContexto; value: string } },
  index: number,
  isLast: boolean,
): string {
  const drillLabel = DRILL_LABELS[level.drill_type];
  if (index === 0) return drillLabel;
  // Para o último nível (atual), exibir apenas o nome do drill (sem valor).
  if (isLast) return drillLabel;
  // Para níveis intermediários, exibir o filtro que foi adicionado naquele push.
  const added = level.addedFilter;
  if (added) {
    const keyLabel = CTX_LABELS[added.key] ?? String(added.key);
    return `${keyLabel}: ${added.value}`;
  }
  return drillLabel;
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

  const allowedNext = cur ? NEXT_DRILLS[cur.drill_type] : [];

  const handlePushFromRow = (next: DrillType, row: Record<string, any>) => {
    // Prioridade: usar filtros_drill que o backend devolve por linha (sempre vence).
    // Sem isso, cair no fallback da chave técnica agrupadora do drill atual.
    // NUNCA usar row.label como filtro técnico.
    let rowFilters: DrillContexto = {};
    const fromBackend = row?.filtros_drill as Partial<DrillContexto> | undefined;
    if (fromBackend && typeof fromBackend === 'object') {
      rowFilters = compactDrillContext(fromBackend as DrillContexto);
    } else if (cur) {
      const fromKey = ROW_TO_CTX_KEY[cur.drill_type];
      if (fromKey) {
        const v = cleanDrillValue(row[fromKey]);
        if (v != null) (rowFilters as any)[fromKey] = v;
      }
    }
    stack.pushDrill(next, rowFilters);
  };

  const displayColumns = useMemo(() => {
    const cols = resp?.columns ?? [];
    let out = cols;
    // CLIENTE: injeta nm_cliente após cd_cliente se backend não devolveu.
    if (cur?.drill_type === 'CLIENTE' && !out.some((c) => c.key === 'nm_cliente')) {
      const idx = out.findIndex((c) => c.key === 'cd_cliente');
      if (idx >= 0) {
        const nameCol = { key: 'nm_cliente', label: 'Nome do Cliente', align: 'left' as const, format: 'text' as any };
        out = [...out.slice(0, idx + 1), nameCol, ...out.slice(idx + 1)];
      }
    }
    // PRODUTO/NOTA_FISCAL/DETALHES_IMPOSTOS: injeta ds_produto após cd_produto.
    if (out.some((c) => c.key === 'cd_produto') && !out.some((c) => c.key === 'ds_produto' || c.key === 'nm_produto')) {
      const idx = out.findIndex((c) => c.key === 'cd_produto');
      if (idx >= 0) {
        const descCol = { key: 'ds_produto', label: 'Descrição do Produto', align: 'left' as const, format: 'text' as any };
        out = [...out.slice(0, idx + 1), descCol, ...out.slice(idx + 1)];
      }
    }
    return out;
  }, [resp?.columns, cur?.drill_type]);


  const columns = useMemo<Column<Record<string, any>>[]>(() => {
    const base: Column<Record<string, any>>[] = displayColumns.map((c) => ({
      key: c.key as any,
      header: c.label,
      align: c.align ?? (inferFormat(c.key, c.format) === 'currency' || inferFormat(c.key, c.format) === 'number' ? 'right' : 'left'),
      render: (_v: any, r: Record<string, any>) => {
        if (c.key === 'nm_cliente') return r.nm_cliente ?? '—';
        if (c.key === 'ds_produto') return r.ds_produto ?? r.nm_produto ?? '—';
        return fmtCell(r[c.key], c.format, c.key);
      },

    }));
    if (allowedNext.length > 0) {
      base.push({
        key: '__drill_actions__' as any,
        header: '',
        align: 'right',
        render: (_v: any, r: Record<string, any>) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                Detalhar <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-[11px]">Próximo nível</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allowedNext.map((dt) => (
                <DropdownMenuItem
                  key={dt}
                  onSelect={(e) => {
                    e.preventDefault();
                    handlePushFromRow(dt, r);
                  }}
                >
                  {DRILL_LABELS[dt]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      });
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayColumns, allowedNext]);


  const chips = useMemo(() => {
    const ctx = cur?.contexto ?? {};
    const out: { label: string; value: string; removeKey?: keyof DrillContexto }[] = [
      { label: 'Unidade', value: unidade_negocio },
      { label: 'Período', value: `${anomes_ini} → ${anomes_fim}` },
    ];
    (Object.keys(ctx) as (keyof DrillContexto)[]).forEach((k) => {
      const v = cleanDrillValue(ctx[k]);
      if (v) out.push({ label: CTX_LABELS[k] ?? String(k), value: v, removeKey: k });
    });
    return out;
  }, [cur?.contexto, anomes_ini, anomes_fim, unidade_negocio]);


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
                  const t = levelTitle(lv, i, isLast);
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
                          // Trocar drill: NÃO adiciona filtro novo; mantém só o que for compatível.
                          stack.pushDrill(dt, {}, { mergeWithCurrent: true });
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
                onClick={() => resp && downloadDrillCsv({ ...resp, columns: displayColumns })}
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
                <Badge key={i} variant="secondary" className="text-[11px] font-normal gap-1">
                  <span className="text-muted-foreground">{c.label}:</span>
                  <span className="font-medium">{c.value}</span>
                  {c.removeKey && (
                    <button
                      type="button"
                      onClick={() => stack.removeContextKey(c.removeKey!)}
                      className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm hover:bg-background/60"
                      aria-label={`Remover ${c.label}`}
                      title={`Remover ${c.label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
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
            <DrillEmptyDiagnostico stack={stack} response={resp} />
          ) : (
            <>
              <DataTableBI columns={columns} data={resp.rows} />

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

