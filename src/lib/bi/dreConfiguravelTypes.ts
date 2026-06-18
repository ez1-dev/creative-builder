// Tipos do contrato consumido na tela "Painel DRE Realizada" (BI Financeiro → DRE Configurável).
// Todos os valores são produzidos pelo FastAPI. O front não calcula DRE.

export type DreTipoCalculo = 'MENSAL' | 'ACUMULADO';

export interface DreFiltrosPainel {
  empresa?: string | number | null;
  filial?: string | number | null;
  data_ini: string;   // YYYY-MM-DD
  data_fim: string;   // YYYY-MM-DD
  modelo_id?: string | null;
  tipo?: DreTipoCalculo;
  comparar_orcamento?: boolean;
}

export interface DreRealizadoTotais {
  receita_operacional: number;
  custos: number;
  despesas: number;
  resultado_dre: number;
  margem_pct: number;
}

export interface DreRealizadoMensalRow {
  anomes: string; // YYYYMM
  receita_operacional: number;
  receita_bruta: number;
  deducoes: number;
  custos: number;
  despesas: number;
  receitas_nao_operacionais: number;
  resultado_dre: number;
}

export interface DreRealizadoResumo {
  totais: DreRealizadoTotais;
  mensal: DreRealizadoMensalRow[];
}

export interface DreModeloItem {
  id: string;
  nome: string;
  descricao?: string | null;
  status?: string | null;
}
