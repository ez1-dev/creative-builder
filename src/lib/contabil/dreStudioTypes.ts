// Tipagem do módulo DRE Studio (rotas /api/contabil/*).
// Portada e enxugada de types/contabil.ts do projeto de referência.

export type TipoModelo = 'DRE' | 'BALANCO';
export type TipoLinha = 'GRUPO' | 'ANALITICA' | 'SUBTOTAL' | 'TOTAL' | 'FORMULA';
export type Operador = 'SOMA' | 'SUBTRAI';
export type NaturezaLinha =
  | 'RECEITA' | 'DEDUCAO' | 'CUSTO' | 'DESPESA' | 'RESULTADO'
  | 'ATIVO' | 'PASSIVO' | 'PATRIMONIO' | 'VINCULAR' | 'OUTROS';

export const TIPOS_LINHA: TipoLinha[] = ['GRUPO', 'ANALITICA', 'SUBTOTAL', 'TOTAL', 'FORMULA'];
export const OPERADORES: Operador[] = ['SOMA', 'SUBTRAI'];
export const NATUREZAS: NaturezaLinha[] = [
  'RECEITA', 'DEDUCAO', 'CUSTO', 'DESPESA', 'RESULTADO',
  'ATIVO', 'PASSIVO', 'PATRIMONIO', 'VINCULAR', 'OUTROS',
];

export interface DreHealth {
  status?: string;
  api?: string | boolean;
  erp?: string | boolean | { status?: string; mensagem?: string | null };
  supabase?: string | boolean | { status?: string; mensagem?: string | null };
  mensagem?: string | null;
  [k: string]: any;
}

export interface DreModelo {
  id: string;
  codemp: number;
  nome: string;
  tipo_modelo: TipoModelo;
  descricao?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DreLinha {
  id: string;
  modelo_id: string;
  linha_pai_id: string | null;
  ordem: number;
  codigo: string;
  descricao: string;
  tipo_linha: TipoLinha;
  natureza: NaturezaLinha | null;
  operador: Operador;
  sinal: 1 | -1;
  exibir: boolean;
  negrito: boolean;
  formula?: string | null;
}

export interface DreContaVinculada {
  id: string;
  linha_id: string;
  codemp: number;
  ctared: number;
  clacta: string;
  descta: string;
  nivcta: number;
  anasin: 'A' | 'S';
  incluir_subcontas: boolean;
  sinal: 1 | -1;
}

export interface DrePlanoConta {
  codemp: number;
  ctared: number;
  clacta: string;
  descta: string;
  nivcta: number;
  anasin: 'A' | 'S';
  sitcta?: string;
  eh_analitica?: 0 | 1 | boolean;
}

export interface DreCentroCusto {
  codemp: number;
  codccu: string;
  desccu: string;
  sitccu?: string;
}

export interface DreModeloDetalhe {
  modelo: DreModelo;
  linhas: DreLinha[];
  contas?: DreContaVinculada[];
}

export interface DreOrcamentoItem {
  id?: string;
  modelo_id: string;
  linha_id: string;
  codemp: number;
  codfil: number;
  codccu?: string | null;
  ctared?: number | null;
  anomes: number;
  valor_orcado: number;
}

export interface DreResultadoLinha {
  linha_id: string;
  codigo: string;
  descricao: string;
  tipo_linha: TipoLinha;
  natureza?: NaturezaLinha | null;
  negrito?: boolean;
  exibir?: boolean;
  linha_pai_id: string | null;
  ordem?: number;
  realizado: Record<string, number | null>;
  orcado: Record<string, number | null>;
  variacao?: Record<string, number | null>;
  variacao_percentual?: Record<string, number | null>;
}

export interface DreResultadoResponse {
  modelo_id: string;
  colunas: string[];
  periodos?: string[];
  linhas: DreResultadoLinha[];
  fonte?: string | null;
  origem?: string | null;
  atualizado_em?: string | null;
}
