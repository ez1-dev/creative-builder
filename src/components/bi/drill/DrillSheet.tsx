import { ReactNode, useCallback, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DrillSheetFilterChip {
  label: string;
  value: string | number;
}

export interface DrillLevel<TCtx = any> {
  title: string;
  subtitle?: string;
  chips?: DrillSheetFilterChip[];
  ctx: TCtx;
}

export interface DrillSheetState<TCtx = any> {
  open: boolean;
  /** view do nível ativo — mantido para retrocompatibilidade */
  title: string;
  subtitle?: string;
  chips: DrillSheetFilterChip[];
  ctx: TCtx | null;
}

interface InternalState<TCtx> {
  open: boolean;
  levels: DrillLevel<TCtx>[];
  restore?: () => void;
}

const INITIAL: InternalState<any> = { open: false, levels: [] };

export interface OpenOptions {
  /** callback chamado ao fechar totalmente a sheet (snapshot de filtros) */
  restore?: () => void;
}

export function useDrillSheet<TCtx = any>() {
  const [internal, setInternal] = useState<InternalState<TCtx>>(INITIAL as InternalState<TCtx>);

  const openWith = useCallback(
    (level: DrillLevel<TCtx>, opts?: OpenOptions) =>
      setInternal({ open: true, levels: [level], restore: opts?.restore }),
    [],
  );

  const push = useCallback(
    (level: DrillLevel<TCtx>) => setInternal((s) => ({ ...s, levels: [...s.levels, level] })),
    [],
  );

  const pop = useCallback(() => {
    setInternal((s) => {
      if (s.levels.length <= 1) {
        s.restore?.();
        return { open: false, levels: [], restore: undefined };
      }
      return { ...s, levels: s.levels.slice(0, -1) };
    });
  }, []);

  const goTo = useCallback((index: number) => {
    setInternal((s) => ({ ...s, levels: s.levels.slice(0, Math.max(1, index + 1)) }));
  }, []);

  const close = useCallback(() => {
    setInternal((s) => {
      s.restore?.();
      return { open: false, levels: [], restore: undefined };
    });
  }, []);

  const setOpen = useCallback(
    (o: boolean) => {
      if (o) setInternal((s) => ({ ...s, open: true }));
      else close();
    },
    [close],
  );

  const current = internal.levels[internal.levels.length - 1];

  const state: DrillSheetState<TCtx> = useMemo(
    () => ({
      open: internal.open,
      title: current?.title ?? '',
      subtitle: current?.subtitle,
      chips: current?.chips ?? [],
      ctx: (current?.ctx ?? null) as TCtx | null,
    }),
    [internal.open, current],
  );

  /** Props prontas para passar ao componente DrillSheet via spread. */
  const sheetProps = useMemo(
    () => ({
      open: internal.open,
      onOpenChange: setOpen,
      title: state.title,
      subtitle: state.subtitle,
      chips: state.chips,
      levels: internal.levels,
      onBack: pop,
      onCrumbClick: goTo,
    }),
    [internal.open, internal.levels, setOpen, state, pop, goTo],
  );

  return { state, levels: internal.levels, current, openWith, push, pop, goTo, close, setOpen, sheetProps };
}

export interface DrillSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  chips?: DrillSheetFilterChip[];
  children: ReactNode;
  /** Pilha de níveis para breadcrumb. Se omitido ou tamanho ≤ 1, nada é renderizado. */
  levels?: DrillLevel[];
  /** Handler do botão Voltar (remove o último nível). */
  onBack?: () => void;
  /** Handler ao clicar num crumb (índice do nível). */
  onCrumbClick?: (index: number) => void;
  maxWidth?: string;
}

export function DrillSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  chips = [],
  children,
  levels,
  onBack,
  onCrumbClick,
  maxWidth = 'sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl',
}: DrillSheetProps) {
  const showNav = !!levels && levels.length > 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={`w-full ${maxWidth} p-0 flex flex-col`}>
        <SheetHeader className="px-4 md:px-6 py-3 md:py-4 border-b space-y-2">
          {showNav && (
            <div className="flex items-center gap-1 -ml-1 -mt-1 pr-8 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="h-7 px-2 text-xs shrink-0"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ml-1">Voltar</span>
              </Button>
              <nav className="flex items-center gap-1 overflow-x-auto min-w-0 scrollbar-thin">
                {levels!.map((lv, i) => {
                  const isLast = i === levels!.length - 1;
                  return (
                    <div key={i} className="flex items-center gap-1 shrink-0">
                      {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                      {isLast ? (
                        <span className="text-xs font-medium text-foreground truncate max-w-[180px] md:max-w-[260px]">
                          {lv.title}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onCrumbClick?.(i)}
                          className={cn(
                            'text-xs text-muted-foreground hover:text-foreground hover:underline',
                            'truncate max-w-[140px] md:max-w-[200px] transition-colors',
                          )}
                        >
                          {lv.title}
                        </button>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          )}
          <SheetTitle className="text-base md:text-lg flex items-center gap-2 pr-8">
            {title}
          </SheetTitle>
          {subtitle && <SheetDescription className="text-xs">{subtitle}</SheetDescription>}
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
        <div className="flex-1 overflow-auto px-3 md:px-6 py-3 md:py-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
