/**
 * Modal "Onde aplicar este componente?"
 * Inclui pré-visualização do widget + resumo de filtros/dados antes de salvar.
 */
import { useEffect, useId, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAGE_REGISTRY, getPage, getSectionsForKind } from '@/lib/bi/pageRegistry';
import { getComponent } from '@/lib/bi/componentRegistry';
import { createUserWidget } from '@/hooks/useUserWidgets';
import { supabase } from '@/integrations/supabase/client';
import { usePageData } from '@/lib/bi/PageDataContext';
import { buildPreviewCtx, describeMappedValue } from '@/lib/bi/previewData';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Eye, LayoutGrid, BarChart3, Table as TableIcon, Gauge, Building2, Factory, Boxes, Palette, Database, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnidadeNegocio } from '@/lib/bi/comercialFilters';
import type {
  WidgetOptions, WidgetColor, WidgetVariant, WidgetDensity, WidgetHeight,
  WidgetValueFormat, WidgetComparacao, WidgetMeta, WidgetPeriodoOverride, WidgetSort,
} from '@/lib/bi/widgetOptions';
import { WidgetShell } from './WidgetShell';
import { HeatPaletteEditor } from '@/components/bi/maps/HeatPaletteEditor';
import { HEAT_COLOR_STOPS } from '@/lib/bi/mapUtils';

const HEAT_MAP_LIB_IDS = new Set(['brazil-heat-map', 'brazil-heat-map-comercial']);
function stopsEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v.toLowerCase() === b[i]?.toLowerCase());
}

const COLOR_SWATCHES: { value: WidgetColor; label: string; cls: string }[] = [
  { value: 'primary', label: 'Primary',  cls: 'bg-[hsl(var(--primary))]' },
  { value: 'success', label: 'Success',  cls: 'bg-[hsl(var(--success))]' },
  { value: 'warning', label: 'Warning',  cls: 'bg-[hsl(var(--warning))]' },
  { value: 'danger',  label: 'Danger',   cls: 'bg-[hsl(var(--destructive))]' },
  { value: 'info',    label: 'Info',     cls: 'bg-[hsl(var(--info,215_70%_45%))]' },
  { value: 'muted',   label: 'Neutro',   cls: 'bg-[hsl(var(--muted-foreground))]' },
];

const ICON_CHOICES = [
  'TrendingUp', 'TrendingDown', 'DollarSign', 'BarChart3', 'LineChart', 'PieChart',
  'Users', 'ShoppingCart', 'Package', 'Truck', 'Building2', 'Factory', 'Boxes',
  'Target', 'Zap', 'Activity', 'Gauge', 'Award', 'Star', 'CheckCircle2',
  'AlertTriangle', 'Clock', 'Calendar', 'MapPin', 'Globe', 'Percent',
  'CreditCard', 'Wallet', 'Receipt', 'FileText', 'Database', 'Layers',
];

type UnidadeOpt = UnidadeNegocio | '__page__';
const UNIDADES: { value: UnidadeOpt; label: string; sub: string; Icon: typeof Building2 }[] = [
  { value: '__page__',          label: 'Padrão da página',  sub: 'Usa o filtro atual da página', Icon: LayoutGrid },
  { value: 'GENIUS',            label: 'GENIUS',            sub: 'Revenda',     Icon: Building2 },
  { value: 'ESTRUTURAL ZORTEA', label: 'ESTRUTURAL ZORTEA', sub: 'Indústria',   Icon: Factory },
  { value: 'CONSOLIDADO',       label: 'CONSOLIDADO',       sub: 'Todas as UN', Icon: Boxes },
];

const KIND_ICON: Record<string, typeof Gauge> = {
  kpi: Gauge,
  chart: BarChart3,
  map: BarChart3,
  tree: BarChart3,
  table: TableIcon,
};

function BlocoCard({
  section, selected, onSelect, idPrefix,
}: {
  section: { key: string; label: string; accepts: string[]; cols?: number };
  selected: boolean;
  onSelect: () => void;
  idPrefix: string;
}) {
  const primaryKind = section.accepts[0] ?? 'chart';
  const Icon = KIND_ICON[primaryKind] ?? LayoutGrid;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      id={`${idPrefix}-${section.key}`}
      onClick={onSelect}
      className={cn(
        'flex items-start gap-2 rounded-md border-2 bg-card p-2.5 text-left transition-all',
        'hover:border-primary/50 hover:bg-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border',
      )}
    >
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
        selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold leading-tight">{section.label}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          Aceita: {section.accepts.join(', ')}
        </div>
      </div>
      {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

export function ApplyComponentDialog({
  open, onOpenChange, componentId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  componentId: string | null;
}) {
  const uid = useId();
  const idPage = `${uid}-page`;
  const idSection = `${uid}-section`;
  const idTitle = `${uid}-title`;
  const idSpan = `${uid}-span`;
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
  const [unidadeNegocio, setUnidadeNegocio] = useState<UnidadeOpt>('__page__');
  // ----- Aparência -----
  const [color, setColor] = useState<WidgetColor | undefined>(undefined);
  const [variant, setVariant] = useState<WidgetVariant>('solid');
  const [icon, setIcon] = useState<string>('');
  const [valueFormat, setValueFormat] = useState<WidgetValueFormat>('auto');
  const [density, setDensity] = useState<WidgetDensity>('default');
  const [height, setHeight] = useState<WidgetHeight>('md');
  const [hideTitle, setHideTitle] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [footerNote, setFooterNote] = useState('');
  // ----- Dados -----
  const [periodoTipo, setPeriodoTipo] = useState<'__page__' | WidgetPeriodoOverride['tipo']>('__page__');
  const [periodoN, setPeriodoN] = useState<number>(3);
  const [periodoIni, setPeriodoIni] = useState<string>('');
  const [periodoFim, setPeriodoFim] = useState<string>('');
  const [comparacao, setComparacao] = useState<WidgetComparacao>('nenhuma');
  const [metaTipo, setMetaTipo] = useState<'__none__' | 'valor' | 'kpi'>('__none__');
  const [metaValor, setMetaValor] = useState<number>(0);
  const [metaKpi, setMetaKpi] = useState<string>('');
  const [topN, setTopN] = useState<number>(0); // 0 = todos
  const [sort, setSort] = useState<WidgetSort | '__none__'>('__none__');

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
    setColor(undefined); setVariant('solid'); setIcon(''); setValueFormat('auto');
    setDensity('default'); setHeight('md'); setHideTitle(false); setSubtitle(''); setFooterNote('');
    setPeriodoTipo('__page__'); setPeriodoN(3); setPeriodoIni(''); setPeriodoFim('');
    setComparacao('nenhuma'); setMetaTipo('__none__'); setMetaValor(0); setMetaKpi('');
    setTopN(0); setSort('__none__');
    const liveUn = liveCtx?.filtros?.unidade_negocio as UnidadeNegocio | undefined;
    if (initial?.supportsUnidadeNegocio && liveUn && UNIDADES.some((u) => u.value === liveUn)) {
      setUnidadeNegocio(liveUn);
    } else {
      setUnidadeNegocio('__page__');
    }
  }, [open, def, compatiblePages, liveCtx?.pageKey, liveCtx?.filtros]);

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

  // ----- Build options -----
  const builtOptions = useMemo<WidgetOptions>(() => {
    const o: WidgetOptions = {};
    if (unidadeNegocio !== '__page__') o.unidade_negocio = unidadeNegocio;
    if (color) o.color = color;
    if (variant && variant !== 'solid') o.variant = variant;
    if (icon) o.icon = icon;
    if (valueFormat && valueFormat !== 'auto') o.valueFormat = valueFormat;
    if (density && density !== 'default') o.density = density;
    if (height && height !== 'md') o.height = height;
    if (hideTitle) o.hideTitle = true;
    if (subtitle.trim()) o.subtitle = subtitle.trim();
    if (footerNote.trim()) o.footerNote = footerNote.trim();
    if (periodoTipo !== '__page__') {
      const po: WidgetPeriodoOverride = { tipo: periodoTipo };
      if (periodoTipo === 'ultimos_n_meses') po.n = Math.max(1, periodoN);
      if (periodoTipo === 'custom') { po.ini = periodoIni; po.fim = periodoFim; }
      o.periodo_override = po;
    }
    if (comparacao !== 'nenhuma') o.comparacao = comparacao;
    if (metaTipo === 'valor') o.meta = { tipo: 'valor', valor: metaValor } as WidgetMeta;
    if (metaTipo === 'kpi' && metaKpi) o.meta = { tipo: 'kpi', kpiKey: metaKpi } as WidgetMeta;
    if (topN > 0) o.topN = topN;
    if (sort !== '__none__') o.sort = sort;
    return o;
  }, [unidadeNegocio, color, variant, icon, valueFormat, density, height, hideTitle, subtitle, footerNote, periodoTipo, periodoN, periodoIni, periodoFim, comparacao, metaTipo, metaValor, metaKpi, topN, sort]);

  // ----- Preview -----
  const previewCtx = useMemo(() => (page ? buildPreviewCtx(page, liveCtx) : null), [page, liveCtx]);
  const previewNode = useMemo(() => {
    if (!page || !previewCtx) return null;
    try {
      const rendered = def.render({
        title: hideTitle ? '' : (title || def.label),
        mapping,
        ctx: { kpis: previewCtx.kpis, series: previewCtx.series, rows: previewCtx.rows },
        options: builtOptions,
      });
      return <WidgetShell options={builtOptions}>{rendered}</WidgetShell>;
    } catch (e) {
      return <div className="text-xs text-destructive">Erro no preview: {(e as Error).message}</div>;
    }
  }, [def, page, previewCtx, mapping, title, builtOptions, hideTitle]);

  const filtroChips = useMemo(() => {
    const f = previewCtx?.filtros ?? {};
    return Object.entries(f ?? {}).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0));
  }, [previewCtx]);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const options: Record<string, any> = { ...builtOptions };
      await createUserWidget({
        page_key: pageKey, section, component_id: def.id,
        title: title || null, span, ordem, mapping, options,
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
            <Tabs defaultValue="onde">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="onde" className="text-xs"><MapPin className="h-3.5 w-3.5 mr-1" />Onde</TabsTrigger>
                <TabsTrigger value="aparencia" className="text-xs"><Palette className="h-3.5 w-3.5 mr-1" />Aparência</TabsTrigger>
                <TabsTrigger value="dados" className="text-xs"><Database className="h-3.5 w-3.5 mr-1" />Dados</TabsTrigger>
              </TabsList>

              {/* ===== Onde ===== */}
              <TabsContent value="onde" className="space-y-3 pt-3">
                <div className="space-y-1">
                  <Label htmlFor={idPage} className="text-xs">Página alvo</Label>
                  <Select value={pageKey} onValueChange={setPageKey}>
                    <SelectTrigger id={idPage} name="target-page" aria-label="Página alvo"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      {compatiblePages.map((p) => (
                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Bloco da página</Label>
                  {availableSections.length === 0 ? (
                    <div className="flex items-start gap-2 rounded-md border-2 border-destructive/50 bg-destructive/10 p-2.5 text-xs text-destructive">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Nenhum bloco compatível</div>
                        <div className="text-[11px] opacity-90">Esta página não aceita componentes do tipo "{def.kind}". Escolha outra página alvo.</div>
                      </div>
                    </div>
                  ) : (
                    <div role="radiogroup" aria-label="Bloco da página" className="grid grid-cols-1 gap-1.5">
                      {availableSections.map((s) => (
                        <BlocoCard key={s.key} section={s as any} selected={section === s.key} onSelect={() => setSection(s.key)} idPrefix={idSection} />
                      ))}
                    </div>
                  )}
                </div>

                {def.inputs.length > 0 && page && (
                  <div className="space-y-2 rounded-md border bg-muted/20 p-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mapeamento de dados</div>
                    {def.inputs.map((inp) => {
                      const opts = fieldOptions(inp.source);
                      const hasOptions = opts.length > 0;
                      const inpId = `${uid}-input-${inp.key}`;
                      return (
                        <div key={inp.key} className="space-y-1">
                          <Label htmlFor={inpId} className="text-xs">
                            {inp.label} {inp.required && <span className="text-destructive">*</span>}
                          </Label>
                          {hasOptions ? (
                            <Select value={mapping[inp.key] ?? ''} onValueChange={(v) => setMapping((m) => ({ ...m, [inp.key]: v }))}>
                              <SelectTrigger id={inpId} name={`input-${inp.key}`} aria-label={inp.label} className="h-8 text-xs"><SelectValue placeholder="Selecione campo…" /></SelectTrigger>
                              <SelectContent>
                                {opts.map((o: any) => (
                                  <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input id={inpId} name={`input-${inp.key}`} className="h-8 text-xs" placeholder={`Nome do campo (${inp.source})`} value={mapping[inp.key] ?? ''} onChange={(e) => setMapping((m) => ({ ...m, [inp.key]: e.target.value }))} />
                          )}
                        </div>
                      );
                    })}
                    {(!page?.schema.kpis?.length && !page?.schema.series?.length && !page?.schema.rows) && (
                      <div className="text-[10px] text-muted-foreground italic pt-1">
                        Esta página aceita qualquer componente. Digite manualmente o nome do campo de dados — ele será resolvido em runtime quando a página publicar dados.
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1 col-span-2">
                    <Label htmlFor={idTitle} className="text-xs">Título (opcional)</Label>
                    <Input id={idTitle} name="widget-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={def.label} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={idSpan} className="text-xs">Largura</Label>
                    <Select value={String(span)} onValueChange={(v) => setSpan(Number(v))}>
                      <SelectTrigger id={idSpan} name="widget-span" aria-label="Largura" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 col</SelectItem>
                        <SelectItem value="2">2 cols</SelectItem>
                        <SelectItem value="3">3 cols</SelectItem>
                        <SelectItem value="4">4 cols</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Posição (ordem)</Label>
                  <Input type="number" className="h-8 text-xs" value={ordem} onChange={(e) => setOrdem(Number(e.target.value) || 0)} placeholder="0 = primeiro" />
                </div>
              </TabsContent>

              {/* ===== Aparência ===== */}
              <TabsContent value="aparencia" className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Cor de destaque</Label>
                  <div className="grid grid-cols-6 gap-1.5">
                    <button type="button" onClick={() => setColor(undefined)} className={cn('h-9 rounded-md border-2 text-[10px]', !color ? 'border-primary' : 'border-border')}>—</button>
                    {COLOR_SWATCHES.map((c) => (
                      <button key={c.value} type="button" aria-label={c.label} onClick={() => setColor(c.value)} className={cn('h-9 rounded-md border-2 flex items-center justify-center', color === c.value ? 'border-primary ring-2 ring-primary/30' : 'border-border')}>
                        <span className={cn('h-5 w-5 rounded', c.cls)} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Variante visual</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['solid', 'outline', 'ghost', 'gradient'] as WidgetVariant[]).map((v) => (
                      <button key={v} type="button" onClick={() => setVariant(v)} className={cn('h-8 rounded-md border-2 text-[11px] capitalize', variant === v ? 'border-primary bg-primary/5' : 'border-border')}>{v}</button>
                    ))}
                  </div>
                </div>

                {def.kind === 'kpi' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Ícone (opcional)</Label>
                    <Select value={icon || '__none__'} onValueChange={(v) => setIcon(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="__none__">— Nenhum</SelectItem>
                        {ICON_CHOICES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Formato</Label>
                    <Select value={valueFormat} onValueChange={(v) => setValueFormat(v as WidgetValueFormat)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="currency">Moeda</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="percent">Percentual</SelectItem>
                        <SelectItem value="compact">Compacto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Densidade</Label>
                    <Select value={density} onValueChange={(v) => setDensity(v as WidgetDensity)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compacto</SelectItem>
                        <SelectItem value="default">Padrão</SelectItem>
                        <SelectItem value="comfortable">Confortável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Altura</Label>
                    <Select value={height} onValueChange={(v) => setHeight(v as WidgetHeight)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">Pequena</SelectItem>
                        <SelectItem value="md">Média</SelectItem>
                        <SelectItem value="lg">Grande</SelectItem>
                        <SelectItem value="xl">XG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border p-2">
                  <Label htmlFor="hide-title" className="text-xs">Esconder título do card</Label>
                  <Switch id="hide-title" checked={hideTitle} onCheckedChange={setHideTitle} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Subtítulo (opcional)</Label>
                  <Input className="h-8 text-xs" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Texto abaixo do título" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Rodapé / Nota / Fonte</Label>
                  <Input className="h-8 text-xs" value={footerNote} onChange={(e) => setFooterNote(e.target.value)} placeholder="Ex.: Fonte: ERP — atualizado diariamente" />
                </div>
              </TabsContent>

              {/* ===== Dados ===== */}
              <TabsContent value="dados" className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Unidade de Negócio</Label>
                  <div role="radiogroup" aria-label="Unidade de Negócio" className="grid grid-cols-1 gap-1.5">
                    {UNIDADES.map((u) => {
                      const selected = unidadeNegocio === u.value;
                      return (
                        <button key={u.value} type="button" role="radio" aria-checked={selected} onClick={() => setUnidadeNegocio(u.value)}
                          className={cn('flex items-start gap-2 rounded-md border-2 bg-card p-2 text-left transition-all hover:border-primary/50 hover:bg-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            selected ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border')}>
                          <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                            <u.Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold leading-tight">{u.label}</div>
                            <div className="text-[10px] text-muted-foreground">{u.sub}</div>
                          </div>
                          {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 rounded-md border p-2">
                  <Label className="text-xs">Período sobreposto</Label>
                  <Select value={periodoTipo} onValueChange={(v) => setPeriodoTipo(v as any)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__page__">Padrão da página</SelectItem>
                      <SelectItem value="ultimos_n_meses">Últimos N meses</SelectItem>
                      <SelectItem value="mes_atual">Mês atual</SelectItem>
                      <SelectItem value="ano_atual">Ano atual</SelectItem>
                      <SelectItem value="custom">Custom (YYYYMM)</SelectItem>
                    </SelectContent>
                  </Select>
                  {periodoTipo === 'ultimos_n_meses' && (
                    <Input type="number" min={1} max={36} className="h-8 text-xs" value={periodoN} onChange={(e) => setPeriodoN(Number(e.target.value) || 3)} placeholder="N meses" />
                  )}
                  {periodoTipo === 'custom' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input className="h-8 text-xs" value={periodoIni} onChange={(e) => setPeriodoIni(e.target.value)} placeholder="Início YYYYMM" />
                      <Input className="h-8 text-xs" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} placeholder="Fim YYYYMM" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Comparação</Label>
                  <Select value={comparacao} onValueChange={(v) => setComparacao(v as WidgetComparacao)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Nenhuma</SelectItem>
                      <SelectItem value="periodo_anterior">vs Período anterior</SelectItem>
                      <SelectItem value="mesmo_periodo_ano_anterior">vs Mesmo período ano anterior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {def.kind === 'kpi' && (
                  <div className="space-y-1.5 rounded-md border p-2">
                    <Label className="text-xs">Meta</Label>
                    <Select value={metaTipo} onValueChange={(v) => setMetaTipo(v as any)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        <SelectItem value="valor">Valor fixo</SelectItem>
                        <SelectItem value="kpi">Apontar para KPI</SelectItem>
                      </SelectContent>
                    </Select>
                    {metaTipo === 'valor' && (
                      <Input type="number" className="h-8 text-xs" value={metaValor} onChange={(e) => setMetaValor(Number(e.target.value) || 0)} placeholder="Valor da meta" />
                    )}
                    {metaTipo === 'kpi' && (
                      <Select value={metaKpi} onValueChange={setMetaKpi}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione KPI…" /></SelectTrigger>
                        <SelectContent>
                          {(page?.schema.kpis ?? []).map((k) => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {(def.kind === 'chart' || def.kind === 'table') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Top N</Label>
                      <Select value={String(topN)} onValueChange={(v) => setTopN(Number(v))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Todos</SelectItem>
                          <SelectItem value="5">Top 5</SelectItem>
                          <SelectItem value="10">Top 10</SelectItem>
                          <SelectItem value="20">Top 20</SelectItem>
                          <SelectItem value="50">Top 50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ordenação</Label>
                      <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Original</SelectItem>
                          <SelectItem value="desc">Maior → menor</SelectItem>
                          <SelectItem value="asc">Menor → maior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
                  <span className="text-muted-foreground">· Bloco:</span>
                  <code className="rounded bg-muted px-1 py-0.5">
                    {availableSections.find((s) => s.key === section)?.label ?? section ?? '—'}
                  </code>
                  {page.supportsUnidadeNegocio && (
                    <>
                      <span className="text-muted-foreground">· Unidade:</span>
                      <Badge variant="default" className="text-[10px] font-semibold">{unidadeNegocio}</Badge>
                      <span className="text-[9px] text-muted-foreground italic">(override)</span>
                    </>
                  )}
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
