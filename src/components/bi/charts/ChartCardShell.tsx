import { ReactNode, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Download } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LoadingState } from '../states/LoadingState';
import { ErrorState } from '../states/ErrorState';
import { NoDataState } from '../states/NoDataState';
import {
  type VisualConfig,
  type DescriptionVars,
  mergeVisualConfig,
  interpolateDescription,
  densitySpacing,
  fontFamilyCss,
} from '@/lib/bi/visualConfig';
import { cn } from '@/lib/utils';

export interface ChartCardShellProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  count?: string;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  height?: number;
  expandable?: boolean;
  exportable?: boolean;
  onExportData?: () => void;
  children: ReactNode;
  /** Opcional — quando ausente, o card renderiza como antes (compat). */
  visualConfig?: Partial<VisualConfig>;
  /** Variáveis para interpolar em resultDescription. */
  descriptionVars?: DescriptionVars;
}

const ALIGN_CLASS: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
};

export function ChartCardShell({
  title, subtitle, icon, count, loading, error, isEmpty, height = 280,
  expandable = true, exportable = false, onExportData, children,
  visualConfig, descriptionVars,
}: ChartCardShellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const vc = useMemo(() => mergeVisualConfig(visualConfig), [visualConfig]);
  const { heightDelta } = densitySpacing(vc.card.density);
  const effHeight = Math.max(120, height + heightDelta);

  const displayTitle = vc.title.text?.trim() || title;
  const displaySubtitle = vc.subtitle.text?.trim() || subtitle || '';

  const descText = vc.resultDescription.visible && vc.resultDescription.text
    ? interpolateDescription(vc.resultDescription.text, descriptionVars ?? {})
    : '';

  const descNode = descText ? (
    <p
      className={cn('text-muted-foreground', vc.card.density === 'compacta' ? 'px-2' : 'px-1')}
      style={{ fontSize: vc.resultDescription.fontSize }}
    >
      {descText}
    </p>
  ) : null;

  const body = loading
    ? <LoadingState height={effHeight} variant="skeleton" />
    : error
    ? <ErrorState message={error} height={effHeight} />
    : isEmpty
    ? <NoDataState height={effHeight} />
    : <div ref={containerRef} style={{ minHeight: effHeight }}>{children}</div>;

  const aboveDesc  = vc.resultDescription.position === 'above'        ? descNode : null;
  const beforeLeg  = vc.resultDescription.position === 'beforeLegend' ? descNode : null;
  const afterChart = vc.resultDescription.position === 'afterChart'   ? descNode : null;
  const belowDesc  = vc.resultDescription.position === 'below'        ? descNode : null;

  return (
    <>
      <Card className={cn('transition-shadow hover:shadow-md', !vc.card.showBorder && 'border-transparent shadow-none')}>
        {vc.card.showHeader && (
          <CardHeader className={cn('flex flex-row items-start justify-between space-y-0 pb-2',
            vc.card.density === 'compacta' && 'py-2',
            vc.card.density === 'detalhada' && 'py-4',
          )}>
            <div className={cn('flex flex-col gap-0.5 flex-1', ALIGN_CLASS[vc.title.align])}>
              {vc.title.visible && (
                <CardTitle
                  className="flex items-center gap-2 font-semibold"
                  style={{ fontSize: vc.title.fontSize }}
                >
                  {icon && <span className="text-muted-foreground">{icon}</span>}
                  {displayTitle}
                </CardTitle>
              )}
              {vc.subtitle.visible && displaySubtitle && (
                <p className="text-muted-foreground" style={{ fontSize: vc.subtitle.fontSize }}>
                  {displaySubtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {count && <span className="text-xs text-muted-foreground">{count}</span>}
              {exportable && onExportData && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onExportData} title="Exportar dados">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
              {expandable && !loading && !error && !isEmpty && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(true)} title="Expandir">
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>
        )}
        <CardContent className={cn(
          vc.card.density === 'compacta' && 'p-2',
          vc.card.density === 'detalhada' && 'p-6',
        )}>
          {aboveDesc}
          {beforeLeg}
          {body}
          {afterChart}
          {belowDesc}
        </CardContent>
      </Card>
      {expandable && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-5xl">
            <div className="space-y-2">
              <div className="text-base font-semibold">{displayTitle}</div>
              {displaySubtitle && <p className="text-xs text-muted-foreground">{displaySubtitle}</p>}
              <div style={{ minHeight: 480 }}>{children}</div>
              {descText && <p className="text-xs text-muted-foreground">{descText}</p>}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
