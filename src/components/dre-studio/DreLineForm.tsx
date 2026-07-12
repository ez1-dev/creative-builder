import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TIPOS_LINHA, OPERADORES, NATUREZAS } from '@/lib/contabil/dreStudioTypes';
import type { DreLinha, NaturezaLinha, Operador, TipoLinha } from '@/lib/contabil/dreStudioTypes';
import { Save } from 'lucide-react';

interface Props {
  linha: DreLinha | null;
  linhasPai: DreLinha[];
  onSave: (patch: Partial<DreLinha>) => Promise<void> | void;
  disabled?: boolean;
  saving?: boolean;
}

function toStateFromLinha(l: DreLinha | null) {
  return {
    codigo: l?.codigo ?? '',
    descricao: l?.descricao ?? '',
    linha_pai_id: l?.linha_pai_id ?? null,
    ordem: l?.ordem ?? 10,
    tipo_linha: (l?.tipo_linha ?? 'ANALITICA') as TipoLinha,
    natureza: (l?.natureza ?? 'OUTROS') as NaturezaLinha,
    operador: (l?.operador ?? 'SOMA') as Operador,
    sinal: (l?.sinal ?? 1) as 1 | -1,
    exibir: l?.exibir ?? true,
    negrito: l?.negrito ?? false,
    formula: l?.formula ?? '',
  };
}

export function DreLineForm({ linha, linhasPai, onSave, disabled, saving }: Props) {
  const [state, setState] = useState(toStateFromLinha(linha));
  useEffect(() => setState(toStateFromLinha(linha)), [linha?.id]);

  const set = <K extends keyof typeof state>(k: K, v: (typeof state)[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  if (!linha) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Selecione uma linha na árvore ao lado para editar seus atributos.
      </div>
    );
  }

  return (
    <form
      className="p-4 space-y-4 max-h-full overflow-y-auto"
      onSubmit={(e) => { e.preventDefault(); onSave({ ...state, formula: state.formula || null }); }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Código *</Label>
          <Input value={state.codigo} onChange={(e) => set('codigo', e.target.value.toUpperCase())} placeholder="RECEITA_BRUTA" disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ordem</Label>
          <Input type="number" value={state.ordem} onChange={(e) => set('ordem', Number(e.target.value))} disabled={disabled} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Descrição *</Label>
        <Input value={state.descricao} onChange={(e) => set('descricao', e.target.value)} disabled={disabled} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={state.tipo_linha} onValueChange={(v) => set('tipo_linha', v as TipoLinha)} disabled={disabled}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS_LINHA.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Natureza</Label>
          <Select value={state.natureza} onValueChange={(v) => set('natureza', v as NaturezaLinha)} disabled={disabled}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{NATUREZAS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Operador</Label>
          <Select value={state.operador} onValueChange={(v) => set('operador', v as Operador)} disabled={disabled}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{OPERADORES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sinal</Label>
          <Select value={String(state.sinal)} onValueChange={(v) => set('sinal', (Number(v) as 1 | -1))} disabled={disabled}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">+1 (positivo)</SelectItem>
              <SelectItem value="-1">−1 (negativo)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Linha pai</Label>
        <Select
          value={state.linha_pai_id ?? '__root__'}
          onValueChange={(v) => set('linha_pai_id', v === '__root__' ? null : v)}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__root__">— Raiz —</SelectItem>
            {linhasPai
              .filter((l) => l.id !== linha.id && ['GRUPO', 'SUBTOTAL', 'TOTAL'].includes(l.tipo_linha))
              .map((l) => <SelectItem key={l.id} value={l.id}>{l.codigo || l.descricao}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {state.tipo_linha === 'FORMULA' && (
        <div className="space-y-1">
          <Label className="text-xs">Fórmula (usa códigos de linha)</Label>
          <Textarea
            rows={3}
            className="font-mono text-sm"
            value={state.formula}
            onChange={(e) => set('formula', e.target.value)}
            placeholder="RECEITA_LIQUIDA + CPV"
            disabled={disabled}
          />
          <p className="text-[11px] text-muted-foreground">O cálculo final é responsabilidade do backend.</p>
        </div>
      )}

      <div className="flex items-center gap-6 pt-1">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={state.exibir} onCheckedChange={(v) => set('exibir', v)} disabled={disabled} /> Exibir na DRE
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={state.negrito} onCheckedChange={(v) => set('negrito', v)} disabled={disabled} /> Negrito
        </label>
      </div>

      <div className="pt-2">
        <Button type="submit" size="sm" className="gap-1" disabled={disabled || saving}>
          <Save className="h-3.5 w-3.5" /> {saving ? 'Salvando…' : 'Salvar linha'}
        </Button>
      </div>
    </form>
  );
}
