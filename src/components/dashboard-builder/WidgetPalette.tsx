import { Button } from '@/components/ui/button';
import { BarChart3, LineChart, AreaChart, PieChart, TrendingUp, Hash, Table as TableIcon, Boxes } from 'lucide-react';
import type { WidgetType } from './types';

interface Props {
  onAdd: (type: WidgetType) => void;
}

const ITEMS: { type: WidgetType; label: string; icon: any }[] = [
  { type: 'kpi', label: 'KPI', icon: Hash },
  { type: 'bar', label: 'Barras', icon: BarChart3 },
  { type: 'line', label: 'Linha', icon: LineChart },
  { type: 'area', label: 'Área', icon: AreaChart },
  { type: 'pie', label: 'Pizza', icon: PieChart },
  { type: 'treemap', label: 'Treemap', icon: Boxes },
  { type: 'scatter', label: 'Dispersão', icon: TrendingUp },
  { type: 'table', label: 'Tabela', icon: TableIcon },
];

export function WidgetPalette({ onAdd }: Props) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adicionar widget</div>
      <div className="grid grid-cols-2 gap-2">
        {ITEMS.map((it) => (
          <Button key={it.type} variant="outline" size="sm" className="justify-start" onClick={() => onAdd(it.type)}>
            <it.icon className="mr-2 h-4 w-4" />
            {it.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
