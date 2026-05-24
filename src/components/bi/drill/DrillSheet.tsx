import { ReactNode, useCallback, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export interface DrillSheetFilterChip {
  label: string;
  value: string | number;
}

export interface DrillSheetState<TCtx = any> {
  open: boolean;
  title: string;
  subtitle?: string;
  chips: DrillSheetFilterChip[];
  ctx: TCtx | null;
}

const INITIAL: DrillSheetState = { open: false, title: '', chips: [], ctx: null };

export function useDrillSheet<TCtx = any>() {
  const [state, setState] = useState<DrillSheetState<TCtx>>(INITIAL as DrillSheetState<TCtx>);

  const openWith = useCallback(
    (payload: Omit<DrillSheetState<TCtx>, 'open'>) => setState({ ...payload, open: true }),
    [],
  );
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  return { state, openWith, close, setOpen: (o: boolean) => setState((s) => ({ ...s, open: o })) };
}

export interface DrillSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  chips?: DrillSheetFilterChip[];
  children: ReactNode;
  /** Largura máxima do painel. Padrão xl:max-w-5xl */
  maxWidth?: string;
}

export function DrillSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  chips = [],
  children,
  maxWidth = 'sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl',
}: DrillSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`w-full ${maxWidth} p-0 flex flex-col`}
      >
        <SheetHeader className="px-4 md:px-6 py-3 md:py-4 border-b space-y-2">
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
        <div className="flex-1 overflow-auto px-3 md:px-6 py-3 md:py-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
