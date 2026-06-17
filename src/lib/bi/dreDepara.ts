/**
 * Máscaras DRE disponíveis no de/para conta + centro de custos.
 * Use também no modal de criação de regra a partir do drill.
 */
export interface DreMascaraOption {
  codigo: string;
  descricao: string;
}

export const DRE_MASCARAS_DEPARA: DreMascaraOption[] = [
  { codigo: '01.00.000', descricao: 'Receita Bruta' },
  { codigo: '02.00.000', descricao: 'Deduções s/vendas' },
  { codigo: '09.01.000', descricao: 'Custo Produção e Venda' },
  { codigo: '09.02.000', descricao: 'Custo MEX' },
  { codigo: '18.00.000', descricao: 'Despesas Administrativas' },
  { codigo: '19.00.000', descricao: 'Despesas Comerciais' },
  { codigo: '28.00.000', descricao: 'Depreciação' },
  { codigo: '38.00.000', descricao: 'Receitas não operacionais' },
  { codigo: '49.00.000', descricao: 'Fazenda' },
];

export const CENTRO_CUSTOS_TODAS = 'TODAS';

export function descricaoMascara(codigo: string): string | undefined {
  return DRE_MASCARAS_DEPARA.find((m) => m.codigo === codigo)?.descricao;
}
