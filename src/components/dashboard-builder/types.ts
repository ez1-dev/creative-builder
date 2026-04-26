export type WidgetType = 'kpi' | 'bar' | 'line' | 'area' | 'pie' | 'treemap' | 'scatter' | 'table';

export type Aggregation = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct' | 'catalog_count';

export interface WidgetConfig {
  metric?: Aggregation;
  field?: string;
  dimension?: string;
  granularity?: 'day' | 'month' | 'year';
  limit?: number;
  format?: 'currency' | 'number';
  color?: string;
}

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  layout: WidgetLayout;
  position: number;
}

export interface Dashboard {
  id: string;
  module: string;
  name: string;
  is_default: boolean;
  owner_id: string | null;
  position: number;
}

export interface CrossFilter {
  field: string;
  value: string;
}

export interface DataSourceField {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'date';
}
