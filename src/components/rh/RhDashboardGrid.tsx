/**
 * Grid editável para páginas RH — wrapper fino sobre PassagensLayoutGrid,
 * reaproveitando a lógica de drag/resize/edit.
 *
 * Suporta widgets custom-* (ou canônicos com componentId setado) renderizando
 * o componente da Biblioteca BI correspondente, consumindo dados do
 * PageDataContext quando presente.
 */
import { useMemo, type ReactNode } from 'react';
import { PassagensLayoutGrid } from '@/components/passagens/PassagensLayoutGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { RhWidget } from '@/hooks/useRhModuleLayout';
import { usePageData } from '@/lib/bi/PageDataContext';
import { getComponent } from '@/lib/bi/componentRegistry';
import { buildEffectiveSchema, mappingHasOrphans } from '@/lib/rh/dialogSchema';

interface Props {
  widgets: RhWidget[];
  blocks: Record<string, ReactNode>;
  editing: boolean;
  configurableTypes?: string[];
  onLayoutChange?: (next: { type: string; layout: { x: number; y: number; w: number; h: number } }[]) => void;
  onHide?: (type: string) => void;
  onConfigure?: (type: string) => void;
  onDelete?: (type: string) => void;
  loading?: boolean;
  skeletonHeight?: number;
}

function compactVerticalLayout(widgets: RhWidget[]): RhWidget[] {
  const visible = widgets.filter((w) => !w.hidden);
  const sorted = [...visible].sort((a, b) => {
    if (a.layout.y !== b.layout.y) return a.layout.y - b.layout.y;
    if (a.layout.x !== b.layout.x) return a.layout.x - b.layout.x;
    return a.position - b.position;
  });
  const placed: { x: number; y: number; w: number; h: number; type: string }[] = [];
  const nextByType = new Map<string, { x: number; y: number; w: number; h: number }>();
  for (const w of sorted) {
    const { x, w: width, h } = w.layout;
    let y = 0;
    for (const p of placed) {
      const overlapsX = x < p.x + p.w && p.x < x + width;
      if (!overlapsX) continue;
      const bottom = p.y + p.h;
      if (bottom > y) y = bottom;
    }
    placed.push({ x, y, w: width, h, type: w.type });
    nextByType.set(w.type, { x, y, w: width, h });
  }
  return widgets.map((w) => {
    const nl = nextByType.get(w.type);
    return nl ? { ...w, layout: nl } : w;
  });
}

export function RhDashboardGrid({ loading, skeletonHeight = 600, widgets, editing, blocks, configurableTypes, ...rest }: Props) {
  const ctx = usePageData();
  const effectiveSchema = useMemo(
    () => buildEffectiveSchema(ctx?.page, ctx),
    [ctx],
  );

  const effectiveWidgets = useMemo(
    () => (editing ? widgets : compactVerticalLayout(widgets)),
    [widgets, editing],
  );

  // Blocks augmentados: para widgets com componentId, renderiza via BI Library.
  const effectiveBlocks = useMemo<Record<string, ReactNode>>(() => {
    const out: Record<string, ReactNode> = { ...blocks };
    for (const w of widgets) {
      if (w.componentId) {
        const def = getComponent(w.componentId);
        if (!def) continue;
        const title = w.customTitle ?? w.title;
        // Se o mapping salvo aponta para chaves órfãs (ex.: layout antigo),
        // remapeia com autoMap sobre o schema efetivo para evitar render vazio.
        const savedMapping = w.mapping ?? {};
        const mapping = mappingHasOrphans(def, savedMapping, effectiveSchema)
          ? { ...def.autoMap(effectiveSchema), ...Object.fromEntries(
              Object.entries(savedMapping).filter(([k, v]) => {
                const inp = def.inputs.find((i) => i.key === k);
                if (!inp || !v) return false;
                const bag = inp.source === 'kpis' ? effectiveSchema.kpis : inp.source === 'series' ? effectiveSchema.series : null;
                return !bag || bag.some((o) => o.key === v);
              })
            ) }
          : savedMapping;
        const options = w.options ?? {};
        out[w.type] = (
          <Card className="h-full">
            <CardContent className="pt-4 h-full overflow-hidden">
              {def.render({
                title,
                mapping,
                options: { ...options, filtros: ctx?.filtros ?? {} },
                ctx: {
                  kpis: ctx?.kpis ?? {},
                  series: ctx?.series ?? {},
                  rows: Array.isArray(ctx?.rows) ? ctx!.rows : [],
                },
              })}
            </CardContent>
          </Card>
        );
      } else if (w.type.startsWith('custom-') && !out[w.type]) {
        out[w.type] = (
          <Card className="h-full">
            <CardContent className="pt-6 text-xs text-muted-foreground">
              Widget custom sem componente configurado. Clique em ⚙ para configurar.
            </CardContent>
          </Card>
        );
      }
    }
    return out;
  }, [blocks, widgets, ctx, effectiveSchema]);

  // Todo widget custom-* é configurável; canônicos passam via prop.
  const effectiveConfigurableTypes = useMemo(() => {
    const s = new Set(configurableTypes ?? []);
    for (const w of widgets) if (w.type.startsWith('custom-')) s.add(w.type);
    return Array.from(s);
  }, [configurableTypes, widgets]);

  if (loading) {
    return <Skeleton className="w-full rounded-lg" style={{ height: skeletonHeight }} />;
  }
  return (
    <PassagensLayoutGrid
      {...(rest as any)}
      blocks={effectiveBlocks as any}
      widgets={effectiveWidgets as any}
      editing={editing}
      configurableTypes={effectiveConfigurableTypes}
      density="compact"
    />
  );
}
