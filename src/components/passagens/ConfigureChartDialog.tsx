/**
 * Diálogo simplificado para configurar um bloco de gráfico do dashboard
 * de Passagens Aéreas. Permite trocar tipo (registry de gráficos),
 * mapeamento de série e título customizado.
 *
 * Reutiliza o COMPONENT_REGISTRY e o schema da página Passagens
 * registrado em PAGE_REGISTRY.
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
import { usePageData } from '@/lib/bi/PageDataContext';
import { ChartColorPicker, DEFAULT_CHART_COLOR } from './ChartColorPicker';

const COLOR_AWARE_TYPES = new Set(['bar-chart', 'horizontal-bar-chart', 'line-chart', 'area-chart']);

export interface ConfigureChartValue {
  componentId: string;
  mapping: Record<string, string>;
  customTitle?: string;
  options?: Record<string, any>;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Configuração inicial — null se for um bloco canônico ainda sem override. */
  initial: Partial<ConfigureChartValue> | null;
  /** Tipo do bloco (chart-evolucao-mensal, custom-xxx etc.) — usado para texto. */
  blockType: string;
  /** Título "fallback" do bloco (canônico) para mostrar como placeholder. */
  fallbackTitle?: string;
  /** Se true, mostra botão "Voltar ao padrão" (apenas blocos canônicos). */
  canResetToDefault?: boolean;
  onApply: (next: ConfigureChartValue) => void;
  onResetToDefault?: () => void;
}

const CHART_COMPONENTS = COMPONENT_REGISTRY.filter((c) => c.kind === 'chart');

export function ConfigureChartDialog({
  open, onOpenChange, initial, blockType, fallbackTitle,
  canResetToDefault, onApply, onResetToDefault,
}: Props) {
  const ctx = usePageData();
  const page = getPage('passagens-aereas');

  const [componentId, setComponentId] = useState<string>(initial?.componentId ?? CHART_COMPONENTS[0]?.id ?? 'bar-chart');
  const [seriesKey, setSeriesKey] = useState<string>(initial?.mapping?.series ?? '');
  const [customTitle, setCustomTitle] = useState<string>(initial?.customTitle ?? '');
  const [topN, setTopN] = useState<string>(String(initial?.options?.topN ?? 10));

  const def = useMemo(() => getComponent(componentId), [componentId]);
  const seriesOptions = page?.schema.series ?? [];

  // Quando abre o diálogo, sincroniza estado com `initial`.
  useEffect(() => {
    if (!open) return;
    setComponentId(initial?.componentId ?? CHART_COMPONENTS[0]?.id ?? 'bar-chart');
    setSeriesKey(initial?.mapping?.series ?? seriesOptions[0]?.key ?? '');
    setCustomTitle(initial?.customTitle ?? '');
    setTopN(String(initial?.options?.topN ?? 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-preenche série quando troca de componente e a série atual ficou vazia
  useEffect(() => {
    if (!seriesKey && seriesOptions[0]) setSeriesKey(seriesOptions[0].key);
  }, [seriesKey, seriesOptions]);

  // Preview
  const previewNode = useMemo(() => {
    if (!def || !seriesKey || !ctx) return null;
    try {
      return def.render({
        title: customTitle || def.label,
        mapping: { series: seriesKey },
        ctx: { kpis: ctx.kpis, series: ctx.series, rows: ctx.rows },
        options: def.id === 'ranking-chart' ? { topN: Number(topN) || 10 } : {},
      });
    } catch (e) {
      return <div className="text-xs text-destructive">Erro no preview: {(e as Error).message}</div>;
    }
  }, [def, seriesKey, customTitle, topN, ctx]);

  const handleApply = () => {
    if (!def || !seriesKey) return;
    onApply({
      componentId: def.id,
      mapping: { series: seriesKey },
      customTitle: customTitle.trim() || undefined,
      options: def.id === 'ranking-chart' ? { topN: Number(topN) || 10 } : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Configurar gráfico</DialogTitle>
          <DialogDescription>
            {blockType.startsWith('custom-')
              ? 'Defina o tipo de visualização e a série de dados deste bloco.'
              : `Customize o bloco "${fallbackTitle ?? blockType}". Você pode voltar ao padrão a qualquer momento.`}
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
              <Label className="text-xs">Título (opcional)</Label>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={fallbackTitle ?? def?.label}
              />
            </div>
            {componentId === 'ranking-chart' && (
              <div>
                <Label className="text-xs">Top N</Label>
                <Input type="number" min={1} max={50} value={topN} onChange={(e) => setTopN(e.target.value)} />
              </div>
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

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {canResetToDefault && onResetToDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { onResetToDefault(); onOpenChange(false); }}
              >
                Voltar ao padrão
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleApply} disabled={!seriesKey}>Aplicar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
