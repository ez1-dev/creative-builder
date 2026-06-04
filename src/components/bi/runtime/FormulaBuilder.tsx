/**
 * Editor de fórmulas calculadas — input + validação ao vivo + chips de
 * identificadores disponíveis (clicáveis para inserir).
 */
import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validateFormula, type CustomMetric, type MetricFormat, metricIdentifiers } from '@/lib/bi/comercialMetrics';

interface Props {
  value: CustomMetric;
  onChange: (next: CustomMetric) => void;
}

export function FormulaBuilder({ value, onChange }: Props) {
  const allowed = useMemo(() => metricIdentifiers(), []);
  const validation = useMemo(() => validateFormula(value.formula || '0', allowed), [value.formula, allowed]);

  const insertIdent = (id: string) => {
    onChange({ ...value, formula: (value.formula ?? '') + (value.formula ? ' ' : '') + id });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Nome da métrica</Label>
        <Input
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          placeholder="Ex.: Margem Líquida"
        />
      </div>
      <div>
        <Label className="text-xs">Fórmula</Label>
        <Input
          value={value.formula}
          onChange={(e) => onChange({ ...value, formula: e.target.value })}
          placeholder="Ex.: (faturamento - devolucao - impostos) / faturamento * 100"
          className="font-mono text-xs"
        />
        <div className="mt-1 text-xs">
          {validation.ok ? (
            <span className="text-success">Fórmula válida</span>
          ) : (
            <span className="text-destructive">{(validation as any).error}</span>
          )}
        </div>
      </div>
      <div>
        <Label className="text-xs">Formato de exibição</Label>
        <Select value={value.format} onValueChange={(v) => onChange({ ...value, format: v as MetricFormat })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="currency">Moeda (R$)</SelectItem>
            <SelectItem value="number">Número</SelectItem>
            <SelectItem value="percent">Percentual (%)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs mb-1 block">Identificadores disponíveis (clique para inserir)</Label>
        <div className="flex flex-wrap gap-1">
          {allowed.map((id) => (
            <Badge
              key={id}
              variant="outline"
              className="cursor-pointer font-mono text-[10px] hover:bg-accent"
              onClick={() => insertIdent(id)}
            >
              {id}
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Operadores: + − × ÷ e parênteses. Divisão por zero retorna 0.
        </p>
      </div>
    </div>
  );
}
