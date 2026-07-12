/**
 * Padronização de erros e health check para os endpoints /api/contabil/*
 * (DRE Configurável integrada à API principal do ERP).
 */
import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/lib/api';

export interface DreErrorInfo {
  message: string;
  kind: 'api_offline' | 'erp_offline' | 'not_found' | 'auth' | 'functional';
}

function extractPayloadMessage(err: any): string | null {
  const detail =
    err?.response?.data?.detail ??
    err?.detail ??
    err?.data?.detail;
  if (detail) return typeof detail === 'string' ? detail : JSON.stringify(detail);
  const message =
    err?.response?.data?.message ??
    err?.data?.message;
  if (message && typeof message === 'string') return message;
  return null;
}

export function describeDreError(err: any): DreErrorInfo {
  const status = err?.statusCode ?? err?.status ?? err?.response?.status;
  const raw = String(err?.message ?? '');
  const payload = extractPayloadMessage(err);
  const all = `${payload ?? ''} ${raw}`.toLowerCase();

  if (status === 401) {
    return { kind: 'auth', message: 'Sessão expirada. Faça login novamente.' };
  }

  // Falha de rede / API fora do ar.
  if (
    err?.name === 'TypeError' ||
    /failed to fetch|networkerror|load failed|ecconnrefused|econnreset/.test(all) ||
    (!status && !payload && /fetch/i.test(raw))
  ) {
    return {
      kind: 'api_offline',
      message: 'Não foi possível acessar a API contábil. Verifique se a API ERP está em execução na porta 8070.',
    };
  }

  // Banco ERP inacessível a partir da API.
  if (
    /172\.16\.137\.100:1433/.test(all) ||
    /(timeout|timed out|conex[aã]o|connection).*(sql|server|1433|senior|pymssql|pyodbc)/.test(all) ||
    /(pymssql|pyodbc|odbc|sql\s?server).*(timeout|refused|unreachable|conex)/.test(all) ||
    /vpn/.test(all)
  ) {
    return {
      kind: 'erp_offline',
      message: 'A API está online, mas não conseguiu acessar o banco do ERP. Verifique a VPN ou a conexão com o servidor Senior.',
    };
  }

  if (status === 404) {
    return {
      kind: 'not_found',
      message: 'Rota da DRE não encontrada na API principal. Verifique se a versão integrada do backend foi reiniciada.',
    };
  }

  return { kind: 'functional', message: payload ?? raw ?? 'Erro ao consultar a API contábil.' };
}

/** Checagem única de disponibilidade da API principal via /openapi.json. */
export function useDreApiHealth() {
  return useQuery({
    queryKey: ['dre-api-health'],
    queryFn: async () => {
      const url = `${getApiUrl()}/openapi.json`;
      const resp = await fetch(url, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      if (!resp.ok) throw new Error(`openapi.json HTTP ${resp.status}`);
      return true;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
