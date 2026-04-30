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
export function colorForQtd(qtd: number, max: number): string {
  if (!qtd || qtd <= 0) return 'hsl(220, 14%, 92%)';
  if (max <= 0) return 'hsl(220, 14%, 92%)';
  const ratio = qtd / max;
  if (ratio <= 0.2) return 'hsl(150, 35%, 70%)';
  if (ratio <= 0.45) return 'hsl(205, 70%, 70%)';
  if (ratio <= 0.7) return 'hsl(45, 90%, 60%)';
  return 'hsl(0, 70%, 52%)';
}

export const GEO_URL = '/geo/brasil-uf.json';
