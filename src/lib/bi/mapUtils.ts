/**
 * Utilidades do mapa coroplético do Brasil.
 * Não depende de react-simple-maps; pode ser usada em qualquer renderer.
 */

export interface UfDatum<T = unknown> {
  uf: string;
  valor: number;
  label?: string;
  extra?: T;
}

/** Constrói um Map<UF, datum> normalizando a UF para uppercase. */
export function buildUfValueMap<T extends { uf: string }>(data: T[]): Map<string, T> {
  const m = new Map<string, T>();
  data.forEach((d) => {
    if (!d?.uf) return;
    m.set(String(d.uf).trim().toUpperCase(), d);
  });
  return m;
}

/**
 * Devolve uma intensidade [floor..1] proporcional ao valor.
 * Use diretamente em `hsl(var(--primary) / X)` para pintar regiões.
 */
export function getHeatIntensity(
  valor: number,
  max: number,
  floor = 0.12,
): number {
  if (!max || max <= 0 || !Number.isFinite(valor) || valor <= 0) return 0;
  return Math.max(floor, Math.min(1, valor / max));
}
