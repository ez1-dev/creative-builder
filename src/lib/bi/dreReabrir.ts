/**
 * Linhas calculadas da DRE: ao "Reabrir", mostra os componentes da fórmula.
 * As somas mantêm o sinal natural já aplicado pelas regras no backend.
 */
export const DRE_FORMULAS: Record<string, string[]> = {
  RECEITA_LIQUIDA: ['RECEITA_BRUTA', 'DEDUCOES_VENDAS'],
  CUSTO_TOTAL: ['CUSTO_PRODUCAO_VENDA', 'CUSTO_MEX'],
  LUCRO_BRUTO: ['RECEITA_LIQUIDA', 'CUSTO_TOTAL'],
  EBITDA: ['LUCRO_BRUTO', 'DESPESAS_COMERCIAIS', 'DESPESAS_ADMINISTRATIVAS'],
  EBIT: ['EBITDA', 'DEPRECIACAO'],
  RESULTADO_EXERCICIO: [
    'EBIT',
    'RECEITAS_FINANCEIRAS',
    'DESPESAS_FINANCEIRAS',
    'RECEITAS_NAO_OPERACIONAIS',
    'DESPESAS_NAO_OPERACIONAIS',
    'FAZENDA',
  ],
};

export const CODIGOS_CALCULADOS = new Set(Object.keys(DRE_FORMULAS));

export function isLinhaCalculada(codigo: string | undefined | null): boolean {
  if (!codigo) return false;
  return CODIGOS_CALCULADOS.has(String(codigo).trim().toUpperCase());
}

export function componentesDaLinha(codigo: string): string[] {
  return DRE_FORMULAS[String(codigo).trim().toUpperCase()] ?? [];
}
