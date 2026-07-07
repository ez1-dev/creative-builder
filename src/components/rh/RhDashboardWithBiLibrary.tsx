/**
 * Helper que embrulha o RhDashboardGrid com PageDataProvider e o diálogo de
 * configuração de widgets, reduzindo o boilerplate em cada página RH.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { RhDashboardGrid } from './RhDashboardGrid';
import { ConfigureRhWidgetDialog } from './ConfigureRhWidgetDialog';
import { AddRhBiWidgetDialog } from './AddRhBiWidgetDialog';
import { PageDataProvider } from '@/lib/bi/PageDataContext';
import { UserWidgetsSlot } from '@/components/bi';
import type { RhWidget } from '@/hooks/useRhModuleLayout';
import type { RhWidgetDef } from '@/lib/rh/widgetCatalogs';
import { rhSeriesToOptions, rhSeriesToRecord, type RhSerie } from '@/lib/rh/seriesAdapter';
import { getPage } from '@/lib/bi/pageRegistry';

const toLabel = (key: string) => key
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (c) => c.toUpperCase());

interface LayoutApi {
  widgets: RhWidget[];
  editing: boolean;
  layoutReady: boolean;
  saveGeometries: (next: any) => void;
  hideWidget: (t: string) => void;
  deleteWidget: (t: string) => Promise<void> | void;
  configureWidget: (t: string, p: any) => Promise<void> | void;
  addWidget: (p: { componentId: string; title: string; mapping: Record<string, string> }) => Promise<void> | void;
}

interface Props {
  pageKey: string;
  layout: LayoutApi;
  blocks: Record<string, ReactNode>;
  catalog?: Record<string, RhWidgetDef>;
  kpis?: Record<string, any> | null;
  /**
   * Aceita o novo contrato uniforme RH — array `{ chave, label, pontos }` —
   * ou o formato antigo `Record<chave, pontos>` para retrocompatibilidade.
   */
  series?: RhSerie[] | Record<string, any> | null;
  /**
   * Séries derivadas pelo frontend (fallback). São mescladas depois das do
   * backend — só preenchem chaves que ainda não existirem no catálogo.
   */
  derivedSeries?: RhSerie[] | null;
  rows?: any[] | null;
  filtros?: Record<string, any> | null;
}

export function RhDashboardWithBiLibrary({
  pageKey, layout, blocks, catalog, kpis, series, derivedSeries, rows, filtros,
}: Props) {
  const [configTarget, setConfigTarget] = useState<RhWidget | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const configurableTypes = catalog
    ? Object.keys(catalog).filter((t) => (catalog[t]?.libraryComponentIds?.length ?? 0) > 0)
    : undefined;
  const allowed = configTarget && catalog ? catalog[configTarget.type]?.libraryComponentIds : undefined;

  useEffect(() => {
    const handleOpenAdd = (event: Event) => {
      const detail = (event as CustomEvent<{ pageKey?: string }>).detail;
      if (detail?.pageKey === pageKey) setAddOpen(true);
    };
    window.addEventListener('rh:add-bi-widget', handleOpenAdd);
    return () => window.removeEventListener('rh:add-bi-widget', handleOpenAdd);
  }, [pageKey]);

  // Rótulos oficiais declarados no pageRegistry — usados quando a série
  // vem do backend em formato record (sem label próprio).
  const pageDef = getPage(pageKey);
  const schemaLabel = (key: string) =>
    pageDef?.schema.series?.find((s) => s.key === key)?.label ?? toLabel(key);

  // Backend `series` (formato uniforme ou legado) tem prioridade; derivadas
  // do frontend só preenchem chaves ausentes.
  const isSeriesArray = Array.isArray(series);
  const backendRecord: Record<string, any> = isSeriesArray
    ? rhSeriesToRecord(series as RhSerie[])
    : ((series as any) ?? {});
  const backendCatalog = isSeriesArray
    ? rhSeriesToOptions(series as RhSerie[])
    : Object.keys(backendRecord).map((key) => ({ key, label: schemaLabel(key) }));

  const derived = derivedSeries ?? [];
  const seriesRecord: Record<string, any> = { ...backendRecord };
  const seriesCatalog = [...backendCatalog];
  derived.forEach((s) => {
    if (s?.chave && !(s.chave in seriesRecord)) {
      seriesRecord[s.chave] = s.pontos ?? [];
      seriesCatalog.push({ key: s.chave, label: s.label || schemaLabel(s.chave) });
    }
  });
  const finalCatalog = seriesCatalog.length ? seriesCatalog : undefined;

  return (
    <>
      <PageDataProvider
        pageKey={pageKey}
        kpis={kpis as any}
        series={seriesRecord}
        seriesCatalog={finalCatalog}
        rows={rows as any}
        filtros={filtros as any}
      >
        <RhDashboardGrid
          loading={!layout.layoutReady}
          widgets={layout.widgets}
          blocks={blocks}
          editing={layout.editing}
          configurableTypes={configurableTypes}
          onLayoutChange={layout.saveGeometries}
          onHide={layout.hideWidget}
          onConfigure={(type) => setConfigTarget(layout.widgets.find((w) => w.type === type) ?? null)}
          onDelete={layout.deleteWidget}
        />

        {/* Widgets aplicados pelo usuário via /biblioteca-bi (persistidos em bi_user_widgets) */}
        <div className="mt-4 space-y-4">
          <UserWidgetsSlot section="kpis" cols={4} emptyHint={false} />
          <UserWidgetsSlot section="charts" cols={3} emptyHint={false} />
          <UserWidgetsSlot section="tables" cols={2} emptyHint={false} />
        </div>


        <ConfigureRhWidgetDialog
          open={!!configTarget}
          onOpenChange={(v) => !v && setConfigTarget(null)}
          pageKey={pageKey}
          widget={configTarget}
          allowedComponentIds={allowed}
          onSave={(patch) => configTarget && layout.configureWidget(configTarget.type, patch)}
          onDelete={layout.deleteWidget}
        />

        <AddRhBiWidgetDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          pageKey={pageKey}
          onAdd={layout.addWidget}
        />
      </PageDataProvider>
    </>
  );
}
