/**
 * Diálogo simples para adicionar um widget da Biblioteca BI a uma página RH.
 * Escolhe componente do COMPONENT_REGISTRY e mapping automático a partir do
 * schema declarado em pageRegistry. Inclui pré-visualização ao vivo com
 * os dados reais da página.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COMPONENT_REGISTRY, getComponent } from '@/lib/bi/componentRegistry';
import { getPage } from '@/lib/bi/pageRegistry';
import { usePageData } from '@/lib/bi/PageDataContext';
import { WidgetErrorBoundary } from '@/components/bi/runtime/WidgetErrorBoundary';
import { buildEffectiveSchema, buildKpisOpts, buildSeriesOpts } from '@/lib/rh/dialogSchema';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pageKey: string;
  onAdd: (v: { componentId: string; title: string; mapping: Record<string, string> }) => void | Promise<void>;
}

export function AddRhBiWidgetDialog({ open, onOpenChange, pageKey, onAdd }: Props) {
  const page = getPage(pageKey);
  const ctx = usePageData();
  const kpisOpts = useMemo(
    () => buildKpisOpts(ctx?.kpis, page?.schema.kpis),
    [ctx?.kpis, page?.schema.kpis],
  );
  const seriesOpts = useMemo(
    () => buildSeriesOpts(ctx?.series, ctx?.seriesCatalog, page?.schema.series),
    [ctx?.series, ctx?.seriesCatalog, page?.schema.series],
  );
  const effectiveSchema = useMemo(
    () => buildEffectiveSchema(page, ctx),
    [ctx, page],
  );

  const [componentId, setComponentId] = useState<string>('kpi-card');
  const [title, setTitle] = useState<string>('');
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const def = useMemo(() => COMPONENT_REGISTRY.find((c) => c.id === componentId), [componentId]);

  useEffect(() => {
    if (!open) return;
    setComponentId('kpi-card');
    setTitle('');
    setMapping({});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!def || !page) { setMapping({}); return; }
    const auto = def.autoMap(effectiveSchema);
    setMapping(auto);
  }, [open, def, page, effectiveSchema]);

  const canAdd = !!def && (def.inputs.every((i) => !i.required || !!mapping[i.key]));

  // Debounce das seleções para não re-renderizar o preview a cada tecla.
  const [debounced, setDebounced] = useState({ componentId: '', mapping: {} as Record<string, string>, title: '' });
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced({ componentId, mapping, title }), 150);
    return () => window.clearTimeout(t);
  }, [componentId, mapping, title]);

  const previewDef = useMemo(
    () => (debounced.componentId ? getComponent(debounced.componentId) : undefined),
    [debounced.componentId],
  );
  const previewMappingReady = !!previewDef && previewDef.inputs.every((i) => !i.required || !!debounced.mapping[i.key]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar componente da Biblioteca BI</DialogTitle>
          <DialogDescription>
            Escolha um componente do catálogo para adicionar ao dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Componente</Label>
            <Select value={componentId} onValueChange={setComponentId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMPONENT_REGISTRY.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label} <span className="text-muted-foreground">· {c.kind}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
            {def?.description && <p className="text-xs text-muted-foreground">{def.description}</p>}
          </div>

          {def?.inputs.map((inp) => {
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
          })}

          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={def?.label} />
          </div>

          <div className="space-y-1 pt-2">
            <Label>Pré-visualização</Label>
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
                      title: debounced.title || previewDef.label,
                      mapping: debounced.mapping,
                      options: { filtros: ctx.filtros ?? {} },
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
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!canAdd}
            onClick={async () => {
              if (!def) return;
              await onAdd({ componentId: def.id, title: title || def.label, mapping });
              onOpenChange(false);
            }}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
