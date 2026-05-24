import { api } from '../api';

export type StatusProgramacao = 'PROGRAMADO' | 'EXECUTANDO' | 'CONCLUIDO' | 'CANCELADO' | string;
export type StatusGargalo = 'OK' | 'ATENCAO' | 'GARGALO' | 'SEM_PARAMETRO' | string;

export interface ProgramacaoFiltros {
  codemp?: number;
  data_ini?: string;
  data_fim?: string;
  situacoes?: string; // 'A,L'
  unidade_negocio?: string;
  tipo_recurso?: string;
  codcre?: string;
  status_programacao?: string;
  lote_programacao?: string;
}

export interface FilaOpRow {
  unidade_negocio: string;
  codcre: string;
  descre: string;
  codori: string;
  numorp: string | number;
  codpro: string;
  descricao_produto: string;
  codopr: string;
  descricao_operacao: string;
  quantidade_prevista: number;
  tempo_previsto_min: number;
  tempo_previsto_horas: number;
  prioridade: number;
  data_geracao_op: string | null;
}
export interface FilaOpsResponse {
  dados: FilaOpRow[];
  total_registros?: number;
}

export interface GerarProgramacaoPayload {
  data_ini?: string;
  data_fim?: string;
  data_inicio_programacao?: string;
  situacoes?: string;
  unidade_negocio?: string;
  codcre?: string;
  permitir_quebra_operacao?: boolean;
  limpar_anterior?: boolean;
}
export interface GerarProgramacaoResponse {
  lote_programacao: string;
  qtd_operacoes_fila: number;
  qtd_linhas_programadas: number;
  qtd_sem_capacidade: number;
  qtd_sem_saldo: number;
  recursos_sem_capacidade: { codcre: string; descre: string }[];
}

export interface AgendaRow {
  data_programada: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fim: string;
  codcre: string;
  descre: string;
  codori: string;
  numorp: string | number;
  codpro: string;
  codopr: string;
  descricao_operacao?: string;
  tempo_alocado_min: number;
  segmento: number | string;
  status_programacao: StatusProgramacao;
  lote_programacao?: string;
  unidade_negocio?: string;
  tipo_recurso?: string;
}
export interface AgendaResponse {
  dados: AgendaRow[];
  total_registros?: number;
}

export interface GargaloDiaRow {
  data: string;
  dia_semana: string;
  unidade_negocio: string;
  codcre: string;
  descre: string;
  carga_programada_horas: number;
  capacidade_disponivel_horas: number;
  ocupacao_perc: number;
  status: StatusGargalo;
}
export interface GargalosResponse {
  dados: GargaloDiaRow[];
  total_registros?: number;
}

export interface CapacidadeRow {
  codemp: number;
  codcre: string;
  descre?: string;
  minutos_dia: number;
  qtde_recursos: number;
  eficiencia_perc: number;
  hora_inicio: string;
  considerar_sabado: boolean;
  considerar_domingo: boolean;
  ativo: boolean;
  obs?: string;
}
export interface CapacidadesResponse {
  dados: CapacidadeRow[];
}

const toParams = (f: ProgramacaoFiltros): Record<string, any> => ({ ...f });

export const programacaoApi = {
  fila: (f: ProgramacaoFiltros) =>
    api.get<FilaOpsResponse>('/api/producao/programacao/fila', toParams(f)),

  gerar: (p: GerarProgramacaoPayload) =>
    api.post<GerarProgramacaoResponse>('/api/producao/programacao/gerar', p),

  agenda: (f: ProgramacaoFiltros) =>
    api.get<AgendaResponse>('/api/producao/programacao/agenda', toParams(f)),

  gargalos: (f: ProgramacaoFiltros) =>
    api.get<GargalosResponse>('/api/producao/programacao/gargalos-dias', toParams(f)),

  capacidades: (codemp?: number) =>
    api.get<CapacidadesResponse>('/api/producao/programacao/capacidades', codemp ? { codemp } : undefined),

  salvarCapacidades: (rows: CapacidadeRow[]) =>
    api.post<{ ok: boolean; salvos: number }>('/api/producao/programacao/capacidades', { dados: rows }),
};
