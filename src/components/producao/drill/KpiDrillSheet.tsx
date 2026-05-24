import { useState, useCallback } from 'react';
import { DrillSheet, DrillSheetFilterChip } from '@/components/bi/drill/DrillSheet';
import { DataTable, Column } from '@/components/erp/DataTable';

/**
 * Sheet lateral padrão para drill-down de KPI em páginas de Produção.
 * Reaproveita o DataTable do projeto, mostrando os registros relevantes
 * para a métrica clicada.
 */
interface Props<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  chips?: DrillSheetFilterChip[];
  rows: T[];
  columns: Column<T>[];
  emptyMessage?: string;
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
}: Props<T>) {
  return (
    <DrillSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      subtitle={subtitle}
      chips={chips}
    >
      <DataTable
        columns={columns}
        data={rows}
        emptyMessage={emptyMessage}
      />
    </DrillSheet>
  );
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
  const [state, setState] = useState<KpiDrillState<T>>({
    open: false,
    title: '',
    rows: [],
    columns: defaultColumns,
  });

  const open = useCallback(
    (payload: Omit<KpiDrillState<T>, 'open' | 'columns'> & { columns?: Column<T>[] }) =>
      setState({
        open: true,
        title: payload.title,
        subtitle: payload.subtitle,
        chips: payload.chips,
        rows: payload.rows,
        columns: payload.columns ?? defaultColumns,
      }),
    [defaultColumns],
  );

  const setOpen = useCallback(
    (o: boolean) => setState((s) => ({ ...s, open: o })),
    [],
  );

  return { state, open, setOpen };
}
