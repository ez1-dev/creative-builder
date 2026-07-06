/**
 * Diálogo simples para adicionar um widget da Biblioteca BI a uma página RH.
 * Escolhe componente do COMPONENT_REGISTRY e mapping automático a partir do
 * schema declarado em pageRegistry.
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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pageKey: string;
  onAdd: (v: { componentId: string; title: string; mapping: Record<string, string> }) => void | Promise<void>;
}

export function AddRhBiWidgetDialog({ open, onOpenChange, pageKey, onAdd }: Props) {
  const page = getPage(pageKey);
  const kpisOpts = page?.schema.kpis ?? [];
  const seriesOpts = page?.schema.series ?? [];

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
    if (!def || !page) { setMapping({}); return; }
    const auto = def.autoMap(page.schema);
    setMapping(auto);
  }, [def, page]);

  const canAdd = !!def && (def.inputs.every((i) => !i.required || !!mapping[i.key]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
