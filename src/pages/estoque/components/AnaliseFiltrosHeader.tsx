import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { CriterioAbc } from '@/lib/estoque/analiseApi';

export interface AnaliseFiltros {
  codemp?: string;
  codfil?: string;
  meses_consumo: number;
  criterio_abc: CriterioAbc;
  corte_a: number;
  corte_b: number;
}

export interface AnaliseFiltrosHeaderProps {
  value: AnaliseFiltros;
  onChange: (patch: Partial<AnaliseFiltros>) => void;
  onApply: () => void;
  observacoes?: string[] | string | null;
  showCriterio?: boolean;
  loading?: boolean;
}

const CRIT_LABELS: Record<CriterioAbc, { label: string; hint: string }> = {
  CONSUMO: {
    label: 'Consumo no período',
    hint: 'Classifica pelo valor consumido durante a janela. Útil para política de compras, estoque de segurança e itens de maior movimentação financeira.',
  },
  VALOR_ESTOQUE: {
    label: 'Valor atual em estoque',
    hint: 'Classifica pelo capital atualmente imobilizado. Útil para redução de estoque, capital parado e itens de maior valor financeiro atual.',
  },
};

export function AnaliseFiltrosHeader({ value, onChange, onApply, observacoes, showCriterio = true, loading }: AnaliseFiltrosHeaderProps) {
  const [avancado, setAvancado] = useState(false);
  const obsLista = Array.isArray(observacoes) ? observacoes : observacoes ? [observacoes] : [];

  const cortesInvalidos = !(value.corte_a > 0 && value.corte_b > value.corte_a && value.corte_b <= 100);

  return (
    <div className="rounded-md border bg-card">
      <div className="flex flex-wrap items-end gap-3 p-3">
        <div className="w-24">
          <Label className="text-xs">Empresa</Label>
          <Input value={value.codemp ?? '1'} onChange={(e) => onChange({ codemp: e.target.value })} className="h-8 text-xs" />
        </div>
        <div className="w-28">
          <Label className="text-xs">Filial</Label>
          <Input value={value.codfil ?? ''} onChange={(e) => onChange({ codfil: e.target.value })} placeholder="Todas" className="h-8 text-xs" />
        </div>
        <div className="w-40">
          <Label className="text-xs">Período de consumo</Label>
          <Select value={String(value.meses_consumo)} onValueChange={(v) => onChange({ meses_consumo: Number(v) })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[3, 6, 12, 18, 24].map((m) => <SelectItem key={m} value={String(m)}>{m} meses</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {showCriterio && (
          <div className="w-56">
            <Label className="text-xs">Critério da Curva ABC</Label>
            <Select value={value.criterio_abc} onValueChange={(v) => onChange({ criterio_abc: v as CriterioAbc })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['CONSUMO', 'VALOR_ESTOQUE'] as CriterioAbc[]).map((k) => (
                  <SelectItem key={k} value={k}>{CRIT_LABELS[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[10px] text-muted-foreground leading-tight">{CRIT_LABELS[value.criterio_abc].hint}</p>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Button size="sm" onClick={onApply} disabled={loading || cortesInvalidos}>Aplicar</Button>
          <Button size="sm" variant="ghost" onClick={() => setAvancado((v) => !v)}>
            {avancado ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
            Avançado
          </Button>
        </div>
      </div>

      {avancado && (
        <div className="grid grid-cols-2 gap-3 border-t p-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Curva A até (%)</Label>
            <Input type="number" min={1} max={99} value={value.corte_a} onChange={(e) => onChange({ corte_a: Number(e.target.value) })} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Curva B até (%)</Label>
            <Input type="number" min={2} max={100} value={value.corte_b} onChange={(e) => onChange({ corte_b: Number(e.target.value) })} className="h-8 text-xs" />
          </div>
          <div className="col-span-2 self-end text-xs text-muted-foreground">
            Curva C: restante. Regra: 0 &lt; A &lt; B ≤ 100.
            {cortesInvalidos && <span className="ml-2 text-destructive">Cortes inválidos</span>}
          </div>
        </div>
      )}

      {obsLista.length > 0 && (
        <div className="flex items-start gap-2 border-t bg-muted/40 p-3 text-xs">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
          <div>
            <div className="font-medium text-muted-foreground">Critérios da análise</div>
            <ul className="list-disc pl-4 text-muted-foreground">
              {obsLista.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
