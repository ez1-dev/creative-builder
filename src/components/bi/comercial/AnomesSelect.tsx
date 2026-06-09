import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MESES: { value: string; label: string }[] = [
  { value: '01', label: 'Jan' }, { value: '02', label: 'Fev' }, { value: '03', label: 'Mar' },
  { value: '04', label: 'Abr' }, { value: '05', label: 'Mai' }, { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' }, { value: '08', label: 'Ago' }, { value: '09', label: 'Set' },
  { value: '10', label: 'Out' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dez' },
];

const ANO_INICIAL = 2022;

export interface AnomesSelectProps {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
  /** Tamanho compacto (h-8 text-xs). Default true. */
  compact?: boolean;
}

export function AnomesSelect({
  label, value, onChange, id, className, disabled, compact = true,
}: AnomesSelectProps) {
  const anoAtual = new Date().getFullYear();
  const anos = useMemo(() => {
    const out: string[] = [];
    for (let y = anoAtual + 1; y >= ANO_INICIAL; y--) out.push(String(y));
    return out;
  }, [anoAtual]);

  const safe = (value ?? '').replace(/\D/g, '').padStart(6, '0').slice(0, 6);
  const anoRaw = safe.slice(0, 4);
  const mesRaw = safe.slice(4, 6);
  const ano = /^\d{4}$/.test(anoRaw) && Number(anoRaw) >= ANO_INICIAL ? anoRaw : String(anoAtual);
  const mes = MESES.some((m) => m.value === mesRaw) ? mesRaw : '01';

  const emit = (nextAno: string, nextMes: string) => onChange(`${nextAno}${nextMes}`);

  const triggerCls = compact ? 'h-8 text-xs' : 'h-9 text-sm';

  return (
    <div className={className}>
      {label && <Label htmlFor={id} className="text-xs">{label}</Label>}
      <div className="grid grid-cols-2 gap-1">
        <Select value={mes} onValueChange={(v) => emit(ano, v)} disabled={disabled}>
          <SelectTrigger id={id} aria-label={label ? `${label} - mês` : 'Mês'} className={triggerCls}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ano} onValueChange={(v) => emit(v, mes)} disabled={disabled}>
          <SelectTrigger aria-label={label ? `${label} - ano` : 'Ano'} className={triggerCls}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {anos.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
