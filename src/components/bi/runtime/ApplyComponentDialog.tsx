/**
 * Modal "Onde aplicar este componente?"
 *
 * Steps inline:
 *  1. Página alvo
 *  2. Seção (filtrada pelo `kind` do componente)
 *  3. Mapeamento de campos (sugestão automática)
 *  4. Título / largura / ordem
 *  5. Salvar (insere em bi_user_widgets para o usuário logado)
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
import { PAGE_REGISTRY, getPage, getSectionsForKind } from '@/lib/bi/pageRegistry';
import { getComponent } from '@/lib/bi/componentRegistry';
import { createUserWidget } from '@/hooks/useUserWidgets';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export function ApplyComponentDialog({
  open, onOpenChange, componentId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  componentId: string | null;
}) {
  const def = componentId ? getComponent(componentId) : null;

  const compatiblePages = useMemo(() => {
    if (!def) return [];
    return PAGE_REGISTRY.filter((p) => getSectionsForKind(p, def.kind).length > 0);
  }, [def]);

  const [pageKey, setPageKey] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [span, setSpan] = useState<number>(1);
  const [ordem, setOrdem] = useState<number>(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Preset on open
  useEffect(() => {
    if (!open || !def) return;
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const p = compatiblePages[0];
    if (p) {
      setPageKey(p.key);
      const secs = getSectionsForKind(p, def.kind);
      setSection(secs[0]?.key ?? '');
      setMapping(def.autoMap(p.schema));
    }
    setTitle('');
    setSpan(def.defaultSpan);
    setOrdem(0);
  }, [open, def, compatiblePages]);

  const page = pageKey ? getPage(pageKey) : undefined;
  const availableSections = page && def ? getSectionsForKind(page, def.kind) : [];

  // Recompute auto mapping when page changes
  useEffect(() => {
    if (!page || !def) return;
    setMapping(def.autoMap(page.schema));
    if (!availableSections.find((s) => s.key === section)) {
      setSection(availableSections[0]?.key ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  if (!def) return null;

  const fieldOptions = (source: 'kpis' | 'series' | 'rows') => {
    if (!page) return [];
    if (source === 'kpis') return page.schema.kpis ?? [];
    if (source === 'series') return page.schema.series ?? [];
    return page.schema.rows ? [{ key: page.schema.rows.key, label: page.schema.rows.label }] : [];
  };

  const canSave =
    pageKey && section && def.inputs.every((i) => !i.required || !!mapping[i.key]);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await createUserWidget({
        page_key: pageKey, section, component_id: def.id,
        title: title || null, span, ordem, mapping, options: {},
      });
      toast.success('Componente aplicado!', {
        description: `Acesse ${page?.route} para visualizar.`,
        action: { label: 'Abrir', onClick: () => { window.location.href = page?.route ?? '/'; } },
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Erro ao salvar', { description: e?.message ?? 'Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aplicar componente</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-primary">{def.label}</span> — escolha onde inserir e como mapear os dados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Página */}
          <div className="space-y-1">
            <Label className="text-xs">Página alvo</Label>
            <Select value={pageKey} onValueChange={setPageKey}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {compatiblePages.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
                {compatiblePages.length === 0 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">Nenhuma página compatível.</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Seção */}
          <div className="space-y-1">
            <Label className="text-xs">Seção</Label>
            <Select value={section} onValueChange={setSection} disabled={!availableSections.length}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {availableSections.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mapeamento */}
          {def.inputs.length > 0 && page && (
            <div className="space-y-2 rounded-md border bg-muted/20 p-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mapeamento de dados
              </div>
              {def.inputs.map((inp) => {
                const opts = fieldOptions(inp.source);
                return (
                  <div key={inp.key} className="space-y-1">
                    <Label className="text-xs">
                      {inp.label} {inp.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                      value={mapping[inp.key] ?? ''}
                      onValueChange={(v) => setMapping((m) => ({ ...m, [inp.key]: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione campo…" /></SelectTrigger>
                      <SelectContent>
                        {opts.map((o: any) => (
                          <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                        ))}
                        {opts.length === 0 && (
                          <div className="px-2 py-1 text-xs text-muted-foreground">Sem campos disponíveis.</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}

          {/* Visual options */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Título (opcional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={def.label} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Largura</Label>
              <Select value={String(span)} onValueChange={(v) => setSpan(Number(v))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 col</SelectItem>
                  <SelectItem value="2">2 cols</SelectItem>
                  <SelectItem value="3">3 cols</SelectItem>
                  <SelectItem value="4">4 cols</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={!canSave || saving}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {saving ? 'Salvando…' : 'Aplicar à página'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
