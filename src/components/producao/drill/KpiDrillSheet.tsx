import { useCallback, useMemo, useState } from 'react';
import {
  DrillSheet,
  DrillSheetFilterChip,
  DrillLevel,
  OpenOptions,
} from '@/components/bi/drill/DrillSheet';
import { DataTable, Column } from '@/components/erp/DataTable';

/**
 * Sheet lateral padrão para drill-down de KPI em páginas de Produção.
 * Suporta navegação por pilha (breadcrumb + Voltar) e restauração
 * automática de filtros ao fechar.
 */

export interface KpiDrillLevel<T> {
  title: string;
  subtitle?: string;
  chips?: DrillSheetFilterChip[];
  rows: T[];
  columns?: Column<T>[];
}

interface InternalLevel<T> extends Required<Pick<KpiDrillLevel<T>, 'rows' | 'columns' | 'title'>> {
  subtitle?: string;
  chips?: DrillSheetFilterChip[];
}

interface InternalState<T> {
  open: boolean;
  levels: InternalLevel<T>[];
  restore?: () => void;
}

export interface KpiDrillState<T> {
  open: boolean;
  title: string;
  subtitle?: string;
  chips?: DrillSheetFilterChip[];
  rows: T[];
  columns: Column<T>[];
}

export function useKpiDrill<T>(defaultColumns: Column<T>[]) {
  const [internal, setInternal] = useState<InternalState<T>>({ open: false, levels: [] });

  const toInternal = useCallback(
    (lv: KpiDrillLevel<T>): InternalLevel<T> => ({
      title: lv.title,
      subtitle: lv.subtitle,
      chips: lv.chips,
      rows: lv.rows,
      columns: lv.columns ?? defaultColumns,
    }),
    [defaultColumns],
  );

  const open = useCallback(
    (level: KpiDrillLevel<T>, opts?: OpenOptions) =>
      setInternal({ open: true, levels: [toInternal(level)], restore: opts?.restore }),
    [toInternal],
  );

  const push = useCallback(
    (level: KpiDrillLevel<T>) =>
      setInternal((s) => ({ ...s, levels: [...s.levels, toInternal(level)] })),
    [toInternal],
  );

  const pop = useCallback(() => {
    setInternal((s) => {
      if (s.levels.length <= 1) {
        s.restore?.();
        return { open: false, levels: [], restore: undefined };
      }
      return { ...s, levels: s.levels.slice(0, -1) };
    });
  }, []);

  const goTo = useCallback((index: number) => {
    setInternal((s) => ({ ...s, levels: s.levels.slice(0, Math.max(1, index + 1)) }));
  }, []);

  const close = useCallback(() => {
    setInternal((s) => {
      s.restore?.();
      return { open: false, levels: [], restore: undefined };
    });
  }, []);

  const setOpen = useCallback(
    (o: boolean) => {
      if (o) setInternal((s) => ({ ...s, open: true }));
      else close();
    },
    [close],
  );

  const current = internal.levels[internal.levels.length - 1];

  const state: KpiDrillState<T> = useMemo(
    () => ({
      open: internal.open,
      title: current?.title ?? '',
      subtitle: current?.subtitle,
      chips: current?.chips,
      rows: current?.rows ?? [],
      columns: current?.columns ?? defaultColumns,
    }),
    [internal.open, current, defaultColumns],
  );

  const drillLevels: DrillLevel[] = useMemo(
    () =>
      internal.levels.map((lv) => ({
        title: lv.title,
        subtitle: lv.subtitle,
        chips: lv.chips,
        ctx: null,
      })),
    [internal.levels],
  );

  const sheetProps = useMemo(
    () => ({
      open: internal.open,
      onOpenChange: setOpen,
      title: state.title,
      subtitle: state.subtitle,
      chips: state.chips,
      rows: state.rows,
      columns: state.columns,
      levels: drillLevels,
      onBack: pop,
      onCrumbClick: goTo,
    }),
    [internal.open, setOpen, state, drillLevels, pop, goTo],
  );

  return { state, levels: internal.levels, current, open, push, pop, goTo, close, setOpen, sheetProps };
}

interface Props<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  chips?: DrillSheetFilterChip[];
  rows: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  levels?: DrillLevel[];
  onBack?: () => void;
  onCrumbClick?: (index: number) => void;
  onRowClick?: (row: T) => void;
}

export function KpiDrillSheet<T>({
  open,
  onOpenChange,
  title,
  subtitle,
  chips,
  rows,
  columns,
  emptyMessage = 'Sem registros para detalhar.',
  levels,
  onBack,
  onCrumbClick,
  onRowClick,
}: Props<T>) {
  return (
    <DrillSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      subtitle={subtitle}
      chips={chips}
      levels={levels}
      onBack={onBack}
      onCrumbClick={onCrumbClick}
    >
      <DataTable
        columns={columns}
        data={rows}
        emptyMessage={emptyMessage}
        onRowClick={onRowClick}
      />
    </DrillSheet>
  );
}
