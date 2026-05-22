import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Table2, Layers, LayoutGrid, BarChart3, BarChart } from 'lucide-react';
import type { RelatorioLayout, RelatorioColuna, LayoutTipo } from '@/lib/relatorios/types';

interface Props {
  layout: RelatorioLayout;
  colunas: Omit<RelatorioColuna, 'id' | 'relatorio_id'>[];
  onChange: (l: RelatorioLayout) => void;
}

const LAYOUTS: { id: LayoutTipo; label: string; icon: any }[] = [
  { id: 'tabela_simples', label: 'Tabela simples', icon: Table2 },
  { id: 'tabela_agrupada', label: 'Tabela agrupada', icon: Layers },
  { id: 'cards', label: 'Cards gerenciais', icon: LayoutGrid },
  { id: 'grafico', label: 'Gráfico', icon: BarChart3 },
  { id: 'tabela_grafico', label: 'Tabela + gráfico', icon: BarChart },
];

export function LayoutEditor({ layout, colunas, onChange }: Props) {
  function patch(p: Partial<RelatorioLayout>) {
    onChange({ ...layout, ...p });
  }
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-semibold mb-2 block">Tipo de visualização</Label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {LAYOUTS.map((l) => (
            <Card
              key={l.id}
              onClick={() => patch({ tipo: l.id })}
              className={cn(
                'cursor-pointer hover:border-primary transition-colors',
                layout.tipo === l.id && 'border-primary bg-primary/5',
              )}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <l.icon className={cn('h-6 w-6', layout.tipo === l.id ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-xs font-medium">{l.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <div>
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" value={layout.titulo ?? ''} onChange={(e) => patch({ titulo: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="sub">Subtítulo</Label>
          <Input id="sub" value={layout.subtitulo ?? ''} onChange={(e) => patch({ subtitulo: e.target.value })} />
        </div>
        {(layout.tipo === 'tabela_agrupada' || layout.tipo === 'cards') && (
          <div className="md:col-span-2">
            <Label>Agrupar por campo</Label>
            <Select value={layout.agrupar_por ?? ''} onValueChange={(v) => patch({ agrupar_por: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione uma coluna..." /></SelectTrigger>
              <SelectContent>
                {colunas.map((c) => <SelectItem key={c.campo} value={c.campo}>{c.titulo || c.campo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-border max-w-3xl">
        <Label className="text-sm font-semibold">Exibição</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['mostrar_filtros', 'Mostrar filtros aplicados'],
            ['mostrar_totais', 'Mostrar totais'],
            ['mostrar_data_hora', 'Mostrar data/hora de geração'],
            ['mostrar_usuario', 'Mostrar usuário'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={(layout as any)[key]}
                onCheckedChange={(v) => patch({ [key]: v } as any)}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
