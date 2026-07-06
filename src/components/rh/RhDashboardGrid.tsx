/**
 * Grid editável para páginas RH — wrapper fino sobre PassagensLayoutGrid,
 * reaproveitando a lógica de drag/resize/edit.
 *
 * Quando `loading===true` (layout ainda não carregado do banco), renderiza
 * um placeholder para evitar o flash de tamanho padrão nos cards.
 */
import type { ReactNode } from 'react';
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

export function RhDashboardGrid({ loading, skeletonHeight = 600, ...rest }: Props) {
  if (loading) {
    return <Skeleton className="w-full rounded-lg" style={{ height: skeletonHeight }} />;
  }
  return <PassagensLayoutGrid {...(rest as any)} />;
}
