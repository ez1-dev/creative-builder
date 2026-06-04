/**
 * Diálogo para substituir um slot do BI Comercial por qualquer
 * componente compatível da Biblioteca BI. Mapeia automaticamente
 * a série padrão do slot para o input principal do componente.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COMPONENT_REGISTRY, getComponent } from '@/lib/bi/componentRegistry';
import { usePageData } from '@/lib/bi/PageDataContext';
import { useSlotOverrides, type SlotOverrideRow } from '@/hooks/useSlotOverrides';
import type { SlotDef } from '@/lib/bi/comercialSlots';
import { toast } from '@/hooks/use-toast';

interface ReplaceSlotDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slot: SlotDef;
  currentOverride?: SlotOverrideRow;
  onSaved?: () => void;
}

export function ReplaceSlotDialog({ open, onOpenChange, slot, currentOverride, onSaved }: ReplaceSlotDialogProps) {
  const ctx = usePageData();
  const { setOverride } = useSlotOverrides(ctx?.pageKey ?? '__none__');

  const allowedIds = new Set(slot.libraryComponentIds);
  const components = useMemo(
    () => COMPONENT_REGISTRY.filter((c) => allowedIds.has(c.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slot.slotKey],
  );

  const [componentId, setComponentId] = useState<string>('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // resetar estado quando abrir
  useEffect(() => {
    if (!open) return;
    const initialId =
      (currentOverride?.mode === 'library' ? currentOverride.component_id : '') ||
      components[0]?.id || '';
    setComponentId(initialId);
    const def = initialId ? getComponent(initialId) : undefined;
    if (def) {
      // auto-map: pré-preenche com a série do slot se houver input source=series
      const auto: Record<string, string> = {};
      for (const inp of def.inputs) {
        if (inp.source === 'series') auto[inp.key] = slot.seriesKey;
        else if (inp.source === 'kpis') auto[inp.key] = Object.keys(ctx?.kpis ?? {})[0] ?? '';
        else if (inp.source === 'rows') auto[inp.key] = 'dados';
      }
      const fromCurrent = currentOverride?.mapping ?? {};
      setMapping({ ...auto, ...fromCurrent });
    }
  }, [open, currentOverride, components, ctx?.kpis, slot.seriesKey]);

  const def = componentId ? getComponent(componentId) : undefined;
  const seriesKeys = Object.keys(ctx?.series ?? {});
  const kpiKeys = Object.keys(ctx?.kpis ?? {});

  const handleComponentChange = (id: string) => {
    setComponentId(id);
    const d = getComponent(id);
    if (!d) return;
    const auto: Record<string, string> = {};
    for (const inp of d.inputs) {
      if (inp.source === 'series') auto[inp.key] = slot.seriesKey;
      else if (inp.source === 'kpis') auto[inp.key] = kpiKeys[0] ?? '';
      else if (inp.source === 'rows') auto[inp.key] = 'dados';
    }
    setMapping(auto);
  };

  const handleSave = async () => {
    if (!def) return;
    setSaving(true);
    try {
      await setOverride(slot.slotKey, {
        mode: 'library',
        component_id: def.id,
        mapping,
        options: currentOverride?.options ?? {},
      });
      toast({ title: 'Componente aplicado', description: `${def.label} substituiu o bloco.` });
      onSaved?.();
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: String((err as any)?.message ?? err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Substituir bloco — {slot.title}</DialogTitle>
          <DialogDescription>
            Escolha um componente da Biblioteca BI para substituir este bloco. As escolhas são salvas por usuário.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Componente</Label>
            <Select value={componentId} onValueChange={handleComponentChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecionar…" />
              </SelectTrigger>
              <SelectContent>
                {components.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {def?.description && (
              <p className="text-[11px] text-muted-foreground">{def.description}</p>
            )}
          </div>

          <div className="space-y-2">
            {def?.inputs.map((inp) => {
              const options =
                inp.source === 'series' ? seriesKeys :
                inp.source === 'kpis' ? kpiKeys :
                ['dados'];
              return (
                <div key={inp.key} className="space-y-1">
                  <Label className="text-xs">
                    {inp.label}
                    {inp.required && <span className="ml-1 text-destructive">*</span>}
                    <span className="ml-1 text-[10px] text-muted-foreground">({inp.source})</span>
                  </Label>
                  <Select
                    value={mapping[inp.key] ?? ''}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [inp.key]: v }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Escolher…" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pré-visualização */}
        {def && ctx && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="mb-2 text-[11px] font-semibold text-muted-foreground">Pré-visualização</div>
            <div className="max-h-[360px] overflow-auto">
              {def.render({
                title: slot.title,
                mapping,
                options: {},
                ctx: { kpis: ctx.kpis, series: ctx.series, rows: ctx.rows },
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!def || saving}>
            {saving ? 'Salvando…' : 'Aplicar componente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
