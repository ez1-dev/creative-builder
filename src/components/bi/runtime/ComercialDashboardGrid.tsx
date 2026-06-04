/**
 * Wrapper fino sobre o grid de Passagens — reaproveita toda a lógica de
 * drag/resize/edit do PassagensLayoutGrid, com tipo adaptado para os widgets
 * do BI Comercial (mesma forma: id/type/title/position/layout/hidden/...).
 */
import type { ReactNode } from 'react';
import { PassagensLayoutGrid } from '@/components/passagens/PassagensLayoutGrid';
import type { ComercialWidget } from '@/hooks/useComercialLayout';

interface Props {
  widgets: ComercialWidget[];
  blocks: Record<string, ReactNode>;
  editing: boolean;
  configurableTypes?: string[];
  onLayoutChange?: (next: { type: string; layout: { x: number; y: number; w: number; h: number } }[]) => void;
  onHide?: (type: string) => void;
  onConfigure?: (type: string) => void;
  onDelete?: (type: string) => void;
}

export function ComercialDashboardGrid(props: Props) {
  return <PassagensLayoutGrid {...(props as any)} />;
}
