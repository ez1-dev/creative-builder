/**
 * Slot que renderiza widgets que o usuário aplicou a uma página/seção.
 *
 * Lê dados via PageDataContext (kpis, series, rows) — então cada widget
 * recalcula automaticamente quando os filtros da página mudam.
 */
import { useUserWidgets } from '@/hooks/useUserWidgets';
import { usePageData } from '@/lib/bi/PageDataContext';
import { getComponent } from '@/lib/bi/componentRegistry';
import { UserWidgetFrame } from './UserWidgetFrame';
import { LoadingState } from '../states/LoadingState';

export function UserWidgetsSlot({
  section,
  cols = 4,
  emptyHint = true,
}: {
  section: string;
  cols?: 1 | 2 | 3 | 4 | 6;
  emptyHint?: boolean;
}) {
  const ctx = usePageData();
  const { widgets, loading, refresh } = useUserWidgets(ctx?.pageKey ?? '__none__');

  if (!ctx) return null;
  if (loading) return <LoadingState message="Carregando widgets…" />;

  const items = widgets.filter((w) => w.section === section);
  if (!items.length) {
    if (!emptyHint) return null;
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
        Nenhum widget personalizado nesta seção. Vá em <span className="font-semibold text-primary">Biblioteca BI</span> e clique em
        “Aplicar em página…” para adicionar.
      </div>
    );
  }

  const colsCls =
    cols === 1 ? 'grid-cols-1'
      : cols === 2 ? 'grid-cols-1 md:grid-cols-2'
      : cols === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      : cols === 6 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={`grid gap-3 ${colsCls}`}>
      {items.map((w) => {
        const def = getComponent(w.component_id);
        if (!def) return null;
        if (import.meta.env.DEV) {
          for (const inp of def.inputs) {
            const fk = w.mapping?.[inp.key];
            if (!fk) continue;
            const bag =
              inp.source === 'kpis' ? ctx.kpis :
              inp.source === 'series' ? ctx.series :
              null;
            if (bag && !(fk in bag)) {
              // eslint-disable-next-line no-console
              console.warn(`[BI] Widget "${w.title ?? def.label}" (${w.component_id}) refere-se a ${inp.source}.${fk} que não existe em PageDataContext da página "${ctx.pageKey}".`);
            }
          }
        }
        return (
          <UserWidgetFrame key={w.id} id={w.id} span={w.span as 1 | 2 | 3 | 4} onChanged={refresh}>
            {def.render({
              title: w.title ?? undefined,
              mapping: w.mapping ?? {},
              options: w.options ?? {},
              ctx: { kpis: ctx.kpis, series: ctx.series, rows: ctx.rows },
            })}
          </UserWidgetFrame>
        );
      })}
    </div>
  );
}
