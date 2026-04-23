import { supabase } from '@/integrations/supabase/client';

let heartbeatTimer: number | null = null;
let lastPath: string | null = null;

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

export function startHeartbeat() {
  if (heartbeatTimer !== null) return;
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
    } catch { /* silencioso */ }
  };
  tick();
  heartbeatTimer = window.setInterval(tick, 60000);
}

export function stopHeartbeat() {
  if (heartbeatTimer !== null) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
