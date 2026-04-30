// Utilitários compartilhados pelo MapaDestinosCard

// Código IBGE (2 dígitos) -> sigla UF
export const COD_TO_UF: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
  '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS',
  '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

export const UF_NOME: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará',
  PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

// Offsets manuais (em graus) para empurrar siglas dos estados pequenos do NE
// para fora do litoral, evitando sobreposição.
export const LABEL_OFFSET: Record<string, [number, number]> = {
  RN: [2.4, 0.0],
  PB: [2.8, 0.7],
  PE: [3.0, 1.4],
  AL: [2.6, 2.0],
  SE: [2.4, 2.6],
  ES: [2.0, 0.0],
  DF: [0, 0],
};

// Faixas discretas de cor (heatmap)
// Paleta azul → âmbar → vermelho, alinhada à identidade corporativa.
export const HEAT_COLORS = {
  empty: 'hsl(220, 16%, 90%)',     // cinza claro - sem registros
  low:   'hsl(210, 85%, 82%)',     // azul muito claro
  mid:   'hsl(212, 80%, 60%)',     // azul corporativo
  high:  'hsl(35, 92%, 55%)',      // âmbar
  top:   'hsl(0, 75%, 50%)',       // vermelho - líder
} as const;

export type HeatTier = 'empty' | 'low' | 'mid' | 'high' | 'top';

export interface ColorScale {
  (qtd: number): string;
  tierOf: (qtd: number) => HeatTier;
  thresholds: { t1: number; t2: number; t3: number; max: number; count: number };
}

/**
 * Constrói uma função de cor baseada em quantis (ordinal).
 * Distribui os estados COM dados em 4 faixas de igual tamanho, garantindo
 * contraste visual mesmo quando a distribuição é cauda longa
 * (ex.: poucos estados no topo + muitos com valores pequenos).
 */
export function makeColorScale(values: number[]): ColorScale {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) {
    const fn = ((_: number) => HEAT_COLORS.empty) as ColorScale;
    fn.tierOf = () => 'empty';
    fn.thresholds = { t1: 0, t2: 0, t3: 0, max: 0, count: 0 };
    return fn;
  }

  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const t1 = q(0.25);
  const t2 = q(0.5);
  const t3 = q(0.75);
  const max = sorted[sorted.length - 1];

  const tierOf = (qtd: number): HeatTier => {
    if (!qtd || qtd <= 0) return 'empty';
    if (qtd <= t1) return 'low';
    if (qtd <= t2) return 'mid';
    if (qtd <= t3) return 'high';
    return 'top';
  };

  const fn = ((qtd: number) => HEAT_COLORS[tierOf(qtd)]) as ColorScale;
  fn.tierOf = tierOf;
  fn.thresholds = { t1, t2, t3, max, count: sorted.length };
  return fn;
}

// Mantida por compatibilidade — usa a escala linear simples.
export function colorForQtd(qtd: number, max: number): string {
  if (!qtd || qtd <= 0) return HEAT_COLORS.empty;
  if (max <= 0) return HEAT_COLORS.empty;
  const ratio = qtd / max;
  if (ratio <= 0.2) return HEAT_COLORS.low;
  if (ratio <= 0.45) return HEAT_COLORS.mid;
  if (ratio <= 0.7) return HEAT_COLORS.high;
  return HEAT_COLORS.top;
}

export const GEO_URL = '/geo/brasil-uf.json';
