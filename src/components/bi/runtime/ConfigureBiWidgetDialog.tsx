/**
 * Diálogo unificado para configurar um widget do BI Comercial.
 *
 * Modos:
 *  - widget canônico (KPI, gráfico, tabela): pode trocar variante built-in
 *    OU substituir por um componente da Biblioteca BI compatível.
 *  - widget custom (custom-*): sempre Biblioteca BI.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { COMPONENT_REGISTRY, getComponent } from '@/lib/bi/componentRegistry';
import { getPage } from '@/lib/bi/pageRegistry';
import type { ComercialWidgetDef } from '@/lib/bi/comercialWidgetCatalog';

export interface ConfigureValue {
  variant?: string | null;
  componentId?: string | null;
  mapping?: Record<string, string> | null;
  options?: Record<string, any> | null;
  customTitle?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Definição do widget (catálogo). Quando null/undefined, é um widget custom. */
  def?: ComercialWidgetDef;
  initial: ConfigureValue & { variant?: string; componentId?: string };
  blockType: string;
  fallbackTitle?: string;
  onApply: (next: ConfigureValue) => void;
  onResetToDefault?: () => void;
  kpis?: Record<string, any>;
  series?: Record<string, any>;
  rows?: any[];
}

export function ConfigureBiWidgetDialog({
  open, onOpenChange, def, initial, blockType, fallbackTitle,
  onApply, onResetToDefault, kpis, series, rows,
}: Props) {
  const page = getPage('bi-comercial');
  const isCustom = blockType.startsWith('custom-');
  const compatibleLibIds = def?.libraryComponentIds ?? COMPONENT_REGISTRY.map((c) => c.id);
  const libDefs = COMPONENT_REGISTRY.filter((c) => compatibleLibIds.includes(c.id));

  const startsAsLibrary = !!initial.componentId || isCustom;
  const [mode, setMode] = useState<'builtin' | 'library'>(startsAsLibrary ? 'library' : 'builtin');
  const [variant, setVariant] = useState<string>(initial.variant ?? def?.variants[0]?.value ?? '');
  const [componentId, setComponentId] = useState<string>(initial.componentId ?? libDefs[0]?.id ?? '');
  const [seriesKey, setSeriesKey] = useState<string>(initial.mapping?.series ?? '');
  const [valueKey, setValueKey] = useState<string>(initial.mapping?.value ?? def?.kpiKey ?? '');
  const [customTitle, setCustomTitle] = useState<string>(initial.customTitle ?? '');

  useEffect(() => {
    if (!open) return;
    setMode(startsAsLibrary ? 'library' : 'builtin');
    setVariant(initial.variant ?? def?.variants[0]?.value ?? '');
    setComponentId(initial.componentId ?? libDefs[0]?.id ?? '');
    setSeriesKey(initial.mapping?.series ?? '');
    setValueKey(initial.mapping?.value ?? def?.kpiKey ?? '');
    setCustomTitle(initial.customTitle ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const libDef = useMemo(() => getComponent(componentId), [componentId]);
  const seriesOptions = page?.schema.series ?? [];
  const kpiOptions = page?.schema.kpis ?? [];
  const inputs = libDef?.inputs ?? [];

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
        options: {},
      });
    } catch (e) {
      return <div className="text-xs text-destructive">Erro: {(e as Error).message}</div>;
    }
  }, [mode, libDef, inputs, seriesKey, valueKey, customTitle, kpis, series, rows, seriesOptions, kpiOptions]);

  const handleApply = () => {
    if (mode === 'builtin') {
      onApply({
        variant,
        componentId: null,
        mapping: null,
        options: null,
        customTitle: customTitle.trim() || null,
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
        customTitle: customTitle.trim() || null,
      });
    }
    onOpenChange(false);
  };

  const variants = def?.variants ?? [];
  const hasBuiltin = !isCustom && variants.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Configurar bloco</DialogTitle>
          <DialogDescription>
            {isCustom
              ? 'Edite o componente da Biblioteca BI aplicado.'
              : `Customize "${fallbackTitle ?? blockType}" — escolha variante padrão ou substitua por componente da Biblioteca BI.`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'builtin' | 'library')}>
          {hasBuiltin && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="builtin">Variante padrão</TabsTrigger>
              <TabsTrigger value="library">Biblioteca BI</TabsTrigger>
            </TabsList>
          )}

          {hasBuiltin && (
            <TabsContent value="builtin" className="space-y-3 pt-3">
              <div>
                <Label className="text-xs">Visualização</Label>
                <Select value={variant} onValueChange={setVariant}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {variants.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Título (opcional)</Label>
                <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder={fallbackTitle ?? def?.title} />
              </div>
            </TabsContent>
          )}

          <TabsContent value="library" className="pt-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Componente</Label>
                  <Select value={componentId} onValueChange={setComponentId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {libDefs.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {inputs.some((i) => i.source === 'series') && (
                  <div>
                    <Label className="text-xs">Série</Label>
                    <Select value={seriesKey} onValueChange={setSeriesKey}>
                      <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
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
                    <Label className="text-xs">KPI</Label>
                    <Select value={valueKey} onValueChange={setValueKey}>
                      <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                      <SelectContent>
                        {kpiOptions.map((k) => (
                          <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Título (opcional)</Label>
                  <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder={libDef?.label} />
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 min-h-[240px]">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Pré-visualização</div>
                {previewNode ?? <div className="text-xs text-muted-foreground">Selecione os campos.</div>}
              </div>
            </div>
          </TabsContent>
        </Tabs>

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
