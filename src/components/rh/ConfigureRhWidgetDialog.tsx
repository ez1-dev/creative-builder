/**
 * Diálogo para configurar um widget RH.
 *
 * Traz a experiência completa da Biblioteca BI:
 *  - Aba "Componente": escolher componente da Biblioteca; para KPIs,
 *    variante (info/success/warning/danger) e formato do valor.
 *  - Aba "Dados": mapping de campos (kpis/series) + título customizado.
 *  - Aba "Aparência": VisualConfigEditor (formato de rótulos, mostrar/ocultar
 *    %, legenda, grade, eixos, densidade do card, fontes…).
 *
 * Toda a configuração é persistida em `widget.options` — os cards do RH que
 * usam ChartCardShell já leem `options.visual` e componentes do registry
 * respeitam `options.color`/`options.valueFormat`/etc. Nenhuma mudança de
 * schema é necessária.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COMPONENT_REGISTRY, getComponent } from '@/lib/bi/componentRegistry';
import { getPage } from '@/lib/bi/pageRegistry';
import { usePageData } from '@/lib/bi/PageDataContext';
import { WidgetErrorBoundary } from '@/components/bi/runtime/WidgetErrorBoundary';
import { VisualConfigEditor } from '@/components/bi/visual/VisualConfigEditor';
import { DEFAULT_VISUAL_CONFIG, mergeVisualConfig, type VisualConfig } from '@/lib/bi/visualConfig';
import type { RhWidget } from '@/hooks/useRhModuleLayout';
import { Trash2 } from 'lucide-react';
import type { PageDataSchema } from '@/lib/bi/pageRegistry';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pageKey: string;
  widget: RhWidget | null;
  allowedComponentIds?: string[];
  onSave: (patch: {
    componentId: string | null;
    mapping: Record<string, string> | null;
    customTitle: string | null;
    options: Record<string, any> | null;
  }) => void | Promise<void>;
  onDelete?: (type: string) => void | Promise<void>;
}

const KPI_VARIANTS = [
  { value: '__none__', label: 'Padrão' },
  { value: 'info', label: 'Info (azul)' },
  { value: 'success', label: 'Sucesso (verde)' },
  { value: 'warning', label: 'Atenção (amarelo)' },
  { value: 'danger', label: 'Perigo (vermelho)' },
];

const VALUE_FORMATS = [
  { value: 'currency', label: 'Moeda (R$)' },
  { value: 'number', label: 'Número' },
  { value: 'percent', label: 'Percentual' },
  { value: 'compact', label: 'Compacto (1,2 mi)' },
];

const toLabel = (key: string) => key
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (c) => c.toUpperCase());

function mergeByKey<T extends { key: string }>(primary: T[], secondary: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  [...primary, ...secondary].forEach((item) => {
    if (!item?.key || seen.has(item.key)) return;
    seen.add(item.key);
    out.push(item);
  });
  return out;
}

export function ConfigureRhWidgetDialog({ open, onOpenChange, pageKey, widget, allowedComponentIds, onSave, onDelete }: Props) {
  const page = getPage(pageKey);
  const ctx = usePageData();
  const isCustom = !!widget && widget.type.startsWith('custom-');

  const available = useMemo(() => {
    if (!allowedComponentIds?.length) return COMPONENT_REGISTRY;
    return COMPONENT_REGISTRY.filter((c) => allowedComponentIds.includes(c.id));
  }, [allowedComponentIds]);

  const [componentId, setComponentId] = useState<string>('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [title, setTitle] = useState<string>('');
  const [options, setOptions] = useState<Record<string, any>>({});

  const kpisOpts = useMemo(() => {
    const fromPage = page?.schema.kpis ?? [];
    const fromCtx = Object.keys(ctx?.kpis ?? {}).map((key) => ({ key, label: toLabel(key) }));
    return mergeByKey(fromPage, fromCtx);
  }, [ctx?.kpis, page?.schema.kpis]);

  const seriesOpts = useMemo(() => {
    const fromCatalog = ctx?.seriesCatalog?.length ? ctx.seriesCatalog : [];
    const fromSeries = Object.keys(ctx?.series ?? {}).map((key) => ({ key, label: toLabel(key) }));
    return mergeByKey(mergeByKey(fromCatalog, fromSeries), page?.schema.series ?? []);
  }, [ctx?.series, ctx?.seriesCatalog, page?.schema.series]);

  const effectiveSchema = useMemo<PageDataSchema>(() => ({
    ...(page?.schema ?? {}),
    kpis: kpisOpts,
    series: seriesOpts,
    rows: page?.schema.rows ?? (Array.isArray(ctx?.rows) && ctx.rows.length
      ? { key: 'dados', label: 'Dados da página', fields: Object.keys(ctx.rows[0] ?? {}) }
      : undefined),
  }), [ctx?.rows, kpisOpts, page?.schema, seriesOpts]);

  const firstCompatibleComponentId = useCallback(() => {
    if (widget?.componentId && available.some((c) => c.id === widget.componentId)) return widget.componentId;
    return available[0]?.id ?? '';
  }, [available, widget?.componentId]);

  const autoMapFor = useCallback((id: string) => {
    const cmp = available.find((c) => c.id === id) ?? getComponent(id);
    if (!cmp) return {};
    return cmp.autoMap(effectiveSchema);
  }, [available, effectiveSchema]);

  const requiredMappingReady = useCallback((id: string, map: Record<string, string>) => {
    const cmp = available.find((c) => c.id === id) ?? getComponent(id);
    if (!cmp) return false;
    return cmp.inputs.every((i) => !i.required || !!map[i.key]);
  }, [available]);

  useEffect(() => {
    if (!open || !widget) return;
    const initialComponentId = widget.componentId ?? firstCompatibleComponentId();
    const initialMapping = widget.mapping && Object.keys(widget.mapping).length
      ? widget.mapping
      : autoMapFor(initialComponentId);
    setComponentId(initialComponentId);
    setMapping(initialMapping);
    setTitle(widget.customTitle ?? '');
    setOptions(widget.options ?? {});
  }, [autoMapFor, firstCompatibleComponentId, open, widget]);

  const def = useMemo(() => available.find((c) => c.id === componentId), [available, componentId]);
  const isKpi = def?.kind === 'kpi' || widget?.type?.toLowerCase().includes('kpi');

  useEffect(() => {
    if (!def || !page) return;
    if (!requiredMappingReady(def.id, mapping)) {
      setMapping((cur) => ({ ...def.autoMap(effectiveSchema), ...cur }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, effectiveSchema]);

  const canSave = componentId
    ? !!def && def.inputs.every((i) => !i.required || !!mapping[i.key])
    : !isCustom;

  const visual = useMemo<VisualConfig>(() => mergeVisualConfig(options?.visual), [options]);
  const updateVisual = (next: VisualConfig) => {
    setOptions((prev) => ({ ...prev, visual: next }));
  };
  const updateOption = (key: string, val: any) => {
    setOptions((prev) => {
      const next = { ...prev };
      if (val === null || val === undefined || val === '' || val === '__none__') delete next[key];
      else next[key] = val;
      return next;
    });
  };

  const handleComponentChange = (value: string) => {
    const nextId = value === '__none__' ? '' : value;
    setComponentId(nextId);
    setMapping(nextId ? autoMapFor(nextId) : {});
  };

  // Debounce para o preview.
  const [debounced, setDebounced] = useState({ componentId: '', mapping: {} as Record<string, string>, title: '', options: {} as Record<string, any> });
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced({ componentId, mapping, title, options }), 150);
    return () => window.clearTimeout(t);
  }, [componentId, mapping, title, options]);

  const previewDef = useMemo(
    () => (debounced.componentId ? getComponent(debounced.componentId) : undefined),
    [debounced.componentId],
  );
  const previewMappingReady = !!previewDef && previewDef.inputs.every((i) => !i.required || !!debounced.mapping[i.key]);

  const availableSeriesKeys = useMemo(() => {
    const keys = Object.values(mapping).filter(Boolean);
    return keys.length ? keys : ['valor'];
  }, [mapping]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar {widget?.title}</DialogTitle>
          <DialogDescription>
            Escolha o componente, mapeie os dados e ajuste a aparência.
            <span className="block text-[11px] text-muted-foreground/80 mt-1">
              Opções de aparência aplicam-se a componentes da Biblioteca BI e a gráficos padrão que usam ChartCardShell.
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="componente">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="componente">Componente</TabsTrigger>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          </TabsList>

          {/* ===== Componente ===== */}
          <TabsContent value="componente" className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label>Componente</Label>
              <Select value={componentId || '__none__'} onValueChange={handleComponentChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {!isCustom && <SelectItem value="__none__">— Padrão (sem substituição) —</SelectItem>}
                  {available.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label} <span className="text-muted-foreground">· {c.kind}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {def?.description && <p className="text-xs text-muted-foreground">{def.description}</p>}
            </div>

            {isKpi && (
              <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/20 p-3">
                <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Aparência do KPI
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Variante</Label>
                  <Select value={(options.color as string) || '__none__'} onValueChange={(v) => updateOption('color', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KPI_VARIANTS.map((v) => (
                        <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Formato do valor</Label>
                  <Select value={(options.valueFormat as string) || 'currency'} onValueChange={(v) => updateOption('valueFormat', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VALUE_FORMATS.map((v) => (
                        <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Subtítulo (opcional)</Label>
                  <Input
                    value={(options.subtitle as string) ?? ''}
                    onChange={(e) => updateOption('subtitle', e.target.value)}
                    placeholder="Ex.: no período selecionado"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* ===== Dados ===== */}
          <TabsContent value="dados" className="space-y-3 pt-3">
            {def?.inputs.length ? def.inputs.map((inp) => {
              const bag = inp.source === 'kpis' ? kpisOpts : inp.source === 'series' ? seriesOpts : [];
              return (
                <div key={inp.key} className="space-y-1">
                  <Label>{inp.label} <span className="text-muted-foreground">({inp.source})</span></Label>
                  {bag.length ? (
                    <Select
                      value={mapping[inp.key] ?? ''}
                      onValueChange={(v) => setMapping((m) => ({ ...m, [inp.key]: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                      <SelectContent>
                        {bag.map((k) => (
                          <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={`chave (${inp.source})`}
                      value={mapping[inp.key] ?? ''}
                      onChange={(e) => setMapping((m) => ({ ...m, [inp.key]: e.target.value }))}
                    />
                  )}
                </div>
              );
            }) : (
              <p className="text-xs text-muted-foreground">
                Selecione um componente na aba <b>Componente</b> para mapear os dados.
              </p>
            )}

            <div className="space-y-1 pt-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={widget?.title} />
            </div>
          </TabsContent>

          {/* ===== Aparência ===== */}
          <TabsContent value="aparencia" className="pt-3">
            <VisualConfigEditor
              value={visual}
              onChange={updateVisual}
              availableSeriesKeys={availableSeriesKeys}
            />
          </TabsContent>
        </Tabs>

        {/* Pré-visualização (visível em qualquer aba) */}
        <div className="space-y-1 pt-3">
          <Label className="text-xs">Pré-visualização</Label>
          <Card className="h-[260px] overflow-hidden bg-muted/30">
            {!ctx ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground px-4 text-center">
                Preview indisponível fora da página.
              </div>
            ) : !previewDef ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground px-4 text-center">
                Escolha um componente para ver o preview com dados reais.
              </div>
            ) : !previewMappingReady ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground px-4 text-center">
                Selecione os campos obrigatórios para ver o preview.
              </div>
            ) : (
              <div className="h-full p-3 overflow-hidden">
                <WidgetErrorBoundary>
                  {previewDef.render({
                    title: debounced.title || widget?.customTitle || widget?.title || previewDef.label,
                    mapping: debounced.mapping,
                    options: { ...debounced.options, filtros: ctx.filtros ?? {} },
                    ctx: {
                      kpis: ctx.kpis ?? {},
                      series: ctx.series ?? {},
                      rows: Array.isArray(ctx.rows) ? ctx.rows : [],
                    },
                  })}
                </WidgetErrorBoundary>
              </div>
            )}
          </Card>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          <div>
            {isCustom && onDelete && widget && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await onDelete(widget.type);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOptions((prev) => ({ ...prev, visual: { ...DEFAULT_VISUAL_CONFIG } }));
              }}
            >
              Restaurar aparência
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              disabled={!canSave}
              onClick={async () => {
                await onSave({
                  componentId: componentId ? componentId : null,
                  mapping: componentId ? mapping : null,
                  customTitle: title || null,
                  options: Object.keys(options).length ? options : null,
                });
                onOpenChange(false);
              }}
            >
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
