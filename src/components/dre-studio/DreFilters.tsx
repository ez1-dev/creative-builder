import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { anomesToInputMonth, inputMonthToAnomes } from '@/lib/contabil/anomes';
import { useDreStudioModelos, useCentrosCusto } from '@/hooks/contabil/useDreStudio';
import { RotateCw, Filter, X } from 'lucide-react';

export interface DreStudioFilters {
  codemp: number;
  codfil?: number | null;
  modelo_id?: string | null;
  anomes_ini: number;
  anomes_fim: number;
  codccu?: string | null;
}

interface Props {
  value: DreStudioFilters;
  onChange: (v: DreStudioFilters) => void;
  onApply?: () => void;
  onClear?: () => void;
  showModelo?: boolean;
  showCentroCusto?: boolean;
  right?: React.ReactNode;
}

export function DreFilters({ value, onChange, onApply, onClear, showModelo = true, showCentroCusto = true, right }: Props) {
  const [local, setLocal] = useState<DreStudioFilters>(value);
  const modelosQ = useDreStudioModelos(local.codemp);
  const ccuQ = useCentrosCusto(local.codemp, showCentroCusto && !!local.codemp);

  const set = <K extends keyof DreStudioFilters>(k: K, v: DreStudioFilters[K]) => {
    const next = { ...local, [k]: v };
    setLocal(next);
    onChange(next);
  };

  const modelos = modelosQ.data ?? [];
  const centros = ccuQ.data ?? [];

  const mesIni = useMemo(() => anomesToInputMonth(local.anomes_ini), [local.anomes_ini]);
  const mesFim = useMemo(() => anomesToInputMonth(local.anomes_fim), [local.anomes_fim]);

  return (
    <div className="rounded-lg border bg-card p-3 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1 min-w-[100px]">
        <Label className="text-xs">Empresa</Label>
        <Input
          type="number"
          className="h-8 w-24"
          value={local.codemp}
          onChange={(e) => set('codemp', Number(e.target.value) || 1)}
        />
      </div>

      <div className="flex flex-col gap-1 min-w-[100px]">
        <Label className="text-xs">Filial</Label>
        <Input
          type="number"
          className="h-8 w-24"
          value={local.codfil ?? ''}
          placeholder="todas"
          onChange={(e) => set('codfil', e.target.value ? Number(e.target.value) : null)}
        />
      </div>

      {showModelo && (
        <div className="flex flex-col gap-1 min-w-[220px]">
          <Label className="text-xs">Modelo</Label>
          <Select
            value={local.modelo_id ?? ''}
            onValueChange={(v) => set('modelo_id', v || null)}
          >
            <SelectTrigger className="h-8"><SelectValue placeholder={modelosQ.isFetching ? 'Carregando…' : 'Selecionar modelo'} /></SelectTrigger>
            <SelectContent>
              {modelos.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome} <span className="text-muted-foreground text-xs ml-1">({m.tipo_modelo})</span>
                </SelectItem>
              ))}
              {modelos.length === 0 && !modelosQ.isFetching && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum modelo cadastrado.</div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label className="text-xs">Período inicial</Label>
        <Input
          type="month"
          className="h-8"
          value={mesIni}
          onChange={(e) => {
            const n = inputMonthToAnomes(e.target.value);
            if (n) set('anomes_ini', n);
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs">Período final</Label>
        <Input
          type="month"
          className="h-8"
          value={mesFim}
          onChange={(e) => {
            const n = inputMonthToAnomes(e.target.value);
            if (n) set('anomes_fim', n);
          }}
        />
      </div>

      {showCentroCusto && (
        <div className="flex flex-col gap-1 min-w-[200px]">
          <Label className="text-xs">Centro de custo</Label>
          <Select value={local.codccu ?? '__all__'} onValueChange={(v) => set('codccu', v === '__all__' ? null : v)}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {centros.map((c) => (
                <SelectItem key={c.codccu} value={c.codccu}>{c.codccu} — {c.desccu}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="ml-auto flex items-end gap-2">
        {right}
        {onApply && (
          <Button size="sm" onClick={onApply} className="gap-1"><Filter className="h-3.5 w-3.5" /> Aplicar</Button>
        )}
        {onClear && (
          <Button size="sm" variant="outline" onClick={onClear} className="gap-1"><X className="h-3.5 w-3.5" /> Limpar</Button>
        )}
        {onApply && (
          <Button size="sm" variant="ghost" onClick={onApply} title="Atualizar"><RotateCw className="h-3.5 w-3.5" /></Button>
        )}
      </div>
    </div>
  );
}
