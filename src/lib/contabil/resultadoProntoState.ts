/**
 * Resolvedor único para o contrato tri-state do endpoint
 * GET /api/contabil/modelos/{id}/resultado-pronto.
 *
 * Status possíveis:
 *  - CONCLUIDO         → snapshot com correspondência exata dos parâmetros.
 *  - CACHE_APROXIMADO  → snapshot válido, porém materializado com parâmetros
 *                        diferentes dos solicitados. O valor deve ser exibido
 *                        com ressalva visual — NUNCA zerado.
 *  - SEM_CACHE         → nenhum snapshot disponível. Mostrar estado vazio
 *                        acionável, NUNCA "R$ 0,00".
 */

import type {
  ResultadoProntoAvisoParametros,
  ResultadoProntoStatus,
} from "@/types/contabil";

export interface ResultadoProntoState {
  temResultado: boolean;
  aproximado: boolean;
  semCache: boolean;
  status: ResultadoProntoStatus | null;
}

interface MetaLike {
  status?: ResultadoProntoStatus | string | null;
}

export function resolveResultadoProntoState(
  meta?: MetaLike | null,
): ResultadoProntoState {
  const raw = meta?.status ? String(meta.status).toUpperCase() : null;
  switch (raw) {
    case "CONCLUIDO":
      return { temResultado: true, aproximado: false, semCache: false, status: raw };
    case "CACHE_APROXIMADO":
      return { temResultado: true, aproximado: true, semCache: false, status: raw };
    case "SEM_CACHE":
      return { temResultado: false, aproximado: false, semCache: true, status: raw };
    default:
      return { temResultado: false, aproximado: false, semCache: false, status: raw };
  }
}

export function podeExibirValor(meta?: MetaLike | null): boolean {
  const s = resolveResultadoProntoState(meta);
  return s.temResultado;
}

/**
 * Comparação puramente visual entre parâmetros solicitados e do snapshot.
 * NUNCA usar essa lista para alterar valores numéricos do resultado.
 */
export function getParameterDifferences(
  solicitado?: Record<string, unknown> | null,
  snapshot?: Record<string, unknown> | null,
): Array<{ parametro: string; solicitado: unknown; snapshot: unknown }> {
  const src = solicitado ?? {};
  const snap = snapshot ?? {};
  const keys = new Set([...Object.keys(src), ...Object.keys(snap)]);
  return Array.from(keys)
    .filter((k) => JSON.stringify(src[k]) !== JSON.stringify(snap[k]))
    .map((parametro) => ({
      parametro,
      solicitado: src[parametro],
      snapshot: snap[parametro],
    }));
}

/**
 * Devolve as diferenças a partir do payload `aviso_parametros`, usando
 * `diferencas` quando o backend enviar, ou calculando via `solicitado` vs
 * `snapshot` como fallback puramente visual.
 */
export function resolveDiferencas(
  aviso?: ResultadoProntoAvisoParametros | null,
): Array<{ parametro: string; solicitado: unknown; snapshot: unknown }> {
  if (!aviso) return [];
  if (Array.isArray(aviso.diferencas) && aviso.diferencas.length > 0) {
    return aviso.diferencas.map((d) => ({
      parametro: String(d.parametro ?? ""),
      solicitado: d.solicitado,
      snapshot: d.snapshot,
    }));
  }
  return getParameterDifferences(aviso.solicitado, aviso.snapshot);
}
