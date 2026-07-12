import { describeDreError as baseDescribe } from '@/lib/bi/dreErrors';

export type DreStudioErrorKind =
  | 'api_offline'
  | 'erp_offline'
  | 'supabase_dre_offline'
  | 'not_found'
  | 'modelo_not_found'
  | 'estrutura_vazia'
  | 'sem_resultado'
  | 'endpoint_indisponivel'
  | 'conflito'
  | 'auth'
  | 'functional';

export interface DreStudioError {
  kind: DreStudioErrorKind;
  message: string;
}

function extractPayloadMessage(err: any): string | null {
  const detail = err?.response?.data?.detail ?? err?.details?.detail ?? err?.detail;
  if (detail) return typeof detail === 'string' ? detail : JSON.stringify(detail);
  const message = err?.response?.data?.message ?? err?.details?.message;
  if (message && typeof message === 'string') return message;
  return null;
}

/**
 * Padroniza mensagens de erro para o DRE Studio.
 * Reaproveita describeDreError (BI) e adiciona kinds específicos do módulo.
 */
export function describeDreStudioError(err: any): DreStudioError {
  const status = err?.statusCode ?? err?.status ?? err?.response?.status;
  const raw = String(err?.message ?? '');
  const payload = extractPayloadMessage(err);
  const all = `${payload ?? ''} ${raw}`.toLowerCase();

  if (/supabase|service_role|storage.*dre|arquiv.*configura/.test(all)) {
    return {
      kind: 'supabase_dre_offline',
      message: 'O armazenamento de configuração da DRE não está disponível no momento.',
    };
  }

  if (status === 409) {
    return { kind: 'conflito', message: payload ?? 'Conflito ao gravar. Registro já existente.' };
  }

  if (status === 405 || status === 501) {
    return {
      kind: 'endpoint_indisponivel',
      message: 'Este recurso ainda não está disponível na versão atual da API.',
    };
  }

  const base = baseDescribe(err);
  if (base.kind === 'not_found') {
    return { kind: 'modelo_not_found', message: 'Modelo de DRE não encontrado.' };
  }
  return { kind: base.kind as DreStudioErrorKind, message: base.message };
}

export function isEmptyStructure(len: number | undefined | null): DreStudioError | null {
  if (!len) {
    return { kind: 'estrutura_vazia', message: 'Este modelo ainda não possui linhas configuradas.' };
  }
  return null;
}
