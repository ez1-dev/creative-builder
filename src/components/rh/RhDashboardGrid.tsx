/**
 * Grid editável para páginas RH — wrapper fino sobre PassagensLayoutGrid,
 * reaproveitando a lógica de drag/resize/edit.
 */
import type { ReactNode } from 'react';
import { PassagensLayoutGrid } from '@/components/passagens/PassagensLayoutGrid';
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
}

export function RhDashboardGrid(props: Props) {
  return <PassagensLayoutGrid {...(props as any)} />;
}
