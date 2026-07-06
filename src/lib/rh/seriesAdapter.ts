/**
 * Adaptador do contrato uniforme `dashboard.series` dos endpoints RH.
 *
 * Formato do backend:
 *   series: Array<{ chave: string; label: string; pontos: Array<{ label: string; valor: number }> }>
 *
 * Convertemos para:
 *   - Record<chave, pontos>  → alimenta PageDataContext.series (consumido pelos gráficos)
 *   - [{ key: chave, label }] → alimenta os dropdowns "Série" dos diálogos da Biblioteca BI
 */
export interface RhSeriePonto {
  label: string;
  valor: number;
  [k: string]: any;
}

export interface RhSerie {
  chave: string;
  label: string;
  pontos: RhSeriePonto[];
}

export function rhSeriesToRecord(series?: RhSerie[] | null): Record<string, RhSeriePonto[]> {
  const out: Record<string, RhSeriePonto[]> = {};
  (series ?? []).forEach((s) => {
    if (s && typeof s.chave === 'string' && s.chave) out[s.chave] = s.pontos ?? [];
  });
  return out;
}

export function rhSeriesToOptions(series?: RhSerie[] | null): { key: string; label: string }[] {
  return (series ?? [])
    .filter((s) => s && typeof s.chave === 'string' && s.chave)
    .map((s) => ({ key: s.chave, label: s.label || s.chave }));
}
