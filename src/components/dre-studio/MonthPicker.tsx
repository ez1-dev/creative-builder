import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// value as YYYYMM number. Lista interativa: 6 anos para trás até 1 ano à frente.
export function MonthPicker({
  label,
  value,
  onChange,
  yearsBack = 6,
  yearsForward = 1,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  yearsBack?: number;
  yearsForward?: number;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = currentYear - yearsBack;
  const endYear = currentYear + yearsForward;

  const options: Array<{ value: number; label: string }> = [];
  for (let y = endYear; y >= startYear; y--) {
    for (let m = 12; m >= 1; m--) {
      options.push({
        value: y * 100 + m,
        label: `${MESES[m - 1]} / ${y}`,
      });
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label ? <Label className="text-xs text-slate-600">{label}</Label> : null}
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent className="max-h-[320px]">
          {options.map((o) => (
            <SelectItem key={o.value} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
