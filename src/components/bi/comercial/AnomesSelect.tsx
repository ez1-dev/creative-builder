import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MESES: { value: string; label: string }[] = [
  { value: '01', label: 'Janeiro' },   { value: '02', label: 'Fevereiro' }, { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },     { value: '05', label: 'Maio' },      { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },     { value: '08', label: 'Agosto' },    { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },   { value: '11', label: 'Novembro' },  { value: '12', label: 'Dezembro' },
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

  const subLabelCls = 'text-[10px] uppercase tracking-wide text-muted-foreground';

  return (
    <div className={className}>
      {label && <div className="mb-1 text-xs font-medium text-foreground">{label}</div>}
      <div className="grid grid-cols-[1fr_92px] gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={id} className={subLabelCls}>Mês</Label>
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
        </div>
        <div className="flex flex-col gap-1">
          <Label className={subLabelCls}>Ano</Label>
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
    </div>
  );
}
