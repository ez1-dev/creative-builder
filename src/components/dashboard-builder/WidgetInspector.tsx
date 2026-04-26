import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { DashboardWidget, DataSourceField, Aggregation } from './types';

interface Props {
  widget: DashboardWidget;
  fields: DataSourceField[];
  onChange: (w: DashboardWidget) => void;
  onDelete: () => void;
}

const AGGS: { v: Aggregation; l: string }[] = [
  { v: 'sum', l: 'Soma' },
  { v: 'count', l: 'Contagem' },
  { v: 'avg', l: 'Média' },
  { v: 'min', l: 'Mínimo' },
  { v: 'max', l: 'Máximo' },
  { v: 'distinct', l: 'Únicos' },
  { v: 'catalog_count', l: 'Catálogo de colaboradores' },
];

export function WidgetInspector({ widget, fields, onChange, onDelete }: Props) {
  const set = (patch: Partial<DashboardWidget>) => onChange({ ...widget, ...patch });
  const setCfg = (patch: any) => set({ config: { ...widget.config, ...patch } });

  const isTable = widget.type === 'table';
  const showDimension = !isTable && widget.type !== 'kpi';
  const showMetric = !isTable;
  const showField = !isTable && (widget.type === 'kpi'
    ? !['count', 'catalog_count'].includes(widget.config.metric ?? 'sum')
    : true);
  const showLimit = !isTable && widget.type !== 'kpi';
  const showFormat = !isTable;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Propriedades</div>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div>
        <Label className="text-xs">Título</Label>
        <Input value={widget.title} onChange={(e) => set({ title: e.target.value })} />
      </div>

      {isTable && (
        <div>
          <Label className="text-xs">Agrupar por</Label>
          <Select
            value={widget.config.groupBy ?? '__none__'}
            onValueChange={(v) => setCfg({ groupBy: v === '__none__' ? undefined : v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem agrupamento</SelectItem>
              {fields.filter((f) => f.kind === 'text').map((f) =>
                <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {showDimension && (
        <div>
          <Label className="text-xs">Dimensão (eixo X / categoria)</Label>
          <Select value={widget.config.dimension ?? ''} onValueChange={(v) => setCfg({ dimension: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {fields.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {showMetric && (
        <div>
          <Label className="text-xs">Métrica</Label>
          <Select value={widget.config.metric ?? 'sum'} onValueChange={(v) => setCfg({ metric: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AGGS.map((a) => <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {showField && (
        <div>
          <Label className="text-xs">Campo</Label>
          <Select value={widget.config.field ?? ''} onValueChange={(v) => setCfg({ field: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {fields.filter((f) => f.kind === 'number' || widget.config.metric === 'distinct').map((f) =>
                <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {showDimension && widget.config.dimension && fields.find((f) => f.key === widget.config.dimension)?.kind === 'date' && (
        <div>
          <Label className="text-xs">Granularidade</Label>
          <Select value={widget.config.granularity ?? 'month'} onValueChange={(v: any) => setCfg({ granularity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Dia</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {showFormat && (
        <div>
          <Label className="text-xs">Formato</Label>
          <Select value={widget.config.format ?? 'number'} onValueChange={(v: any) => setCfg({ format: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="number">Número</SelectItem>
              <SelectItem value="currency">Moeda (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {showLimit && (
        <div>
          <Label className="text-xs">Limite (top N)</Label>
          <Input type="number" min={0} value={widget.config.limit ?? 0}
            onChange={(e) => setCfg({ limit: Number(e.target.value) || undefined })} />
        </div>
      )}
    </div>
  );
}
