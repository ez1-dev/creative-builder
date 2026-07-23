// Cliente da API de Indicadores Contábeis.
// Reusa o contabilApi (base + Bearer + ngrok header + timeouts).
import { contabilApi } from './contabilApi';

export type IndicadorUnidade = 'R$' | '%' | 'dias' | 'índice';
export type IndicadorStatus = 'oficial' | 'gerencial' | 'simulado';

export interface Indicador {
  indicador: string;
  valor: number | null;
  unidade: IndicadorUnidade;
  formula: string;
  numerador: number | null;
  denominador: number | null;
  dias: number | null;
  tipo_saldo: 'final' | 'medio' | null;
  status: IndicadorStatus;
  avisos: string[];
}

export interface AnaliseIA {
  narrativa?: string;
  modelo?: string;
  erro?: string;
}

export interface IndicadoresPayload {
  indicadores: Indicador[];
  duplicidade_612_ativa?: boolean;
  analise?: AnaliseIA;
  meta?: Record<string, any>;
  [k: string]: any;
}

export interface IndicadoresParams {
  anomes_ini: number | string;
  anomes_fim: number | string;
  codemp?: number | string;
  codfil?: number | string;
}

export function fetchIndicadores(params: IndicadoresParams): Promise<IndicadoresPayload> {
  return contabilApi.get<IndicadoresPayload>('/api/contabil/indicadores', {
    codemp: 1,
    ...params,
  });
}

export function fetchIndicadoresComAnalise(params: IndicadoresParams): Promise<IndicadoresPayload> {
  return contabilApi.get<IndicadoresPayload>('/api/contabil/indicadores/analise', {
    codemp: 1,
    com_ia: true,
    ...params,
  }, { timeoutMs: 90000 });
}
