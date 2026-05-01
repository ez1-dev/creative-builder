// Cliente híbrido para o log de navegação ERP.
// 1) Tenta POST /api/navegacao/log no FastAPI externo (ngrok).
// 2) Se falhar, faz fallback para a edge function navegacao-log no Lovable Cloud.
// 3) Lembra qual canal está vivo por ~60s para não tentar o canal morto a cada navegação.

import { api } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { resolveScreen } from '@/lib/screenCatalog';

export type NavegacaoAcao =
  | 'ABRIU_TELA'
  | 'TROCOU_TELA'
  | 'FECHOU_TELA'
  | 'HEARTBEAT';

export interface NavegacaoPayload {
  sistema: string;
  cod_tela: string;
  nome_tela: string;
  acao: NavegacaoAcao;
  path_url: string;
  observacao?: string | null;
  session_id?: string | null;
  computador?: string | null;
  origem_evento: string;
  detalhes?: Record<string, unknown>;
}

type Channel = 'fastapi' | 'edge';
const STICKY_TTL_MS = 60_000;
let stickyChannel: { ch: Channel; until: number } | null = null;

const LOCAL_SID_KEY = 'sapiens_local_sid';
function getLocalSessionId(): string {
  try {
    let sid = localStorage.getItem(LOCAL_SID_KEY);
    if (!sid) {
      sid = `sid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(LOCAL_SID_KEY, sid);
    }
    return sid;
  } catch {
    return `sid_${Date.now().toString(36)}`;
  }
}

async function getSupabaseSessionId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (accessToken) return `sb_${accessToken.slice(-12)}`;
  } catch { /* ignore */ }
  return getLocalSessionId();
}

function buildPayload(path: string, acao: NavegacaoAcao, sessionId: string): NavegacaoPayload {
  const screen = resolveScreen(path);
  return {
    sistema: 'ERP_WEB',
    cod_tela: screen.codigo,
    nome_tela: screen.nome,
    acao,
    path_url: path,
    observacao: null,
    session_id: sessionId,
    computador: typeof navigator !== 'undefined' ? navigator.platform : null,
    origem_evento: 'ERP_WEB',
  };
}

async function tryFastApi(payload: NavegacaoPayload, endpoint: string): Promise<boolean> {
  // Só tenta o FastAPI se já tivermos o token de ERP local.
  if (!api.isAuthenticated()) return false;
  try {
    // Race contra um timeout curto pra não travar a navegação.
    const result = await Promise.race([
      api.post<unknown>(endpoint, payload as any).then(() => true).catch(() => false),
      new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 3000)),
    ]);
    return result === true;
  } catch {
    return false;
  }
}

async function tryEdge(payload: NavegacaoPayload): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('navegacao-log', { body: payload });
    return !error;
  } catch {
    return false;
  }
}

async function postLog(payload: NavegacaoPayload): Promise<void> {
  const now = Date.now();
  const order: Channel[] =
    stickyChannel && stickyChannel.until > now
      ? (stickyChannel.ch === 'fastapi' ? ['fastapi', 'edge'] : ['edge', 'fastapi'])
      : ['fastapi', 'edge'];

  // Endpoint dedicado para heartbeat; demais ações vão para /log.
  const fastApiEndpoint =
    payload.acao === 'HEARTBEAT' ? '/api/navegacao/heartbeat' : '/api/navegacao/log';

  for (const ch of order) {
    const ok = ch === 'fastapi' ? await tryFastApi(payload, fastApiEndpoint) : await tryEdge(payload);
    if (ok) {
      stickyChannel = { ch, until: Date.now() + STICKY_TTL_MS };
      return;
    }
  }
  // Se ambos falharam, limpa sticky pra tentar de novo no próximo evento.
  stickyChannel = null;
}

async function logEvento(path: string, acao: NavegacaoAcao): Promise<void> {
  try {
    const sessionId = await getSupabaseSessionId();
    await postLog(buildPayload(path, acao, sessionId));
  } catch {
    // fire-and-forget
  }
}

export const logAbriuTela   = (path: string) => logEvento(path, 'ABRIU_TELA');
export const logTrocouTela  = (path: string) => logEvento(path, 'TROCOU_TELA');
export const logFechouTela  = (path: string) => logEvento(path, 'FECHOU_TELA');
export const logHeartbeat   = (path: string) => logEvento(path, 'HEARTBEAT');

/** Best-effort no beforeunload via sendBeacon (ignora resposta). */
export function bindBeforeUnloadFechouTela() {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    try {
      const path = window.location.pathname;
      // sendBeacon não nos deixa enviar Authorization; deixamos o postLog tentar
      // de forma assíncrona — pode não chegar a completar, mas é best-effort.
      void logFechouTela(path);
    } catch { /* ignore */ }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}
