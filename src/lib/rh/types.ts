// Tipos do módulo RH (consome FastAPI /api/rh/*)

export interface MenuItemRh {
  codigo: string;        // "01", "02", ...
  titulo: string;
  rota?: string;
  descricao?: string;
}

export interface ResumoFolhaItem {
  competencia?: string;
  matricula?: string;
  colaborador?: string;
  filial?: string;
  centro_custo?: string;
  evento?: string;
  descricao_evento?: string;
  tipo_evento?: string;
  referencia?: number | string;
  valor_evento?: number;
  provento?: number;
  desconto?: number;
  liquido_calculado?: number;
  data_pagamento?: string;
  [k: string]: any;
}

export interface QuadroColaboradorItem {
  matricula?: string;
  colaborador?: string;
  filial?: string;
  centro_custo?: string;
  cargo?: string;
  local?: string;
  vinculo?: string;
  sexo?: string;
  data_nascimento?: string;
  data_admissao?: string;
  situacao?: string;
  data_demissao?: string;
  cpf?: string;
  categoria_esocial?: string;
  [k: string]: any;
}

export type StatusContrato =
  | "VENCIDO"
  | "VENCE EM ATE 10 DIAS"
  | "VENCE EM ATE 30 DIAS"
  | "NO PRAZO"
  | string;

export interface ContratoExperienciaItem {
  matricula?: string;
  colaborador?: string;
  filial?: string;
  centro_custo?: string;
  cargo?: string;
  data_admissao?: string;
  dias_contrato?: number;
  dias_prorrogacao?: number;
  fim_contrato_1?: string;
  fim_contrato_final?: string;
  dias_restantes?: number;
  status_contrato?: StatusContrato;
  [k: string]: any;
}

export type StatusFerias =
  | "LIMITE VENCIDO"
  | "LIMITE ATE 30 DIAS"
  | "SEM PROGRAMACAO"
  | "OK"
  | string;

export interface ProgramacaoFeriasItem {
  matricula?: string;
  colaborador?: string;
  filial?: string;
  centro_custo?: string;
  cargo?: string;
  situacao_colaborador?: string;
  situacao_ferias?: string;
  inicio_periodo?: string;
  fim_periodo?: string;
  limite_saida?: string;
  dias_direito?: number;
  dias_saldo?: number;
  data_programacao?: string;
  dias_programados?: number;
  dias_abono?: number;
  fim_programacao?: string;
  status_ferias?: StatusFerias;
  [k: string]: any;
}

export interface FormularioRh {
  id?: number | string;
  cd_tp_formulario?: string;
  ds_titulo?: string;
  ds_descricao?: string;
  cd_matricula?: string;
  ds_colaborador?: string;
  cd_status?: string;
  criado_em?: string;
  [k: string]: any;
}

export interface ResumoFolhaKpis {
  provento: number;
  desconto: number;
  total_liquido: number;
  custo_total: number;
  beneficios: number;
  inss_total: number;
  hora_extra: number;
  provisoes: number;
  custo_ferias: number;
  rescisoes: number;
  fgts: number;
}

export interface ResumoFolhaEventoAgg {
  codigo?: string;
  cd_evento?: string;
  descricao?: string;
  ds_evento?: string;
  valor: number;
}

export interface ResumoFolhaFilialAgg {
  cd_filial?: string;
  filial: string;
  salario_base?: number;
  custo_total?: number;
  /** Backend envia como "H:MM" (string) ou número. */
  qtd_horas?: string | number;
  custo_hora_extra?: number;
  /** Backend envia como "H:MM" (string) ou número. */
  qtd_hora_extra?: string | number;
  liquido?: number;
  fgts?: number;
  beneficios?: number;
  va?: number;
  inss?: number;
  custo_ferias?: number;
  prov_ferias?: number;
  prov_13?: number;
  proventos?: number;
  descontos?: number;
  provisoes?: number;
  [k: string]: any;
}



export interface ResumoFolhaTipoEventoAgg {
  tipo: string;
  valor: number;
}

export interface ResumoFolhaMensalAgg {
  competencia: string;
  custo_hora_extra?: number;
  custo_mensal?: number;
  provento?: number;
  desconto?: number;
  total_liquido?: number;
}

export interface ResumoFolhaDashboard {
  kpis: ResumoFolhaKpis;
  proventos_vantagens: ResumoFolhaEventoAgg[];
  descontos: ResumoFolhaEventoAgg[];
  filiais: ResumoFolhaFilialAgg[];
  tipos_evento: ResumoFolhaTipoEventoAgg[];
  mensal?: ResumoFolhaMensalAgg[];
  /** Chaves de kpis que NÃO vieram no payload (uso interno da UI). */
  _missing_kpis?: string[];
}


export interface NovoFormularioPayload {
  cd_tp_formulario: string;
  ds_titulo: string;
  ds_descricao: string;
  cd_matricula: string;
  ds_colaborador: string;
  cd_status: string;
}
