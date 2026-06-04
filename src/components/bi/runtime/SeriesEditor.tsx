/**
 * Editor de séries de um widget de gráfico.
 *
 * Lista de séries com métrica/rótulo/cor/tipo/eixo. Permite adicionar do
 * catálogo built-in ou criar uma métrica calculada nova.
 */
import { useId, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { COMERCIAL_METRICS, type MetricRef, type CustomMetric } from '@/lib/bi/comercialMetrics';
import { FormulaBuilder } from './FormulaBuilder';

interface Props {
  value: MetricRef[];
  onChange: (next: MetricRef[]) => void;
  customMetrics: CustomMetric[];
  onCreateCustom: (m: CustomMetric) => void;
  /** Apenas estes tipos são possíveis em widgets não-combo. */
  allowChartType?: boolean;
}

export function SeriesEditor({ value, onChange, customMetrics, onCreateCustom, allowChartType = true }: Props) {
  const uid = useId();
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [draft, setDraft] = useState<CustomMetric>({ id: '', label: '', formula: '', format: 'number' });

  const builtinKeys = Object.values(COMERCIAL_METRICS).map((m) => ({ key: m.key, label: m.label }));
  const customKeys = customMetrics.map((m) => ({ key: m.id, label: `${m.label} (calculada)` }));
  const allKeys = [...builtinKeys, ...customKeys];

  const update = (i: number, patch: Partial<MetricRef>) => {
    const next = [...value];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => {
    const next = value.slice();
    next.splice(i, 1);
    onChange(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => {
    const present = new Set(value.map((s) => s.key));
    const first = allKeys.find((k) => !present.has(k.key)) ?? allKeys[0];
    if (!first) return;
    onChange([...value, { key: first.key }]);
  };

  const openFormula = () => {
    setDraft({ id: `cm_${Date.now()}`, label: '', formula: '', format: 'number' });
    setFormulaOpen(true);
  };

  const saveFormula = () => {
    if (!draft.label || !draft.formula) return;
    onCreateCustom(draft);
    onChange([...value, { key: draft.id, label: draft.label }]);
    setFormulaOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Séries do gráfico</Label>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 gap-1" onClick={openFormula}>
            <Calculator className="h-3 w-3" /> Métrica calculada
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1" onClick={add}>
            <Plus className="h-3 w-3" /> Adicionar série
          </Button>
        </div>
      </div>

      {value.length === 0 && (
        <p className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">
          Nenhuma série configurada — usando a métrica padrão do bloco.
        </p>
      )}

      {value.map((s, i) => {
        const rowId = `${uid}-row-${i}`;
        const idMetric = `${rowId}-metric`;
        const idLabel = `${rowId}-label`;
        const idChartType = `${rowId}-chart-type`;
        const idAxis = `${rowId}-axis`;
        const idColor = `${rowId}-color`;
        return (
        <div key={i} className="grid gap-2 rounded-md border bg-muted/30 p-2 md:grid-cols-12 items-end">
          <div className="md:col-span-4">
            <Label htmlFor={idMetric} className="text-[10px] uppercase text-muted-foreground">Métrica</Label>
            <Select value={s.key} onValueChange={(v) => update(i, { key: v })}>
              <SelectTrigger id={idMetric} name={`series-${i}-metric`} aria-label="Métrica" className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {allKeys.map((k) => (
                  <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label htmlFor={idLabel} className="text-[10px] uppercase text-muted-foreground">Rótulo</Label>
            <Input id={idLabel} name={`series-${i}-label`} className="h-8 text-xs" value={s.label ?? ''} placeholder="(automático)" onChange={(e) => update(i, { label: e.target.value })} />
          </div>
          {allowChartType && (
            <div className="md:col-span-2">
              <Label htmlFor={idChartType} className="text-[10px] uppercase text-muted-foreground">Tipo</Label>
              <Select value={s.chartType ?? 'bar'} onValueChange={(v) => update(i, { chartType: v as any })}>
                <SelectTrigger id={idChartType} name={`series-${i}-chart-type`} aria-label="Tipo de gráfico" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Barras</SelectItem>
                  <SelectItem value="line">Linha</SelectItem>
                  <SelectItem value="area">Área</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="md:col-span-2">
            <Label htmlFor={idAxis} className="text-[10px] uppercase text-muted-foreground">Eixo</Label>
            <Select value={s.axis ?? 'primary'} onValueChange={(v) => update(i, { axis: v as any })}>
              <SelectTrigger id={idAxis} name={`series-${i}-axis`} aria-label="Eixo" className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Y1 (esquerdo)</SelectItem>
                <SelectItem value="secondary">Y2 (direito)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-1 flex items-center gap-1">
            <input
              id={idColor}
              name={`series-${i}-color`}
              type="color"
              value={hexFromColor(s.color)}
              onChange={(e) => update(i, { color: e.target.value })}
              className="h-7 w-7 cursor-pointer rounded border bg-background p-0"
              title="Cor"
              aria-label="Cor da série"
            />
          </div>
          <div className="md:col-span-12 flex items-center justify-end gap-1">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(i, 1)} disabled={i === value.length - 1}>
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => remove(i)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        );
      })}

      <Dialog open={formulaOpen} onOpenChange={setFormulaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova métrica calculada</DialogTitle>
            <DialogDescription>Crie uma fórmula combinando métricas existentes (ex.: faturamento − devolucao).</DialogDescription>
          </DialogHeader>
          <FormulaBuilder value={draft} onChange={setDraft} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormulaOpen(false)}>Cancelar</Button>
            <Button onClick={saveFormula} disabled={!draft.label || !draft.formula}>Salvar e adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function hexFromColor(c?: string): string {
  if (!c) return '#3b82f6';
  if (c.startsWith('#')) return c;
  // hsl(var(...)) → cor padrão para o input color
  return '#3b82f6';
}
