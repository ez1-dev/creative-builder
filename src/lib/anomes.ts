const MESES_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function formatAnomes(col: string | number): string {
  const s = String(col);
  if (s === "TOTAL_ANO") return "Total Anual";
  if (s === "ACUMULADO_ANO") return "Acumulado";
  if (/^\d{6}$/.test(s)) {
    const ano = s.slice(0, 4);
    const mes = parseInt(s.slice(4, 6), 10);
    if (mes >= 1 && mes <= 12) return `${MESES_PT[mes - 1]}/${ano}`;
  }
  return s;
}

export function isTotalAnoCol(col: string): boolean {
  return col === "TOTAL_ANO";
}

export function isAcumuladoAnoCol(col: string): boolean {
  return col === "ACUMULADO_ANO";
}
