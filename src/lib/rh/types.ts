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

export interface ContratoExperienciaKpis {
  qtde_contratos: number;
  vencidos_pendentes: number;
  demitidos_30_apos_exp: number;
  a_vencer_5_dias: number;
  a_vencer_10_dias: number;
}

export interface ContratoExperienciaVencimento {
  empresa: string;
  filial: string;
  cargo: string;
  matricula: string;
  colaborador: string;
  dt_admissao: string;
  dt_primeiro_vencimento: string;
  dt_segundo_vencimento: string;
  /** @deprecated Mantido para compat com relatórios antigos. */
  dt_vencimento?: string;
  dias_restantes: number | null;
  dias_vencido: number | null;
  status: string;
}

export interface ContratoExperienciaDashboard {
  kpis: ContratoExperienciaKpis;
  vencimentos: ContratoExperienciaVencimento[];
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

export interface ProgramacaoFeriasKpis {
  ferias_vencidas: number;
  a_vencer_30: number;
  a_vencer_60: number;
  a_vencer_90: number;
  ferias_total: number;
  de_ferias: number;
}

export interface LimiteFeriasPivotRow {
  ano: string;
  m1: number; m2: number; m3: number; m4: number; m5: number; m6: number;
  m7: number; m8: number; m9: number; m10: number; m11: number; m12: number;
  total: number;
}

export interface ProgramacaoProximos90Item {
  colaborador?: string;
  dt_inicio_periodo?: string;
  dt_fim_periodo?: string;
  dt_limite_saida?: string;
  dt_programacao?: string;
  qtd_dias_direito?: number;
  qtd_dias_programado?: number;
  qtd_dias_abono?: number;
  qtd_dias_saldo?: number;
}

export interface PrimeiroVencimentoSemProgramacaoItem {
  empresa?: string;
  filial?: string;
  colaborador?: string;
  dt_limite_saida?: string;
  qtd_dias_direito?: number;
  qtd_dias_saldo?: number;
  qtd_dias_programado?: number;
}

export type StatusPeriodoFerias =
  | "VENCIDA"
  | "A VENCER 30 DIAS"
  | "A VENCER 60 DIAS"
  | "A VENCER 90 DIAS"
  | "A VENCER"
  | string;

export interface ProgramacaoFeriasDetalheItem {
  empresa?: string;
  filial?: string;
  colaborador?: string;
  matricula?: string;
  cargo?: string;
  dt_inicio_periodo?: string;
  dt_fim_periodo?: string;
  dt_limite_saida?: string;
  dt_programacao?: string | null;
  qtd_dias_direito?: number;
  qtd_dias_programado?: number;
  qtd_dias_abono?: number;
  qtd_dias_saldo?: number;
  dias_ate_limite?: number;
  ano_limite?: string;
  mes_limite?: number;
  status?: StatusPeriodoFerias;
  [k: string]: any;
}

export interface DeFeriasDetalheItem {
  empresa?: string;
  filial?: string;
  colaborador?: string;
  matricula?: string;
  cargo?: string;
  dt_inicio_ferias?: string;
  [k: string]: any;
}

export interface FeriasVencidasDiagnostico {
  vencidas_estritas?: number;
  ate_60_dias?: number;
  ate_2_meses?: number;
  ate_fim_2_meses?: number;
  alvo_upquery?: number;
}

export interface ProgramacaoFeriasDashboard {
  kpis: ProgramacaoFeriasKpis;
  ativos_total?: number;
  ferias_vencidas_diagnostico?: FeriasVencidasDiagnostico;
  limite_ferias_pivot: LimiteFeriasPivotRow[];
  programacao_proximos_90_dias: ProgramacaoProximos90Item[];
  primeiro_vencimento_sem_programacao: PrimeiroVencimentoSemProgramacaoItem[];
  detalhe?: ProgramacaoFeriasDetalheItem[];
  de_ferias_detalhe?: DeFeriasDetalheItem[];
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

// ===== RH-05 Turnover =====
export interface TurnoverKpis {
  admitidos: number;
  demitidos: number;
  saldo: number;
  headcount_inicio: number;
  headcount_fim: number;
  headcount_medio: number;
  taxa_rotatividade_pct: number;
}
export interface TurnoverPorMes { anomes: string; admitidos: number; demitidos: number; }
export interface TurnoverPorMotivo { motivo: string; qtd: number; }
export interface TurnoverPorEmpresa { label: string; admitidos: number; demitidos: number; }
export interface TurnoverAdmitidoDetalhe {
  colaborador: string; matricula: string; empresa: string; filial: string; cargo: string; dt_admissao: string;
}
export interface TurnoverDemitidoDetalhe extends TurnoverAdmitidoDetalhe {
  dt_demissao: string; motivo: string;
}
export interface TurnoverDashboard {
  kpis: TurnoverKpis;
  por_mes: TurnoverPorMes[];
  por_motivo: TurnoverPorMotivo[];
  por_empresa: TurnoverPorEmpresa[];
  detalhe_admitidos: TurnoverAdmitidoDetalhe[];
  detalhe_demitidos: TurnoverDemitidoDetalhe[];
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
  salario_base?: number;
  salario_bruto?: number;
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
  cd_tp_evento?: string;
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
  fonte?: string;
  debug?: any;
  diagnostico?: any;
}


// ===== RH-06 Absenteísmo =====
export interface AbsenteismoKpis {
  taxa_absenteismo_pct: number;
  afastamentos: number;
  colaboradores_afastados: number;
  dias_perdidos: number;
  duracao_media_dias: number;
  headcount_medio: number;
  dias_periodo: number;
}
export interface AbsenteismoCategoriaItem {
  categoria: string;
  afastamentos: number;
  dias: number;
  colaboradores: number;
}
export interface AbsenteismoMotivoItem {
  codsit: number;
  motivo: string;
  categoria: string;
  absenteismo: boolean;
  afastamentos: number;
  dias: number;
}
export interface AbsenteismoMesItem {
  anomes: string;
  afastamentos: number;
  dias: number;
}
export interface AbsenteismoEmpresaItem {
  label: string;
  afastamentos: number;
  dias: number;
  colaboradores: number;
}
export interface AbsenteismoDetalheItem {
  colaborador: string;
  matricula: string;
  empresa: string;
  filial: string;
  cargo: string;
  motivo: string;
  categoria: string;
  codsit: number;
  dt_inicio: string;
  dt_fim: string;
  dias: number;
  cid: string | null;
}
export interface AbsenteismoDashboard {
  kpis: AbsenteismoKpis;
  por_categoria: AbsenteismoCategoriaItem[];
  por_motivo: AbsenteismoMotivoItem[];
  por_mes: AbsenteismoMesItem[];
  por_empresa: AbsenteismoEmpresaItem[];
  detalhe: AbsenteismoDetalheItem[];
}




export interface NovoFormularioPayload {
  cd_tp_formulario: string;
  ds_titulo: string;
  ds_descricao: string;
  cd_matricula: string;
  ds_colaborador: string;
  cd_status: string;
}
