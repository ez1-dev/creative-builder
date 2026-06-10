/**
 * Diálogo para adicionar um bloco ao dashboard BI Comercial.
 *
 * Duas abas:
 *  - "KPI / Bloco do catálogo": cria um widget canônico (não-custom) se ele
 *    ainda não estiver presente (útil quando o usuário deletou e quer trazer
 *    de volta).
 *  - "Da Biblioteca BI": cria um widget custom-<timestamp> usando qualquer
 *    componente do COMPONENT_REGISTRY.
 */
import { useEffect, useId, useMemo, useState } from 'react';
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
import { COMERCIAL_WIDGETS, makeDuplicateType, baseWidgetType } from '@/lib/bi/comercialWidgetCatalog';

export interface NewWidgetValue {
  type: string;
  title: string;
  componentId?: string;
  mapping?: Record<string, string>;
  options?: Record<string, any>;
  variant?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Tipos canônicos já presentes — desabilitados na lista. */
  presentTypes: string[];
  onAdd: (value: NewWidgetValue) => void;
  kpis?: Record<string, any>;
  series?: Record<string, any>;
  rows?: any[];
  /** Notifica a página da série atualmente selecionada na aba "Biblioteca" para que ela
   *  dispare o fetch lazy correspondente e a pré-visualização tenha dados. */
  onPreviewSeriesChange?: (key: string | null) => void;
}

export function AddBiWidgetDialog({ open, onOpenChange, presentTypes, onAdd, kpis, series, rows, onPreviewSeriesChange }: Props) {
  const uid = useId();
  const idCatalogBlock = `${uid}-catalog-block`;
  const idCatalogTitle = `${uid}-catalog-title`;
  const idLibComponent = `${uid}-lib-component`;
  const idLibSeries = `${uid}-lib-series`;
  const idLibKpi = `${uid}-lib-kpi`;
  const idLibTitle = `${uid}-lib-title`;
  const page = getPage('bi-comercial');
  const seriesOptions = page?.schema.series ?? [];
  const kpiOptions = page?.schema.kpis ?? [];

  const allCatalog = Object.values(COMERCIAL_WIDGETS);

  const [tab, setTab] = useState<'catalog' | 'library'>('catalog');
  const [catalogType, setCatalogType] = useState<string>('');
  const [componentId, setComponentId] = useState<string>('bar-chart');
  const [seriesKey, setSeriesKey] = useState<string>('');
  const [valueKey, setValueKey] = useState<string>('');
  const [title, setTitle] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setTab('catalog');
    const firstAvail = allCatalog.find((w) => !presentTypes.includes(w.type));
    setCatalogType(firstAvail?.type ?? '');
    setComponentId('bar-chart');
    setSeriesKey(seriesOptions[0]?.key ?? '');
    setValueKey(kpiOptions[0]?.key ?? '');
    setTitle('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const libDef = useMemo(() => getComponent(componentId), [componentId]);
  const inputs = libDef?.inputs ?? [];
  const libUsesSeries = inputs.some((i) => i.source === 'series');

  // Notifica a página da série em preview para disparar fetch lazy (drill-backed).
  useEffect(() => {
    if (!onPreviewSeriesChange) return;
    if (open && tab === 'library' && libUsesSeries && seriesKey) {
      onPreviewSeriesChange(seriesKey);
    } else {
      onPreviewSeriesChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, libUsesSeries, seriesKey]);

  useEffect(() => {
    if (!open && onPreviewSeriesChange) onPreviewSeriesChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);


  const previewNode = useMemo(() => {
    if (tab !== 'library' || !libDef) return null;
    try {
      const mapping: Record<string, string> = {};
      inputs.forEach((inp) => {
        if (inp.source === 'series') mapping[inp.key] = seriesKey;
        else if (inp.source === 'kpis') mapping[inp.key] = valueKey;
        else mapping[inp.key] = 'dados';
      });
      return libDef.render({
        title: title || libDef.label,
        mapping,
        ctx: { kpis: kpis ?? {}, series: series ?? {}, rows: rows ?? [] },
        options: {},
      });
    } catch (e) {
      return <div className="text-xs text-destructive">Erro: {(e as Error).message}</div>;
    }
  }, [tab, libDef, inputs, seriesKey, valueKey, title, kpis, series, rows]);

  const handleAdd = () => {
    if (tab === 'catalog') {
      const def = COMERCIAL_WIDGETS[catalogType];
      if (!def) return;
      const alreadyPresent = presentTypes.some((t) => baseWidgetType(t) === def.type);
      onAdd({
        type: alreadyPresent ? makeDuplicateType(def.type) : def.type,
        title: title.trim() || def.title,
        variant: def.variants[0]?.value,
      });
    } else {
      if (!libDef) return;
      const mapping: Record<string, string> = {};
      inputs.forEach((inp) => {
        if (inp.source === 'series') mapping[inp.key] = seriesKey;
        else if (inp.source === 'kpis') mapping[inp.key] = valueKey;
        else mapping[inp.key] = 'dados';
      });
      onAdd({
        type: `custom-${Date.now()}`,
        title: title.trim() || libDef.label,
        componentId: libDef.id,
        mapping,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Adicionar bloco</DialogTitle>
          <DialogDescription>Escolha um KPI ou gráfico do catálogo, ou crie um bloco livre da Biblioteca BI.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'catalog' | 'library')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="catalog">Catálogo BI Comercial</TabsTrigger>
            <TabsTrigger value="library">Da Biblioteca BI</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-3 pt-3">
            <div>
              <Label htmlFor={idCatalogBlock} className="text-xs">Bloco</Label>
              <Select value={catalogType} onValueChange={setCatalogType}>
                <SelectTrigger id={idCatalogBlock} name="catalog-block" aria-label="Bloco do catálogo"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {allCatalog.map((w) => {
                    const count = presentTypes.filter((t) => baseWidgetType(t) === w.type).length;
                    return (
                      <SelectItem key={w.type} value={w.type}>
                        {w.title}{count > 0 ? ` (×${count})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={idCatalogTitle} className="text-xs">Título (opcional)</Label>
              <Input id={idCatalogTitle} name="catalog-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={COMERCIAL_WIDGETS[catalogType]?.title} />
            </div>
          </TabsContent>

          <TabsContent value="library" className="pt-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label htmlFor={idLibComponent} className="text-xs">Componente</Label>
                  <Select value={componentId} onValueChange={setComponentId}>
                    <SelectTrigger id={idLibComponent} name="library-component" aria-label="Componente da Biblioteca BI"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {COMPONENT_REGISTRY.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {inputs.some((i) => i.source === 'series') && (
                  <div>
                    <Label htmlFor={idLibSeries} className="text-xs">Série</Label>
                    <Select value={seriesKey} onValueChange={setSeriesKey}>
                      <SelectTrigger id={idLibSeries} name="library-series" aria-label="Série"><SelectValue /></SelectTrigger>
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
                      <SelectTrigger id={idLibKpi} name="library-kpi" aria-label="KPI"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {kpiOptions.map((k) => (
                          <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label htmlFor={idLibTitle} className="text-xs">Título</Label>
                  <Input id={idLibTitle} name="library-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={libDef?.label} />
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 min-h-[240px]">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Pré-visualização</div>
                {previewNode ?? <div className="text-xs text-muted-foreground">—</div>}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAdd}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
