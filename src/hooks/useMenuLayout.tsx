import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  TOP_MENUS, TopMenu, Leaf, SubGroup, allLeaves, findTopIdForUrl,
} from '@/config/menuCatalog';
import { resolveIcon } from '@/config/menuIcons';

// ============= Types =============
export type MoveTarget = { topId: string; subGroupId?: string };

export type CustomTop = {
  id: string; kind: 'flat'; label: string; icon: string; position: number;
};
export type CustomSubGroup = {
  id: string; topId: string; label: string; icon: string; position: number;
};
export type CustomItem = {
  id: string; topId: string; subGroupId?: string;
  title: string; icon: string; url: string; external?: boolean;
  position: number;
};

export type MenuLayoutV2 = {
  version: 2;
  hidden: string[];
  hiddenGroups: string[];
  moves: Record<string, MoveTarget>;
  orders: Record<string, string[]>;
  renames: Record<string, string>;
  icons: Record<string, string>;
  customTops: CustomTop[];
  customSubGroups: CustomSubGroup[];
  customItems: CustomItem[];
};

export type MenuScope = 'user' | 'global';

const EMPTY: MenuLayoutV2 = {
  version: 2, hidden: [], hiddenGroups: [], moves: {}, orders: {},
  renames: {}, icons: {}, customTops: [], customSubGroups: [], customItems: [],
};

const CUSTOM_SUBGROUP_ID = 'personalizado';

// ============= Node id helpers =============
export const idTop = (topId: string) => `top:${topId}`;
export const idSub = (subId: string) => `sub:${subId}`;
export const idLeaf = (urlOrId: string) => `leaf:${urlOrId}`;

// ============= Normalization / migration =============
function normalize(raw: any): MenuLayoutV2 {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  const version = raw.version === 2 ? 2 : 1;
  const moves: Record<string, MoveTarget> = {};
  const rawMoves = raw.moves ?? {};
  for (const [url, val] of Object.entries(rawMoves)) {
    if (typeof val === 'string') moves[url] = { topId: val };
    else if (val && typeof val === 'object' && typeof (val as any).topId === 'string') {
      moves[url] = {
        topId: (val as any).topId,
        subGroupId: typeof (val as any).subGroupId === 'string' ? (val as any).subGroupId : undefined,
      };
    }
  }
  return {
    version: 2,
    hidden: Array.isArray(raw.hidden) ? raw.hidden : [],
    hiddenGroups: Array.isArray(raw.hiddenGroups) ? raw.hiddenGroups : [],
    moves,
    orders: raw.orders && typeof raw.orders === 'object' ? raw.orders : {},
    renames: version === 2 && raw.renames ? raw.renames : {},
    icons: version === 2 && raw.icons ? raw.icons : {},
    customTops: Array.isArray(raw.customTops) ? raw.customTops : [],
    customSubGroups: Array.isArray(raw.customSubGroups) ? raw.customSubGroups : [],
    customItems: Array.isArray(raw.customItems) ? raw.customItems : [],
  };
}

// ============= Cloud IO =============
async function loadUser(userId: string): Promise<MenuLayoutV2> {
  const { data } = await (supabase as any)
    .from('menu_layout_user')
    .select('layout')
    .eq('user_id', userId)
    .maybeSingle();
  return normalize(data?.layout);
}
async function saveUser(userId: string, layout: MenuLayoutV2) {
  const { error } = await (supabase as any)
    .from('menu_layout_user')
    .upsert({ user_id: userId, layout: layout as any, updated_at: new Date().toISOString() });
  if (error) throw error;
}
export type GlobalMeta = { updatedAt: string | null; updatedBy: string | null };
async function loadGlobalRow(): Promise<{ layout: MenuLayoutV2; meta: GlobalMeta }> {
  const { data } = await (supabase as any)
    .from('menu_layout_global')
    .select('layout, updated_at, updated_by')
    .eq('id', true)
    .maybeSingle();
  return {
    layout: normalize(data?.layout),
    meta: { updatedAt: data?.updated_at ?? null, updatedBy: data?.updated_by ?? null },
  };
}
async function saveGlobal(userId: string, layout: MenuLayoutV2) {
  const { error } = await (supabase as any)
    .from('menu_layout_global')
    .upsert({ id: true, layout: layout as any, updated_by: userId, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ============= Merge layouts (global + user) =============
export function mergeLayouts(a: MenuLayoutV2, b: MenuLayoutV2): MenuLayoutV2 {
  return {
    version: 2,
    hidden: Array.from(new Set([...a.hidden, ...b.hidden])),
    hiddenGroups: Array.from(new Set([...a.hiddenGroups, ...b.hiddenGroups])),
    moves: { ...a.moves, ...b.moves },
    orders: { ...a.orders, ...b.orders },
    renames: { ...a.renames, ...b.renames },
    icons: { ...a.icons, ...b.icons },
    customTops: dedup([...a.customTops, ...b.customTops], 'id'),
    customSubGroups: dedup([...a.customSubGroups, ...b.customSubGroups], 'id'),
    customItems: dedup([...a.customItems, ...b.customItems], 'id'),
  };
}
function dedup<T extends { id: string }>(arr: T[], key: keyof T): T[] {
  const map = new Map<string, T>();
  for (const it of arr) map.set(it[key] as any, it);
  return Array.from(map.values());
}

// ============= Apply layout to catalog =============
export function orderKey(topId: string, subGroupId?: string) {
  return subGroupId ? `${topId}:${subGroupId}` : topId;
}

export function applyLayout(
  baseMenus: TopMenu[],
  layout: MenuLayoutV2,
  opts: { keepHidden?: boolean } = {},
): TopMenu[] {
  const keepHidden = !!opts.keepHidden;
  const hidden = new Set(keepHidden ? [] : layout.hidden);
  const hiddenGroups = new Set(keepHidden ? [] : layout.hiddenGroups);

  // 1) Merge custom tops (as flat) into the base list
  const customTopsAsMenus: TopMenu[] = layout.customTops.map((ct) => ({
    id: ct.id,
    label: ct.label,
    icon: resolveIcon(ct.icon),
    kind: 'flat',
    items: [],
  }));
  let menus: TopMenu[] = [...baseMenus, ...customTopsAsMenus];

  // 2) Add custom subGroups to nested tops
  menus = menus.map((top) => {
    if (top.kind !== 'flat' && top.kind !== 'nested') return top;
    if (top.kind === 'flat') {
      // A flat top may be converted to nested via custom subGroups? For simplicity keep flat.
      return top;
    }
    const extras = layout.customSubGroups
      .filter((cs) => cs.topId === top.id)
      .map((cs) => ({
        id: cs.id, label: cs.label, icon: resolveIcon(cs.icon), items: [],
      } as SubGroup));
    if (extras.length === 0) return top;
    return { ...top, subGroups: [...top.subGroups, ...extras] };
  });

  // 3) Convert customItems into Leaf and inject
  const customItemsByBucket: Record<string, Leaf[]> = {};
  for (const ci of layout.customItems) {
    const leaf: Leaf = {
      title: ci.title,
      url: ci.url,
      icon: resolveIcon(ci.icon),
    };
    (leaf as any).__customId = ci.id;
    (leaf as any).__external = !!ci.external;
    const key = ci.subGroupId ? `${ci.topId}::${ci.subGroupId}` : ci.topId;
    (customItemsByBucket[key] ||= []).push(leaf);
  }

  // 4) Handle moves (remove from origin) — same as v1
  const moves = layout.moves ?? {};
  const withoutMoved: TopMenu[] = menus.map((top) => {
    if (top.kind === 'leaf') return top;
    if (top.kind === 'flat') {
      return { ...top, items: top.items.filter((i) => (moves[i.url]?.topId ?? top.id) === top.id) };
    }
    return {
      ...top,
      subGroups: top.subGroups.map((sg) => ({
        ...sg,
        items: sg.items.filter((i) => {
          const mv = moves[i.url];
          if (!mv) return true;
          if (mv.topId !== top.id) return false;
          if (mv.subGroupId && mv.subGroupId !== sg.id) return false;
          return true;
        }),
      })),
    };
  });

  // 5) Collect leaves being imported into destinations
  type Import = { leaf: Leaf; subGroupId?: string };
  const imports: Record<string, Import[]> = {};
  for (const [url, target] of Object.entries(moves)) {
    const originTopId = findTopIdForUrl(url);
    if (!originTopId) continue;
    if (originTopId === target.topId && !target.subGroupId) continue;
    const originTop = baseMenus.find((t) => t.id === originTopId);
    if (!originTop) continue;
    const leaf = allLeaves(originTop).find((l) => l.url === url);
    if (!leaf) continue;
    (imports[target.topId] ||= []).push({ leaf, subGroupId: target.subGroupId });
  }

  // 6) Apply hidden + custom injections + ordering + renames + icons
  const applied = withoutMoved
    .filter((top) => !hiddenGroups.has(idTop(top.id)))
    .map((top): TopMenu => {
      const newLabel = layout.renames[idTop(top.id)] ?? top.label;
      const newIcon = layout.icons[idTop(top.id)] ? resolveIcon(layout.icons[idTop(top.id)]) : top.icon;

      if (top.kind === 'leaf') {
        const url = top.item.url;
        const leafLabel = layout.renames[idLeaf(url)] ?? top.item.title;
        const leafIcon = layout.icons[idLeaf(url)] ? resolveIcon(layout.icons[idLeaf(url)]) : top.item.icon;
        return {
          ...top, label: newLabel, icon: newIcon,
          item: { ...top.item, title: leafLabel, icon: leafIcon },
        };
      }

      if (top.kind === 'flat') {
        const importedLeaves = (imports[top.id] ?? []).map((i) => i.leaf);
        const customs = customItemsByBucket[top.id] ?? [];
        const merged = [...top.items, ...importedLeaves, ...customs]
          .filter((i) => !hidden.has(i.url))
          .map((leaf) => applyLeafOverrides(leaf, layout));
        const ordered = applyOrder(merged, layout.orders[top.id]);
        return { ...top, label: newLabel, icon: newIcon, items: ordered };
      }

      // nested
      const importsForTop = imports[top.id] ?? [];
      const knownSubIds = new Set(top.subGroups.map((s) => s.id));

      const filteredSubs: SubGroup[] = top.subGroups
        .filter((sg) => !hiddenGroups.has(idSub(sg.id)))
        .map((sg) => {
          const importedHere = importsForTop.filter((i) => i.subGroupId === sg.id).map((i) => i.leaf);
          const customs = customItemsByBucket[`${top.id}::${sg.id}`] ?? [];
          const merged = [...sg.items, ...importedHere, ...customs]
            .filter((i) => !hidden.has(i.url))
            .map((leaf) => applyLeafOverrides(leaf, layout));
          const ordered = applyOrder(merged, layout.orders[orderKey(top.id, sg.id)]);
          const subLabel = layout.renames[idSub(sg.id)] ?? sg.label;
          const subIcon = layout.icons[idSub(sg.id)] ? resolveIcon(layout.icons[idSub(sg.id)]) : sg.icon;
          return { ...sg, label: subLabel, icon: subIcon, items: ordered };
        });

      // orphan imports -> Personalizado
      const orphanImports = importsForTop
        .filter((i) => !i.subGroupId || !knownSubIds.has(i.subGroupId))
        .map((i) => i.leaf)
        .filter((l) => !hidden.has(l.url))
        .map((leaf) => applyLeafOverrides(leaf, layout));

      if (orphanImports.length > 0) {
        const idx = filteredSubs.findIndex((s) => s.id === CUSTOM_SUBGROUP_ID);
        if (idx >= 0) {
          const merged = [...filteredSubs[idx].items, ...orphanImports];
          filteredSubs[idx] = { ...filteredSubs[idx], items: applyOrder(merged, layout.orders[orderKey(top.id, CUSTOM_SUBGROUP_ID)]) };
        } else {
          filteredSubs.push({
            id: CUSTOM_SUBGROUP_ID, label: 'Personalizado',
            icon: top.subGroups[0]?.icon ?? top.icon,
            items: applyOrder(orphanImports, layout.orders[orderKey(top.id, CUSTOM_SUBGROUP_ID)]),
          });
        }
      }

      return { ...top, label: newLabel, icon: newIcon, subGroups: filteredSubs };
    });

  return applied;
}

function applyLeafOverrides(leaf: Leaf, layout: MenuLayoutV2): Leaf {
  const customId = (leaf as any).__customId as string | undefined;
  const key = idLeaf(customId ?? leaf.url);
  const title = layout.renames[key] ?? leaf.title;
  const icon = layout.icons[key] ? resolveIcon(layout.icons[key]) : leaf.icon;
  const out = { ...leaf, title, icon };
  if ((leaf as any).__external) (out as any).__external = true;
  if (customId) (out as any).__customId = customId;
  return out;
}

function applyOrder<T extends { url: string }>(items: T[], order?: string[]): T[] {
  if (!order || order.length === 0) return items;
  const map = new Map(items.map((i) => [i.url, i]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const url of order) {
    const it = map.get(url);
    if (it) { out.push(it); seen.add(url); }
  }
  for (const it of items) if (!seen.has(it.url)) out.push(it);
  return out;
}

// ============= Hook =============
export function useMenuLayout() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [userLayout, setUserLayout] = useState<MenuLayoutV2>({ ...EMPTY });
  const [globalLayout, setGlobalLayout] = useState<MenuLayoutV2>({ ...EMPTY });
  const [loaded, setLoaded] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const [g, u] = await Promise.all([
        loadGlobal().catch(() => ({ ...EMPTY })),
        userId ? loadUser(userId).catch(() => ({ ...EMPTY })) : Promise.resolve({ ...EMPTY }),
      ]);
      if (cancelled) return;
      setGlobalLayout(g);
      setUserLayout(u);
      setLoaded(true);
    }
    boot();
    return () => { cancelled = true; };
  }, [userId, tick]);

  // Refetch on window focus / visibility change (PWA volta do background)
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  // Polling leve (5 min) só quando a aba está visível — fallback caso realtime não chegue
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  // Realtime: menu_layout_global (todos) + menu_layout_user (próprio user)
  useEffect(() => {
    const channel = supabase
      .channel('menu-layout-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_layout_global' },
        () => setTick((t) => t + 1),
      );
    if (userId) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_layout_user', filter: `user_id=eq.${userId}` },
        () => setTick((t) => t + 1),
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);


  const merged = useMemo(() => mergeLayouts(globalLayout, userLayout), [globalLayout, userLayout]);
  const effectiveMenus = useMemo(() => applyLayout(TOP_MENUS, merged), [merged]);
  const editorMenus = useMemo(() => applyLayout(TOP_MENUS, merged, { keepHidden: true }), [merged]);

  const setLayout = useCallback(
    async (scope: MenuScope, updater: MenuLayoutV2 | ((prev: MenuLayoutV2) => MenuLayoutV2)) => {
      if (scope === 'user') {
        if (!userId) return;
        const next = typeof updater === 'function' ? (updater as any)(userLayout) : updater;
        setUserLayout(next);
        try { await saveUser(userId, next); } catch { /* ignore */ }
      } else {
        const next = typeof updater === 'function' ? (updater as any)(globalLayout) : updater;
        setGlobalLayout(next);
        if (userId) {
          try { await saveGlobal(userId, next); } catch (e) { throw e; }
        }
      }
    },
    [userId, userLayout, globalLayout],
  );

  const resetLayout = useCallback(async (scope: MenuScope) => {
    await setLayout(scope, { ...EMPTY });
  }, [setLayout]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return {
    userLayout, globalLayout, merged, effectiveMenus, editorMenus, loaded,
    setLayout, resetLayout, refresh,
    isHidden: (url: string) => merged.hidden.includes(url),
  };
}
