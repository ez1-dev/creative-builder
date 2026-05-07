import { ReactNode, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Download } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LoadingState } from '../states/LoadingState';
import { ErrorState } from '../states/ErrorState';
import { NoDataState } from '../states/NoDataState';

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
}

export function ChartCardShell({
  title, subtitle, icon, count, loading, error, isEmpty, height = 280,
  expandable = true, exportable = false, onExportData, children,
}: ChartCardShellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const body = loading
    ? <LoadingState height={height} variant="skeleton" />
    : error
    ? <ErrorState message={error} height={height} />
    : isEmpty
    ? <NoDataState height={height} />
    : <div ref={containerRef} style={{ minHeight: height }}>{children}</div>;

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-0.5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              {icon && <span className="text-muted-foreground">{icon}</span>}
              {title}
            </CardTitle>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
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
        <CardContent>{body}</CardContent>
      </Card>
      {expandable && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-5xl">
            <div className="space-y-2">
              <div className="text-base font-semibold">{title}</div>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              <div style={{ minHeight: 480 }}>{children}</div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
