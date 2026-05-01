import { api } from './api';
import { toast } from 'sonner';

export const TABELAS_E099 = [
  'E099USU',
  'E099CPR',
  'E099FIN',
  'E099GCO',
  'E099UCP',
  'E099UDE',
  'E099USE',
  'E099UVE',
] as const;

export type TabelaE099 = typeof TABELAS_E099[number];

export interface SguUsuario {
  codusu: number;
  nomusu: string;
  tipcol?: string | number | null;
  empcol?: string | number | null;
  filcol?: string | number | null;
  existe_r910: 0 | 1;
  existe_r999: 0 | 1;
  qtd_empresas_e099usu: number;
  [k: string]: any;
}

export interface ResumoAcessos {
  codusu: number;
  tabelas: Array<{ tabela: string; qtd: number }>;
  [k: string]: any;
}

export interface CompararResultadoLinha {
  tabela: string;
  qtd_origem: number;
  qtd_destino: number;
}

export interface CompararResultado {
  usuario_origem: number;
  usuario_destino: number;
  tabelas: CompararResultadoLinha[];
}

export type AcaoCampo = 'ALTERAR' | 'MANTER' | 'INSERIR' | 'IGNORAR' | 'ERRO';

export interface PreviewCampoLinha {
  tabela: string;
  empresa?: string | number | null;
  campo: string;
  valor_origem: any;
  valor_destino: any;
  acao: AcaoCampo;
  motivo?: string | null;
}

export interface PreviewCamposResultado {
  usuario_origem: number;
  usuario_destino: number;
  total_diferencas: number;
  total_alterar: number;
  total_manter: number;
  total_inserir: number;
  total_ignorar?: number;
  diferencas: PreviewCampoLinha[];
}

export interface DuplicarParametrosResultado {
  ok: boolean;
  mensagem?: string;
  detalhes?: any;
}

const ts = () => new Date().toISOString();

function logCall(method: string, url: string, status: number | string, response: any) {
  // eslint-disable-next-line no-console
  console.info('[SGU]', { url, method, status, response, ts: ts() });
}

function handleError(err: any, context: string): never {
  const status = err?.statusCode;
  let msg: string;

  if (err?.isNetworkError || status === 0) {
    msg = 'Backend ERP/ngrok offline. Verifique se a API está ativa.';
  } else if (status === 401) {
    api.logout();
    msg = 'Token expirado ou inválido.';
  } else if (status === 403) {
    msg = 'Usuário sem permissão para administrar SGU.';
  } else if (status === 404) {
    msg = 'Endpoint SGU ainda não publicado no backend.';
  } else if (status === 422) {
    msg = err?.message || 'Erro de validação.';
  } else if (status === 500) {
    msg = `Erro interno do backend SGU: ${err?.message ?? 'erro desconhecido'}`;
  } else {
    msg = err?.message || `Erro ao chamar ${context}`;
  }

  logCall('ERR', context, status ?? 'no-status', err);
  toast.error(msg);
  const e: any = new Error(msg);
  e.statusCode = status;
  e.original = err;
  throw e;
}

async function withRetryOn401<T>(fn: () => Promise<T>, context: string): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (err?.statusCode === 401) {
      api.logout();
      try {
        return await fn();
      } catch (err2) {
        handleError(err2, context);
      }
    }
    handleError(err, context);
  }
}

export function ensureAuthenticated(): boolean {
  if (!api.getToken()) {
    toast.error('Sessão expirada. Faça login novamente para usar a Gestão SGU.');
    return false;
  }
  return true;
}

export async function getUsuarios(filtro: string): Promise<SguUsuario[]> {
  const url = '/api/sgu/usuarios';
  return withRetryOn401(async () => {
    const data = await api.get<any>(url, { filtro });
    logCall('GET', `${url}?filtro=${filtro}`, 200, data);
    return Array.isArray(data) ? data : data?.dados ?? data?.usuarios ?? [];
  }, url);
}

export async function getUsuario(codusu: number): Promise<SguUsuario> {
  const url = `/api/sgu/usuarios/${codusu}`;
  return withRetryOn401(async () => {
    const data = await api.get<SguUsuario>(url);
    logCall('GET', url, 200, data);
    return data;
  }, url);
}

export async function getResumoAcessos(codusu: number): Promise<ResumoAcessos> {
  const url = `/api/sgu/usuarios/${codusu}/resumo-acessos`;
  return withRetryOn401(async () => {
    const data = await api.get<ResumoAcessos>(url);
    logCall('GET', url, 200, data);
    return data;
  }, url);
}

export async function compararUsuarios(
  usuario_origem: number,
  usuario_destino: number,
): Promise<CompararResultado> {
  const url = '/api/sgu/usuarios/comparar';
  return withRetryOn401(async () => {
    const data = await api.post<any>(url, { usuario_origem, usuario_destino });
    logCall('POST', url, 200, data);
    const tabelas = Array.isArray(data?.tabelas) ? data.tabelas : Array.isArray(data) ? data : [];
    return { usuario_origem, usuario_destino, tabelas };
  }, url);
}

export async function duplicarPreviewCampos(params: {
  usuario_origem: number;
  usuario_destino: number;
  tabelas?: readonly string[];
  mostrar_campos_iguais?: boolean;
}): Promise<PreviewCamposResultado> {
  const url = '/api/sgu/usuarios/duplicar-preview-campos';
  const body = {
    usuario_origem: params.usuario_origem,
    usuario_destino: params.usuario_destino,
    tabelas: Array.from(params.tabelas ?? TABELAS_E099),
    mostrar_campos_iguais: !!params.mostrar_campos_iguais,
  };
  return withRetryOn401(async () => {
    const data = await api.post<any>(url, body);
    logCall('POST', url, 200, data);
    const diferencas: PreviewCampoLinha[] = data?.diferencas ?? data?.dados ?? [];
    const totalAlterar = data?.total_alterar ?? diferencas.filter((d) => d.acao === 'ALTERAR').length;
    const totalManter = data?.total_manter ?? diferencas.filter((d) => d.acao === 'MANTER').length;
    const totalInserir = data?.total_inserir ?? diferencas.filter((d) => d.acao === 'INSERIR').length;
    const totalIgnorar = data?.total_ignorar ?? diferencas.filter((d) => d.acao === 'IGNORAR').length;
    const totalDiferencas =
      data?.total_diferencas ?? diferencas.filter((d) => d.acao !== 'MANTER').length;
    return {
      usuario_origem: params.usuario_origem,
      usuario_destino: params.usuario_destino,
      total_diferencas: totalDiferencas,
      total_alterar: totalAlterar,
      total_manter: totalManter,
      total_inserir: totalInserir,
      total_ignorar: totalIgnorar,
      diferencas,
    };
  }, url);
}

export async function duplicarParametros(params: {
  usuario_origem: number;
  usuario_destino: number;
  motivo: string;
  tabelas?: readonly string[];
}): Promise<DuplicarParametrosResultado> {
  const url = '/api/sgu/usuarios/duplicar-parametros';
  const body = {
    usuario_origem: params.usuario_origem,
    usuario_destino: params.usuario_destino,
    motivo: params.motivo,
    confirmar: true,
    tabelas: Array.from(params.tabelas ?? TABELAS_E099),
  };
  return withRetryOn401(async () => {
    const data = await api.post<any>(url, body);
    logCall('POST', url, 200, data);
    return { ok: true, mensagem: data?.mensagem, detalhes: data };
  }, url);
}
