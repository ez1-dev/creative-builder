/**
 * Diálogo para configurar um widget RH: substituir por um componente da
 * Biblioteca BI, limpar a substituição (voltar ao padrão) ou excluir
 * (apenas widgets custom-*).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COMPONENT_REGISTRY } from '@/lib/bi/componentRegistry';
import { getPage } from '@/lib/bi/pageRegistry';
import type { RhWidget } from '@/hooks/useRhModuleLayout';
import { Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pageKey: string;
  widget: RhWidget | null;
  allowedComponentIds?: string[];
  onSave: (patch: { componentId: string | null; mapping: Record<string, string> | null; customTitle: string | null }) => void | Promise<void>;
  onDelete?: (type: string) => void | Promise<void>;
}

export function ConfigureRhWidgetDialog({ open, onOpenChange, pageKey, widget, allowedComponentIds, onSave, onDelete }: Props) {
  const page = getPage(pageKey);
  const kpisOpts = page?.schema.kpis ?? [];
  const seriesOpts = page?.schema.series ?? [];
  const isCustom = !!widget && widget.type.startsWith('custom-');

  const available = useMemo(() => {
    if (!allowedComponentIds?.length) return COMPONENT_REGISTRY;
    return COMPONENT_REGISTRY.filter((c) => allowedComponentIds.includes(c.id));
  }, [allowedComponentIds]);

  const [componentId, setComponentId] = useState<string>('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [title, setTitle] = useState<string>('');

  useEffect(() => {
    if (!open || !widget) return;
    setComponentId(widget.componentId ?? '');
    setMapping(widget.mapping ?? {});
    setTitle(widget.customTitle ?? '');
  }, [open, widget]);

  const def = useMemo(() => available.find((c) => c.id === componentId), [available, componentId]);

  useEffect(() => {
    if (!def || !page) return;
    // Se mapping estiver vazio, aplica autoMap.
    if (!Object.keys(mapping).length) {
      setMapping(def.autoMap(page.schema));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def]);

  const canSave = isCustom
    ? !!def && def.inputs.every((i) => !i.required || !!mapping[i.key])
    : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar {widget?.title}</DialogTitle>
          <DialogDescription>
            {isCustom
              ? 'Escolha um componente da Biblioteca BI.'
              : 'Substitua este bloco por um componente da Biblioteca BI ou limpe para voltar ao padrão.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Componente</Label>
            <Select value={componentId || '__none__'} onValueChange={(v) => setComponentId(v === '__none__' ? '' : v)}>
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
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={widget?.title} />
          </div>
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
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              disabled={!canSave}
              onClick={async () => {
                await onSave({
                  componentId: componentId ? componentId : null,
                  mapping: componentId ? mapping : null,
                  customTitle: title || null,
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
