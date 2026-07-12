// Helpers para anomes (AAAAMM como number).
const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function anomesFromDate(d: Date): number {
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

export function anomesToLabel(anomes: number | string | null | undefined): string {
  if (anomes == null || anomes === '') return '';
  const n = typeof anomes === 'number' ? anomes : Number(String(anomes));
  if (!Number.isFinite(n) || n < 100000) return String(anomes);
  const ano = Math.floor(n / 100);
  const mes = n % 100;
  if (mes < 1 || mes > 12) return String(anomes);
  return `${MESES_PT[mes - 1]}/${String(ano).slice(-2)}`;
}

export function anomesToInputMonth(anomes: number | null | undefined): string {
  if (!anomes) return '';
  const ano = Math.floor(anomes / 100);
  const mes = anomes % 100;
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

export function inputMonthToAnomes(value: string): number | null {
  if (!value) return null;
  const [ano, mes] = value.split('-').map(Number);
  if (!ano || !mes) return null;
  return ano * 100 + mes;
}

export function currentAnomes(): number {
  return anomesFromDate(new Date());
}

export function anomesRange(ini: number, fim: number): number[] {
  const out: number[] = [];
  let a = Math.floor(ini / 100);
  let m = ini % 100;
  const aFim = Math.floor(fim / 100);
  const mFim = fim % 100;
  while (a < aFim || (a === aFim && m <= mFim)) {
    out.push(a * 100 + m);
    m++;
    if (m > 12) { m = 1; a++; }
    if (out.length > 240) break;
  }
  return out;
}

export function isValidUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
