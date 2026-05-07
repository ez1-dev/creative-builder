/**
 * Modal "Onde aplicar este componente?"
 * Inclui pré-visualização do widget + resumo de filtros/dados antes de salvar.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAGE_REGISTRY, getPage, getSectionsForKind } from '@/lib/bi/pageRegistry';
import { getComponent } from '@/lib/bi/componentRegistry';
import { createUserWidget } from '@/hooks/useUserWidgets';
import { supabase } from '@/integrations/supabase/client';
import { usePageData } from '@/lib/bi/PageDataContext';
import { buildPreviewCtx, describeMappedValue } from '@/lib/bi/previewData';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Eye } from 'lucide-react';

export function ApplyComponentDialog({
  open, onOpenChange, componentId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  componentId: string | null;
}) {
  const def = componentId ? getComponent(componentId) : null;
  const liveCtx = usePageData();

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

  useEffect(() => {
    if (!open || !def) return;
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const initial = compatiblePages.find((p) => p.key === liveCtx?.pageKey) ?? compatiblePages[0];
    if (initial) {
      setPageKey(initial.key);
      const secs = getSectionsForKind(initial, def.kind);
      setSection(secs[0]?.key ?? '');
      setMapping(def.autoMap(initial.schema));
    }
    setTitle('');
    setSpan(def.defaultSpan);
    setOrdem(0);
  }, [open, def, compatiblePages, liveCtx?.pageKey]);

  const page = pageKey ? getPage(pageKey) : undefined;
  const availableSections = page && def ? getSectionsForKind(page, def.kind) : [];

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
    authed === true && pageKey && section && def.inputs.every((i) => !i.required || !!mapping[i.key]);

  // ----- Preview -----
  const previewCtx = useMemo(() => (page ? buildPreviewCtx(page, liveCtx) : null), [page, liveCtx]);
  const previewNode = useMemo(() => {
    if (!page || !previewCtx) return null;
    try {
      return def.render({
        title: title || def.label,
        mapping,
        ctx: { kpis: previewCtx.kpis, series: previewCtx.series, rows: previewCtx.rows },
        options: {},
      });
    } catch (e) {
      return <div className="text-xs text-destructive">Erro no preview: {(e as Error).message}</div>;
    }
  }, [def, page, previewCtx, mapping, title]);

  const filtroChips = useMemo(() => {
    const f = previewCtx?.filtros ?? {};
    return Object.entries(f).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0));
  }, [previewCtx]);

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aplicar componente</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-primary">{def.label}</span> — escolha onde inserir, mapeie os dados e veja a pré-visualização.
          </DialogDescription>
        </DialogHeader>

        {authed === false && (
          <div className="flex items-start justify-between gap-3 rounded-md border-2 border-destructive bg-destructive/10 p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
              <div className="text-destructive">
                <div className="font-semibold">Você precisa estar autenticado</div>
                <div className="text-xs opacity-90">Para aplicar componentes em páginas, faça login primeiro.</div>
              </div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => { window.location.href = `/login?redirect=${encodeURIComponent('/biblioteca-bi')}`; }}
            >
              Entrar agora
            </Button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* ===== Coluna esquerda: configuração ===== */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Página alvo</Label>
              <Select value={pageKey} onValueChange={setPageKey}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {compatiblePages.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}

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

          {/* ===== Coluna direita: pré-visualização ===== */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Eye className="h-3.5 w-3.5" /> Pré-visualização
              </div>
              {previewCtx && (
                <Badge variant={previewCtx.source === 'live' ? 'default' : 'secondary'} className="text-[10px]">
                  {previewCtx.source === 'live' ? 'dados reais' : 'amostra'}
                </Badge>
              )}
            </div>

            {/* Resumo */}
            {page && previewCtx && (
              <div className="space-y-1.5 rounded-md border bg-card p-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground">Rota:</span>
                  <code className="rounded bg-muted px-1 py-0.5">{page.route}</code>
                  <span className="text-muted-foreground">· Seção:</span>
                  <code className="rounded bg-muted px-1 py-0.5">{section || '—'}</code>
                </div>

                {def.inputs.length > 0 && (
                  <div className="space-y-1 border-t pt-1.5">
                    {def.inputs.map((inp) => {
                      const fieldKey = mapping[inp.key];
                      const opts = fieldOptions(inp.source) as any[];
                      const fieldLabel = opts.find((o) => o.key === fieldKey)?.label ?? fieldKey ?? '—';
                      const fmt = inp.source === 'kpis' ? (page.schema.kpis?.find((k) => k.key === fieldKey)?.format) : undefined;
                      return (
                        <div key={inp.key} className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{inp.source}</Badge>
                          <span className="text-muted-foreground">{inp.label}:</span>
                          <span className="font-medium">{fieldLabel}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-semibold text-primary">{describeMappedValue(inp.source, fieldKey, previewCtx, fmt)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t pt-1.5">
                  <div className="text-muted-foreground mb-1">Filtros:</div>
                  {filtroChips.length === 0 ? (
                    <div className="text-muted-foreground italic">
                      {previewCtx.source === 'live'
                        ? 'Nenhum filtro ativo no momento.'
                        : 'Os filtros ativos da página alvo serão aplicados automaticamente.'}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {filtroChips.map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-[10px] font-normal">
                          {k}: {Array.isArray(v) ? v.join(', ') : String(v)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Render visual */}
            <div className="rounded-md border bg-muted/10 p-2">
              <div className="max-h-64 overflow-hidden pointer-events-none">
                {previewNode}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={!canSave || saving}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {saving ? 'Salvando…' : (authed === false ? 'Faça login para aplicar' : 'Aplicar à página')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
