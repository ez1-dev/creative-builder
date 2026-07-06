/**
 * Grid editável para páginas RH — wrapper fino sobre PassagensLayoutGrid,
 * reaproveitando a lógica de drag/resize/edit.
 *
 * Diferenças do módulo Passagens:
 *  - densidade `compact` (margens/rowHeight menores) para dashboards densos.
 *  - compactação vertical em modo visualização: reescreve `y` para eliminar
 *    "vãos" verticais entre widgets sem alterar o layout salvo no banco.
 *
 * Quando `loading===true` (layout ainda não carregado do banco), renderiza
 * um placeholder para evitar o flash de tamanho padrão nos cards.
 */
import { useMemo, type ReactNode } from 'react';
import { PassagensLayoutGrid } from '@/components/passagens/PassagensLayoutGrid';
import { Skeleton } from '@/components/ui/skeleton';
import type { RhWidget } from '@/hooks/useRhModuleLayout';

interface Props {
  widgets: RhWidget[];
  blocks: Record<string, ReactNode>;
  editing: boolean;
  configurableTypes?: string[];
  onLayoutChange?: (next: { type: string; layout: { x: number; y: number; w: number; h: number } }[]) => void;
  onHide?: (type: string) => void;
  onConfigure?: (type: string) => void;
  onDelete?: (type: string) => void;
  /** Se true, esconde o grid e mostra um skeleton — evita paint com defaults antes do load do banco. */
  loading?: boolean;
  /** Altura do skeleton em px (default 600). */
  skeletonHeight?: number;
}

/**
 * Reescreve o `y` de cada widget para o menor valor possível respeitando
 * colisões horizontais com widgets já posicionados. Preserva x/w/h.
 *
 * Chamada apenas em modo visualização — em edição a posição bruta é a fonte
 * da verdade para não brigar com o drag do usuário.
 */
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

export function RhDashboardGrid({ loading, skeletonHeight = 600, widgets, editing, ...rest }: Props) {
  const effectiveWidgets = useMemo(
    () => (editing ? widgets : compactVerticalLayout(widgets)),
    [widgets, editing],
  );

  if (loading) {
    return <Skeleton className="w-full rounded-lg" style={{ height: skeletonHeight }} />;
  }
  return (
    <PassagensLayoutGrid
      {...(rest as any)}
      widgets={effectiveWidgets as any}
      editing={editing}
      density="compact"
    />
  );
}
