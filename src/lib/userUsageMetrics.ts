// Utilitários puros para cálculo de métricas de uso a partir de user_activity
// Premissa: cada page_view (e cada heartbeat) é um "tick". Gap entre ticks
// consecutivos do mesmo usuário <= IDLE_THRESHOLD_MS conta como tempo de uso.

export const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

export interface ActivityEvent {
  user_id: string | null;
  user_email: string | null;
  event_type: string; // 'page_view' | 'action'
  path: string | null;
  action: string | null;
  created_at: string;
}

export interface UserUsageStats {
  userKey: string;
  user_email: string;
  display_name?: string | null;
  totalSeconds: number;
  sessions: number;
  pageViews: number;
  actions: number;
  lastSeenAt: string;
  favoriteModule: string;
}

/** Agrupa um path em "módulo raiz" (ex: /producao/dashboard -> /producao). */
export function moduleFromPath(path: string | null | undefined): string {
  if (!path) return 'outros';
  const cleaned = path.split('?')[0].split('#')[0];
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length === 0) return 'home';
  // Subseções de produção mantêm o prefixo
  if (parts[0] === 'producao') return '/producao';
  return `/${parts[0]}`;
}

/** Nome amigável do módulo. */
export function moduleLabel(mod: string): string {
  const map: Record<string, string> = {
    '/estoque': 'Estoque',
    '/estoque-min-max': 'Estoque Min/Max',
    '/sugestao-min-max': 'Sugestão Min/Max',
    '/onde-usa': 'Onde Usa',
    '/bom': 'Estrutura (BOM)',
    '/compras-produto': 'Compras / Custos',
    '/painel-compras': 'Painel de Compras',
    '/auditoria-tributaria': 'Aud. Tributária',
    '/auditoria-apontamento-genius': 'Aud. Apont. Genius',
    '/conciliacao-edocs': 'Conciliação EDocs',
    '/notas-recebimento': 'NF Recebimento',
    '/contas-pagar': 'Contas a Pagar',
    '/contas-receber': 'Contas a Receber',
    '/numero-serie': 'Reserva Nº Série',
    '/producao': 'Produção',
    '/configuracoes': 'Configurações',
    home: 'Início',
    outros: 'Outros',
  };
  return map[mod] ?? mod;
}

/** Estima sessões e tempo de uso por usuário. */
export function estimateSessions(events: ActivityEvent[]): UserUsageStats[] {
  const byUser = new Map<string, ActivityEvent[]>();
  for (const ev of events) {
    const key = ev.user_email ?? ev.user_id ?? 'desconhecido';
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key)!.push(ev);
  }

  const result: UserUsageStats[] = [];
  for (const [userKey, list] of byUser.entries()) {
    list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    let totalMs = 0;
    let sessions = list.length > 0 ? 1 : 0;
    let pageViews = 0;
    let actions = 0;
    const moduleCount = new Map<string, number>();

    for (let i = 0; i < list.length; i++) {
      const ev = list[i];
      if (ev.event_type === 'page_view') pageViews++;
      else if (ev.event_type === 'action') actions++;
      const mod = moduleFromPath(ev.path);
      moduleCount.set(mod, (moduleCount.get(mod) ?? 0) + 1);

      if (i > 0) {
        const gap = +new Date(ev.created_at) - +new Date(list[i - 1].created_at);
        if (gap <= IDLE_THRESHOLD_MS) {
          totalMs += gap;
        } else {
          sessions++;
        }
      }
    }

    let favoriteModule = 'outros';
    let max = -1;
    for (const [m, c] of moduleCount.entries()) {
      if (c > max) { max = c; favoriteModule = m; }
    }

    result.push({
      userKey,
      user_email: list[0]?.user_email ?? userKey,
      totalSeconds: Math.round(totalMs / 1000),
      sessions,
      pageViews,
      actions,
      lastSeenAt: list[list.length - 1]?.created_at ?? '',
      favoriteModule,
    });
  }

  return result.sort((a, b) => b.totalSeconds - a.totalSeconds);
}

/** Top N usuários por horas de uso. */
export function topUsersByHours(stats: UserUsageStats[], n = 15) {
  return stats.slice(0, n).map(s => ({
    user: s.user_email,
    horas: +(s.totalSeconds / 3600).toFixed(2),
    sessoes: s.sessions,
  }));
}

/** Distribuição por hora do dia (0-23). */
export function aggregateByHour(events: ActivityEvent[]) {
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hora: h, eventos: 0 }));
  for (const ev of events) {
    const d = new Date(ev.created_at);
    buckets[d.getHours()].eventos++;
  }
  return buckets;
}

/** Distribuição por dia da semana (Dom-Sáb). */
export function aggregateByWeekday(events: ActivityEvent[]) {
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const buckets = labels.map(d => ({ dia: d, eventos: 0 }));
  for (const ev of events) {
    const d = new Date(ev.created_at);
    buckets[d.getDay()].eventos++;
  }
  return buckets;
}

/** Distribuição por módulo. */
export function aggregateByModule(events: ActivityEvent[]) {
  const counts = new Map<string, number>();
  for (const ev of events) {
    const mod = moduleFromPath(ev.path);
    counts.set(mod, (counts.get(mod) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([mod, eventos]) => ({ modulo: moduleLabel(mod), key: mod, eventos }))
    .sort((a, b) => b.eventos - a.eventos);
}

/** Acessos por dia (linha do tempo). */
export function aggregateByDay(events: ActivityEvent[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const ev of events) {
    const k = ev.created_at.slice(0, 10);
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([data, eventos]) => ({
    data: data.slice(5).split('-').reverse().join('/'),
    eventos,
  }));
}

/** Formata segundos em "Xh Ym". */
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 60) return `${totalSeconds || 0}s`;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}
