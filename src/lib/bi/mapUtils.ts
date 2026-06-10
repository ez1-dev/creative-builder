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

/**
 * Paleta de calor estilo Spectral (azul → ciano → amarelo → laranja → vermelho).
 * Fixa por design: visualizações de calor exigem escala perceptual específica.
 */
export const HEAT_COLOR_STOPS: string[] = [
  '#2c7bb6',
  '#abd9e9',
  '#ffffbf',
  '#fdae61',
  '#d7191c',
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Interpola na paleta HEAT_COLOR_STOPS conforme t ∈ [0,1]. */
export function heatColor(t: number, stops: string[] = HEAT_COLOR_STOPS): string {
  if (!Number.isFinite(t) || t <= 0) return stops[0];
  if (t >= 1) return stops[stops.length - 1];
  const seg = t * (stops.length - 1);
  const i = Math.floor(seg);
  const f = seg - i;
  const [r1, g1, b1] = hexToRgb(stops[i]);
  const [r2, g2, b2] = hexToRgb(stops[i + 1]);
  const r = Math.round(r1 + (r2 - r1) * f);
  const g = Math.round(g1 + (g2 - g1) * f);
  const b = Math.round(b1 + (b2 - b1) * f);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Atalho: cor de calor a partir de valor e máximo. */
export function heatColorFromValue(valor: number, max: number): string {
  if (!max || max <= 0 || !Number.isFinite(valor) || valor <= 0) return 'hsl(var(--muted))';
  return heatColor(Math.min(1, valor / max));
}

