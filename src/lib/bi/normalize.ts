/**
 * Normalizadores defensivos usados na renderização do BI (Comercial e demais).
 *
 * Garantem que objetos/arrays opcionais nunca sejam `null`/`undefined` antes
 * de chamadas como `Object.keys`/`Object.values`/`Object.entries` ou spread
 * `{ ...obj }`. Sem isto, um único widget malformado derruba a tela inteira
 * com o erro "Cannot convert undefined or null to object".
 */

export interface NormalizedWidget {
  id: string | null;
  type: string;
  title: string;
  position: number;
  layout: Record<string, any>;
  hidden: boolean;
  componentId: string | null;
  bloco_id: string | null;
  mapping: Record<string, any>;
  options: Record<string, any>;
  config: Record<string, any>;
  customTitle: string | null;
  variant: string | null;
  data: any[];
  series: any[];
  filtros: Record<string, any>;
  titleColor: string | null;
  titleBold: boolean;
  [k: string]: any;
}

export function normalizeWidget<T extends Record<string, any>>(widget: T | null | undefined): NormalizedWidget & T {
  const w: any = widget ?? {};
  return {
    ...w,
    id: w?.id ?? null,
    type: w?.type ?? 'unknown',
    title: w?.title ?? 'Bloco',
    position: typeof w?.position === 'number' ? w.position : 0,
    layout: w?.layout ?? {},
    hidden: Boolean(w?.hidden),
    componentId: w?.componentId ?? null,
    bloco_id: w?.bloco_id ?? null,
    mapping: w?.mapping ?? {},
    options: w?.options ?? {},
    config: w?.config ?? {},
    customTitle: w?.customTitle ?? null,
    variant: w?.variant ?? null,
    data: Array.isArray(w?.data) ? w.data : [],
    series: Array.isArray(w?.series) ? w.series : [],
    filtros: w?.filtros ?? {},
    titleColor: w?.titleColor ?? null,
    titleBold: Boolean(w?.titleBold),
  };
}

export interface NormalizedBlock {
  id: string | null;
  titulo: string;
  layout: Record<string, any>;
  options: Record<string, any>;
  widgets: any[];
  [k: string]: any;
}

export function normalizeBlock<T extends Record<string, any>>(block: T | null | undefined): NormalizedBlock & T {
  const b: any = block ?? {};
  return {
    ...b,
    id: b?.id ?? null,
    titulo: b?.titulo ?? 'Bloco',
    layout: b?.layout ?? {},
    options: b?.options ?? {},
    widgets: Array.isArray(b?.widgets) ? b.widgets : [],
  };
}

export interface NormalizedVisual {
  visual: Record<string, any>;
  legenda: Record<string, any>;
  rotulos: Record<string, any>;
  eixos: Record<string, any>;
  card: Record<string, any>;
}

export function normalizeVisual(options: Record<string, any> | null | undefined): NormalizedVisual {
  const visual = (options ?? {})?.visual ?? {};
  return {
    visual,
    legenda: visual?.legenda ?? {},
    rotulos: visual?.rotulos ?? {},
    eixos: visual?.eixos ?? {},
    card: visual?.card ?? {},
  };
}

export interface NormalizedLayoutResponse {
  blocks: any[];
  widgets: any[];
}

export function normalizeLayoutResponse(resp: any): NormalizedLayoutResponse {
  const r = resp ?? {};
  return {
    blocks: Array.isArray(r?.blocks) ? r.blocks : [],
    widgets: Array.isArray(r?.widgets) ? r.widgets : [],
  };
}

/** Helpers seguros para uso direto em renderização. */
export const safeObj = <T extends Record<string, any>>(o: T | null | undefined): T | Record<string, never> =>
  (o ?? {}) as any;
export const safeArr = <T>(a: T[] | null | undefined): T[] => (Array.isArray(a) ? a : []);
export const safeEntries = (o: any) => Object.entries(o ?? {});
export const safeKeys = (o: any) => Object.keys(o ?? {});
export const safeValues = (o: any) => Object.values(o ?? {});
