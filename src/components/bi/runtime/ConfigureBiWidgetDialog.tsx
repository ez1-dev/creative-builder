/**
 * Diálogo unificado para configurar um widget do BI Comercial.
 *
 * Modos:
 *  - widget canônico (KPI, gráfico, tabela): pode trocar variante built-in
 *    OU substituir por um componente da Biblioteca BI compatível.
 *  - widget custom (custom-*): sempre Biblioteca BI.
 */
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { COMPONENT_REGISTRY, getComponent } from '@/lib/bi/componentRegistry';
import { getPage } from '@/lib/bi/pageRegistry';
import type { ComercialWidgetDef } from '@/lib/bi/comercialWidgetCatalog';
import type { MetricRef, CustomMetric } from '@/lib/bi/comercialMetrics';
import { SeriesEditor } from './SeriesEditor';
import { TITLE_COLOR_PRESETS, type WidgetTitleColorPreset } from './WidgetTitleStyle';
import { ChartColorPicker, DEFAULT_CHART_COLOR } from '@/components/passagens/ChartColorPicker';
import { VisualConfigEditor } from '@/components/bi/visual/VisualConfigEditor';
import { DEFAULT_VISUAL_CONFIG, mergeVisualConfig, type VisualConfig } from '@/lib/bi/visualConfig';
import { HeatPaletteEditor } from '@/components/bi/maps/HeatPaletteEditor';
import { HEAT_COLOR_STOPS } from '@/lib/bi/mapUtils';

const COLOR_AWARE_LIB_IDS = new Set(['bar-chart', 'horizontal-bar-chart', 'line-chart', 'area-chart']);
const HEAT_MAP_LIB_IDS = new Set(['brazil-heat-map', 'brazil-heat-map-comercial']);

function stopsEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v.toLowerCase() === b[i]?.toLowerCase());
}

export interface ConfigureValue {
  variant?: string | null;
  componentId?: string | null;
  mapping?: Record<string, string> | null;
  options?: Record<string, any> | null;
  customTitle?: string | null;
  series?: MetricRef[] | null;
  titleColor?: string | null;
  titleBold?: boolean | null;
  valueColor?: string | null;
}


interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Definição do widget (catálogo). Quando null/undefined, é um widget custom. */
  def?: ComercialWidgetDef;
  initial: ConfigureValue & { variant?: string; componentId?: string; series?: MetricRef[] };
  blockType: string;
  fallbackTitle?: string;
  onApply: (next: ConfigureValue) => void;
  onResetToDefault?: () => void;
  kpis?: Record<string, any>;
  series?: Record<string, any>;
  rows?: any[];
  customMetrics?: CustomMetric[];
  onCreateCustomMetric?: (m: CustomMetric) => void;
}

export function ConfigureBiWidgetDialog({
  open, onOpenChange, def, initial, blockType, fallbackTitle,
  onApply, onResetToDefault, kpis, series, rows,
  customMetrics = [], onCreateCustomMetric,
}: Props) {
  const uid = useId();
  const idVariant = `${uid}-variant`;
  const idBuiltinTitle = `${uid}-builtin-title`;
  const idLibComponent = `${uid}-lib-component`;
  const idLibSeries = `${uid}-lib-series`;
  const idLibKpi = `${uid}-lib-kpi`;
  const idLibTitle = `${uid}-lib-title`;
  const page = getPage('bi-comercial');
  const isCustom = blockType.startsWith('custom-');
  const compatibleLibIds = def?.libraryComponentIds ?? COMPONENT_REGISTRY.map((c) => c.id);
  const libDefs = COMPONENT_REGISTRY.filter((c) => compatibleLibIds.includes(c.id));

  const startsAsLibrary = !!initial.componentId || isCustom;
  const [mode, setMode] = useState<'builtin' | 'library'>(startsAsLibrary ? 'library' : 'builtin');
  const [activeTab, setActiveTab] = useState<'builtin' | 'library' | 'series'>(startsAsLibrary ? 'library' : 'builtin');
  const [variant, setVariant] = useState<string>(initial.variant ?? def?.variants[0]?.value ?? '');
  const [componentId, setComponentId] = useState<string>(initial.componentId ?? libDefs[0]?.id ?? '');
  const [seriesKey, setSeriesKey] = useState<string>(initial.mapping?.series ?? '');
  const [valueKey, setValueKey] = useState<string>(initial.mapping?.value ?? def?.kpiKey ?? '');
  const [customTitle, setCustomTitle] = useState<string>(initial.customTitle ?? '');
  const [seriesList, setSeriesList] = useState<MetricRef[]>(initial.series ?? []);
  const [titleColor, setTitleColor] = useState<string>(initial.titleColor ?? 'default');
  const [titleBold, setTitleBold] = useState<boolean>(Boolean(initial.titleBold));
  const [valueColor, setValueColor] = useState<string>(initial.valueColor ?? 'default');
  const [chartColor, setChartColor] = useState<string>(initial.options?.color ?? DEFAULT_CHART_COLOR);
  const [visual, setVisual] = useState<VisualConfig>(mergeVisualConfig(initial.options?.visual));
  const [colorStops, setColorStops] = useState<string[]>(
    Array.isArray(initial.options?.colorStops) && initial.options!.colorStops.length >= 2
      ? initial.options!.colorStops
      : HEAT_COLOR_STOPS,
  );


  // Multi-séries só faz sentido em gráficos de série (não em KPI/tabela/mapa)
  const supportsSeries = !isCustom && def && (def.kind === 'serie-mensal' || def.kind === 'serie' || def.kind === 'ranking' || def.kind === 'map');

  useEffect(() => {
    if (!open) return;
    const lib = startsAsLibrary ? 'library' : 'builtin';
    setMode(lib);
    setActiveTab(lib);
    setVariant(initial.variant ?? def?.variants[0]?.value ?? '');
    setComponentId(initial.componentId ?? libDefs[0]?.id ?? '');
    setSeriesKey(initial.mapping?.series ?? '');
    setValueKey(initial.mapping?.value ?? def?.kpiKey ?? '');
    setCustomTitle(initial.customTitle ?? '');
    setSeriesList(initial.series ?? []);
    setTitleColor(initial.titleColor ?? 'default');
    setTitleBold(Boolean(initial.titleBold));
    setValueColor(initial.valueColor ?? 'default');
    setChartColor(initial.options?.color ?? DEFAULT_CHART_COLOR);
    setVisual(mergeVisualConfig(initial.options?.visual));
    setColorStops(
      Array.isArray(initial.options?.colorStops) && initial.options!.colorStops.length >= 2
        ? initial.options!.colorStops
        : HEAT_COLOR_STOPS,
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const libDef = useMemo(() => getComponent(componentId), [componentId]);
  const seriesOptions = page?.schema.series ?? [];
  const kpiOptions = page?.schema.kpis ?? [];
  const inputs = libDef?.inputs ?? [];

  const supportsChartColor = !!libDef && COLOR_AWARE_LIB_IDS.has(libDef.id);
  const supportsHeatPalette = !!libDef && HEAT_MAP_LIB_IDS.has(libDef.id);

  const buildLibraryOptions = useCallback(() => {
    const opts: Record<string, any> = {};
    if (supportsChartColor && chartColor && chartColor !== DEFAULT_CHART_COLOR) opts.color = chartColor;
    if (JSON.stringify(visual) !== JSON.stringify(DEFAULT_VISUAL_CONFIG)) opts.visual = visual;
    if (supportsHeatPalette && !stopsEqual(colorStops, HEAT_COLOR_STOPS)) opts.colorStops = colorStops;
    return opts;
  }, [supportsChartColor, chartColor, visual, supportsHeatPalette, colorStops]);

  const previewNode = useMemo(() => {
    if (mode !== 'library' || !libDef) return null;
    try {
      const mapping: Record<string, string> = {};
      inputs.forEach((inp) => {
        if (inp.source === 'series') mapping[inp.key] = seriesKey || seriesOptions[0]?.key || '';
        else if (inp.source === 'kpis') mapping[inp.key] = valueKey || kpiOptions[0]?.key || '';
        else mapping[inp.key] = 'dados';
      });
      return libDef.render({
        title: customTitle || libDef.label,
        mapping,
        ctx: { kpis: kpis ?? {}, series: series ?? {}, rows: rows ?? [] },
        options: buildLibraryOptions(),
      });
    } catch (e) {
      return <div className="text-xs text-destructive">Erro: {(e as Error).message}</div>;
    }
  }, [mode, libDef, inputs, seriesKey, valueKey, customTitle, kpis, series, rows, seriesOptions, kpiOptions, buildLibraryOptions]);

  const handleApply = () => {
    const titleStyle = {
      titleColor: titleColor && titleColor !== 'default' ? titleColor : null,
      titleBold: titleBold ? true : null,
      valueColor: valueColor && valueColor !== 'default' ? valueColor : null,
    };

    const visualOptions = buildLibraryOptions();

    if (mode === 'builtin') {
      onApply({
        variant,
        componentId: null,
        mapping: null,
        options: Object.keys(visualOptions).length > 0 ? visualOptions : null,
        customTitle: customTitle.trim() || null,
        series: supportsSeries ? (seriesList.length ? seriesList : null) : undefined,
        ...titleStyle,
      });
    } else {
      const mapping: Record<string, string> = {};
      inputs.forEach((inp) => {
        if (inp.source === 'series') mapping[inp.key] = seriesKey || seriesOptions[0]?.key || '';
        else if (inp.source === 'kpis') mapping[inp.key] = valueKey || kpiOptions[0]?.key || '';
        else mapping[inp.key] = 'dados';
      });
      onApply({
        variant: null,
        componentId,
        mapping,
        options: Object.keys(visualOptions).length > 0 ? visualOptions : null,
        customTitle: customTitle.trim() || null,
        series: supportsSeries ? (seriesList.length ? seriesList : null) : undefined,
        ...titleStyle,
      });
    }
    onOpenChange(false);
  };

  const titleAppearanceSection = (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <div className="text-xs font-semibold text-muted-foreground">Aparência do título</div>
      <div className="space-y-1.5">
        <Label className="text-xs">Cor da fonte</Label>
        <div className="flex flex-wrap gap-1.5">
          {TITLE_COLOR_PRESETS.map((p) => {
            const active = (titleColor || 'default') === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setTitleColor(p.key)}
                aria-label={p.label}
                title={p.label}
                className={cn(
                  'h-7 w-7 rounded-full border-2 transition-all',
                  active ? 'border-foreground ring-2 ring-ring/40' : 'border-border hover:border-foreground/50',
                )}
                style={{ background: p.swatch }}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Label className="text-[11px] text-muted-foreground shrink-0">Custom (hex):</Label>
          <Input
            type="text"
            value={titleColor.startsWith('#') ? titleColor : ''}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (!v) setTitleColor('default');
              else setTitleColor(v.startsWith('#') ? v : `#${v}`);
            }}
            placeholder="#1f6feb"
            className="h-7 text-xs max-w-[140px]"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor={`${uid}-bold`} className="text-xs cursor-pointer">
          Título em negrito
        </Label>
        <Switch id={`${uid}-bold`} checked={titleBold} onCheckedChange={setTitleBold} />
      </div>
      <div className="space-y-1.5 pt-2 border-t">
        <Label className="text-xs">Cor do resultado</Label>
        <div className="flex flex-wrap gap-1.5">
          {TITLE_COLOR_PRESETS.map((p) => {
            const active = (valueColor || 'default') === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setValueColor(p.key)}
                aria-label={p.label}
                title={p.label}
                className={cn(
                  'h-7 w-7 rounded-full border-2 transition-all',
                  active ? 'border-foreground ring-2 ring-ring/40' : 'border-border hover:border-foreground/50',
                )}
                style={{ background: p.swatch }}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Label className="text-[11px] text-muted-foreground shrink-0">Custom (hex):</Label>
          <Input
            type="text"
            value={valueColor.startsWith('#') ? valueColor : ''}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (!v) setValueColor('default');
              else setValueColor(v.startsWith('#') ? v : `#${v}`);
            }}
            placeholder="#1f6feb"
            className="h-7 text-xs max-w-[140px]"
          />
        </div>
      </div>
    </div>
  );


  const variants = def?.variants ?? [];
  const hasBuiltin = !isCustom && variants.length > 0;
  const tabsCls = hasBuiltin && supportsSeries ? 'grid w-full grid-cols-3' : (hasBuiltin || supportsSeries ? 'grid w-full grid-cols-2' : 'grid w-full grid-cols-1');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar bloco</DialogTitle>
          <DialogDescription>
            {isCustom
              ? 'Edite o componente da Biblioteca BI aplicado.'
              : `Customize "${fallbackTitle ?? blockType}" — escolha variante padrão ou substitua por componente da Biblioteca BI.`}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as any);
            if (v === 'builtin' || v === 'library') setMode(v);
          }}
        >
          <TabsList className={tabsCls}>
            {hasBuiltin && <TabsTrigger value="builtin">Variante padrão</TabsTrigger>}
            <TabsTrigger value="library">Biblioteca BI</TabsTrigger>
            {supportsSeries && <TabsTrigger value="series">Séries</TabsTrigger>}
          </TabsList>

          {hasBuiltin && (
            <TabsContent value="builtin" className="space-y-3 pt-3">
              <div>
                <Label htmlFor={idVariant} className="text-xs">Visualização</Label>
                <Select value={variant} onValueChange={setVariant}>
                  <SelectTrigger id={idVariant} name="variant" aria-label="Visualização"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {variants.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor={idBuiltinTitle} className="text-xs">Título (opcional)</Label>
                <Input id={idBuiltinTitle} name="builtin-title" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder={fallbackTitle ?? def?.title} />
              </div>
              {titleAppearanceSection}
            </TabsContent>
          )}

          <TabsContent value="library" className="pt-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label htmlFor={idLibComponent} className="text-xs">Componente</Label>
                  <Select value={componentId} onValueChange={setComponentId}>
                    <SelectTrigger id={idLibComponent} name="library-component" aria-label="Componente"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {libDefs.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {inputs.some((i) => i.source === 'series') && (
                  <div>
                    <Label htmlFor={idLibSeries} className="text-xs">Série</Label>
                    <Select value={seriesKey} onValueChange={setSeriesKey}>
                      <SelectTrigger id={idLibSeries} name="library-series" aria-label="Série"><SelectValue placeholder="Escolha" /></SelectTrigger>
                      <SelectContent>
                        {seriesOptions.map((s) => (
                          <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {inputs.some((i) => i.source === 'kpis') && (
                  <div>
                    <Label htmlFor={idLibKpi} className="text-xs">KPI</Label>
                    <Select value={valueKey} onValueChange={setValueKey}>
                      <SelectTrigger id={idLibKpi} name="library-kpi" aria-label="KPI"><SelectValue placeholder="Escolha" /></SelectTrigger>
                      <SelectContent>
                        {kpiOptions.map((k) => (
                          <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label htmlFor={idLibTitle} className="text-xs">Título (opcional)</Label>
                  <Input id={idLibTitle} name="library-title" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder={libDef?.label} />
                </div>
                {supportsChartColor && (
                  <ChartColorPicker value={chartColor} onChange={setChartColor} />
                )}
                {titleAppearanceSection}
              </div>
              <div className="rounded-md border bg-muted/30 p-3 min-h-[240px]">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Pré-visualização</div>
                {previewNode ?? <div className="text-xs text-muted-foreground">Selecione os campos.</div>}
              </div>
            </div>
          </TabsContent>

          {supportsSeries && (
            <TabsContent value="series" className="pt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Adicione múltiplas métricas para plotar juntas no mesmo gráfico. Quando vazio, o bloco usa a métrica padrão. Em gráficos de ranking (revendas, obras, estados, mix), apenas a primeira série é usada como medida.
              </p>
              <SeriesEditor
                value={seriesList}
                onChange={setSeriesList}
                customMetrics={customMetrics}
                onCreateCustom={(m) => onCreateCustomMetric?.(m)}
                allowChartType={def?.kind === 'serie-mensal'}
              />
            </TabsContent>
          )}
        </Tabs>

        <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-md border p-3 space-y-2">
          <div className="text-[11px] text-muted-foreground">
            Aparência e leitura do gráfico — estas opções têm efeito nos componentes da Biblioteca BI.
          </div>
          <VisualConfigEditor
            value={visual}
            onChange={setVisual}
            availableSeriesKeys={['valor']}
          />
        </div>



        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {onResetToDefault && !isCustom && (
              <Button variant="outline" size="sm" onClick={() => { onResetToDefault(); onOpenChange(false); }}>
                Voltar ao padrão
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleApply}>Aplicar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
