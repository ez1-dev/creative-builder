import { supabase } from '@/integrations/supabase/client';
import { resolveScreen } from '@/lib/screenCatalog';

let heartbeatTimer: number | null = null;
let lastPath: string | null = null;
let sessionStartedAt: number = Date.now();
let forceLogoutTriggered = false;
let beforeUnloadBound = false;

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

async function checkForceLogout(userId: string) {
  if (forceLogoutTriggered) return;
  try {
    const { data } = await (supabase.from('user_sessions') as any)
      .select('force_logout_at')
      .eq('user_id', userId)
      .maybeSingle();
    const flag = data?.force_logout_at ? new Date(data.force_logout_at).getTime() : 0;
    if (flag && flag > sessionStartedAt) {
      forceLogoutTriggered = true;
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
      try {
        const { toast } = await import('sonner');
        toast.error('Sua sessão foi encerrada por um administrador.');
      } catch { /* ignore */ }
      setTimeout(() => { window.location.href = '/login'; }, 300);
    }
  } catch { /* silencioso */ }
}

async function getCurrentUserInfo() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let displayName: string | null = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    displayName = data?.display_name ?? null;
  } catch { /* silencioso */ }
  return { id: user.id, email: user.email ?? null, displayName };
}

export async function trackPageView(path: string) {
  if (path === lastPath) return;
  lastPath = path;
  try {
    const info = await getCurrentUserInfo();
    if (!info) return;
    await (supabase.from('user_activity') as any).insert({
      user_id: info.id,
      user_email: info.email,
      event_type: 'page_view',
      path,
    });
    await (supabase.from('user_sessions') as any).upsert({
      user_id: info.id,
      user_email: info.email,
      display_name: info.displayName,
      last_seen_at: new Date().toISOString(),
      current_path: path,
      user_agent: navigator.userAgent,
    }, { onConflict: 'user_id' });
  } catch { /* fire-and-forget */ }
}

export async function trackAction(action: string, details?: Record<string, unknown>) {
  try {
    const info = await getCurrentUserInfo();
    if (!info) return;
    await (supabase.from('user_activity') as any).insert({
      user_id: info.id,
      user_email: info.email,
      event_type: 'action',
      path: typeof window !== 'undefined' ? window.location.pathname : null,
      action,
      details: details ?? null,
    });
  } catch { /* silencioso */ }
}

/** Resolve session_id da auth Supabase, com fallback local. */
async function getSessionId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (accessToken) {
      // Usa um sufixo determinístico do access token (não vaza o token).
      return `sb_${accessToken.slice(-12)}`;
    }
  } catch { /* ignore */ }
  return getLocalSessionId();
}

/**
 * Registra navegação por tela em usu_log_navegacao_erp.
 * Chamado automaticamente em cada mudança de rota.
 */
export async function trackNavegacao(
  path: string,
  acao: 'entrar' | 'sair' | 'click' | 'erro' = 'entrar',
  detalhes?: Record<string, unknown>,
) {
  try {
    const info = await getCurrentUserInfo();
    if (!info) return;
    const screen = resolveScreen(path);
    let erpUser: string | null = null;
    try { erpUser = localStorage.getItem('erp_user'); } catch { /* ignore */ }
    const sessionId = await getSessionId();
    await (supabase.from('usu_log_navegacao_erp') as any).insert({
      user_id: info.id,
      user_email: info.email,
      erp_user: erpUser,
      sistema: 'ERP_WEB',
      tela_codigo: screen.codigo,
      tela_nome: screen.nome,
      acao,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      session_id: sessionId,
      detalhes: detalhes ?? {},
    });
  } catch { /* fire-and-forget */ }
}

/** Liga listener global para registrar 'sair' quando a aba é fechada. */
export function bindNavegacaoUnload() {
  if (beforeUnloadBound || typeof window === 'undefined') return;
  beforeUnloadBound = true;
  window.addEventListener('beforeunload', () => {
    try {
      const path = window.location.pathname;
      // Tentativa best-effort. Pode falhar se o navegador já cortou requests.
      void trackNavegacao(path, 'sair');
    } catch { /* ignore */ }
  });
}

export function startHeartbeat() {
  if (heartbeatTimer !== null) return;
  sessionStartedAt = Date.now();
  forceLogoutTriggered = false;
  const tick = async () => {
    try {
      const info = await getCurrentUserInfo();
      if (!info) return;
      await (supabase.from('user_sessions') as any).upsert({
        user_id: info.id,
        user_email: info.email,
        display_name: info.displayName,
        last_seen_at: new Date().toISOString(),
        current_path: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: navigator.userAgent,
      }, { onConflict: 'user_id' });
      await checkForceLogout(info.id);
    } catch { /* silencioso */ }
  };
  tick();
  heartbeatTimer = window.setInterval(tick, 30000);
}

export function stopHeartbeat() {
  if (heartbeatTimer !== null) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
