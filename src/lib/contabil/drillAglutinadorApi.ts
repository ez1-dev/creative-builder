// Cliente do drill-down de aglutinadores contábeis.
// Endpoints:
//   GET /api/contabil/aglutinadores/{codagl}/drill
//   GET /api/contabil/contas/{ctared}/rollup
// Ambos servidos pela API contábil (mesma base do resto do módulo).
import { contabilApi } from './contabilApi';

export type AglutinadorBase = 'auto' | 'saldo' | 'movimento';
export type ComponenteTipo = 'aglutinador' | 'conta';
export type DrillContinuacaoTipo = 'aglutinador' | 'razao';

export interface DrillContinuacao {
  tipo: DrillContinuacaoTipo;
  endpoint: string;
  params: Record<string, any>;
}

export interface AglutinadorComponente {
  tipo: ComponenteTipo;
  operador: '+' | '-';
  codagl?: number | null;
  ctared?: number | null;
  clacta?: string | null;
  descricao: string;
  valor: number;
  drill?: DrillContinuacao | null;
}

export interface AglutinadorDrillNode {
  codagl: number;
  descricao: string;
  base: AglutinadorBase | string;
  total: number;
  componentes: AglutinadorComponente[];
}

export interface AglutinadorDrillParams {
  anomes_ini: number | string;
  anomes_fim: number | string;
  codemp?: number | string;
  codfil?: number | string;
  base?: AglutinadorBase;
}

export function fetchAglutinadorDrill(
  codagl: number,
  params: AglutinadorDrillParams,
): Promise<AglutinadorDrillNode> {
  const query: Record<string, any> = {
    anomes_ini: params.anomes_ini,
    anomes_fim: params.anomes_fim,
    codemp: params.codemp ?? 1,
  };
  if (params.codfil != null) query.codfil = params.codfil;
  if (params.base) query.base = params.base;
  return contabilApi.get<AglutinadorDrillNode>(
    `/api/contabil/aglutinadores/${codagl}/drill`,
    query,
  );
}

export interface ContaRollupAglutinador {
  codagl: number;
  descricao: string;
  direto: boolean;
}

export interface ContaRollup {
  ctared: number;
  conta: { clacta?: string | null; descricao?: string | null };
  aglutinadores: ContaRollupAglutinador[];
  indicadores_afetados: string[];
}

export function fetchContaRollup(
  ctared: number,
  codemp: number | string = 1,
): Promise<ContaRollup> {
  return contabilApi.get<ContaRollup>(
    `/api/contabil/contas/${ctared}/rollup`,
    { codemp },
  );
}
