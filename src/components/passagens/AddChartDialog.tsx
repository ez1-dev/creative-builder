/**
 * Diálogo para adicionar um novo gráfico customizado ao dashboard de
 * Passagens Aéreas. O usuário escolhe o tipo (registry de gráficos) e a
 * série de dados; um id `custom-<timestamp>` é gerado.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { COMPONENT_REGISTRY, getComponent } from '@/lib/bi/componentRegistry';
import { getPage } from '@/lib/bi/pageRegistry';
import { ChartColorPicker, DEFAULT_CHART_COLOR } from './ChartColorPicker';

const CHART_COMPONENTS = COMPONENT_REGISTRY.filter((c) => c.kind === 'chart');
const COLOR_AWARE_TYPES = new Set(['bar-chart', 'horizontal-bar-chart', 'line-chart', 'area-chart']);

export interface NewChartValue {
  type: string; // custom-<timestamp>
  title: string;
  componentId: string;
  mapping: Record<string, string>;
  options?: Record<string, any>;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (value: NewChartValue) => void;
}

export function AddChartDialog({ open, onOpenChange, onAdd }: Props) {
  const ctx = usePageData();
  const page = getPage('passagens-aereas');
  const seriesOptions = page?.schema.series ?? [];

  const [componentId, setComponentId] = useState<string>('bar-chart');
  const [seriesKey, setSeriesKey] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [topN, setTopN] = useState<string>('10');
  const [color, setColor] = useState<string>(DEFAULT_CHART_COLOR);

  useEffect(() => {
    if (!open) return;
    setComponentId('bar-chart');
    setSeriesKey(seriesOptions[0]?.key ?? '');
    setTitle('');
    setTopN('10');
    setColor(DEFAULT_CHART_COLOR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const def = useMemo(() => getComponent(componentId), [componentId]);
  const supportsColor = COLOR_AWARE_TYPES.has(componentId);

  const previewNode = useMemo(() => {
    if (!def || !seriesKey || !ctx) return null;
    try {
      const options: Record<string, any> = {};
      if (def.id === 'ranking-chart') options.topN = Number(topN) || 10;
      if (supportsColor && color && color !== DEFAULT_CHART_COLOR) options.color = color;
      return def.render({
        title: title || def.label,
        mapping: { series: seriesKey },
        ctx: { kpis: ctx.kpis, series: ctx.series, rows: ctx.rows },
        options,
      });
    } catch (e) {
      return <div className="text-xs text-destructive">Erro: {(e as Error).message}</div>;
    }
  }, [def, seriesKey, title, topN, ctx, color, supportsColor]);

  const handleAdd = () => {
    if (!def || !seriesKey) return;
    const finalTitle = title.trim() || def.label;
    const options: Record<string, any> = {};
    if (def.id === 'ranking-chart') options.topN = Number(topN) || 10;
    if (supportsColor && color && color !== DEFAULT_CHART_COLOR) options.color = color;
    onAdd({
      type: `custom-${Date.now()}`,
      title: finalTitle,
      componentId: def.id,
      mapping: { series: seriesKey },
      options: Object.keys(options).length > 0 ? options : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Adicionar novo gráfico</DialogTitle>
          <DialogDescription>
            Escolha o tipo de visualização e a série de dados disponível na página.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tipo de visualização</Label>
              <Select value={componentId} onValueChange={setComponentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CHART_COMPONENTS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Série / dados</Label>
              <Select value={seriesKey} onValueChange={setSeriesKey}>
                <SelectTrigger><SelectValue placeholder="Escolha uma série" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {seriesOptions.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={def?.label}
              />
            </div>
            {componentId === 'ranking-chart' && (
              <div>
                <Label className="text-xs">Top N</Label>
                <Input type="number" min={1} max={50} value={topN} onChange={(e) => setTopN(e.target.value)} />
              </div>
            )}
            {supportsColor && (
              <ChartColorPicker value={color} onChange={setColor} />
            )}
          </div>

          <div className="rounded-md border bg-muted/30 p-3 min-h-[260px]">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Pré-visualização</div>
            {previewNode ?? (
              <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
                Selecione tipo e série para visualizar.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAdd} disabled={!seriesKey}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
