import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TOP_MENUS, TopMenu, Leaf, SubGroup, allLeaves, findTopIdForUrl } from '@/config/menuCatalog';

export type MenuLayoutOverride = {
  version: 1;
  hidden: string[]; // urls hidden from sidebar
  moves: Record<string, string>; // url -> destination topId (item removed from origin, appended to target)
  orders: Record<string, string[]>; // topId -> ordered urls (top-level items after moves)
};

const DEFAULT_LAYOUT: MenuLayoutOverride = { version: 1, hidden: [], moves: {}, orders: {} };
const CUSTOM_SUBGROUP_ID = 'personalizado';

function storageKey(userId: string | null | undefined) {
  return `menuLayout:${userId ?? 'anon'}`;
}

function readLayout(userId: string | null | undefined): MenuLayoutOverride {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return {
      version: 1,
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      moves: parsed.moves && typeof parsed.moves === 'object' ? parsed.moves : {},
      orders: parsed.orders && typeof parsed.orders === 'object' ? parsed.orders : {},
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function writeLayout(userId: string | null | undefined, layout: MenuLayoutOverride) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(layout));
    // notifica outras instâncias no mesmo tab
    window.dispatchEvent(new CustomEvent('menuLayout:changed'));
  } catch {
    // ignore
  }
}

/** Retorna o menu efetivo (aplicando hidden / moves / orders). */
export function useMenuLayout() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [layout, setLayoutState] = useState<MenuLayoutOverride>(() => readLayout(userId));

  useEffect(() => {
    setLayoutState(readLayout(userId));
  }, [userId]);

  useEffect(() => {
    const onChange = () => setLayoutState(readLayout(userId));
    window.addEventListener('menuLayout:changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('menuLayout:changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [userId]);

  const setLayout = useCallback(
    (updater: MenuLayoutOverride | ((prev: MenuLayoutOverride) => MenuLayoutOverride)) => {
      setLayoutState((prev) => {
        const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
        writeLayout(userId, next);
        return next;
      });
    },
    [userId],
  );

  const resetLayout = useCallback(() => setLayout(DEFAULT_LAYOUT), [setLayout]);

  const effectiveMenus = useMemo(() => applyLayout(TOP_MENUS, layout), [layout]);

  return { layout, setLayout, resetLayout, effectiveMenus, isHidden: (u: string) => layout.hidden.includes(u) };
}

/** Aplica overrides sobre o catálogo, retornando a árvore renderizável. */
export function applyLayout(menus: TopMenu[], layout: MenuLayoutOverride): TopMenu[] {
  const hidden = new Set(layout.hidden);
  const moves = layout.moves ?? {};

  // Passo 1: remove itens movidos para outro topo do seu topo de origem
  const withoutMoved: TopMenu[] = menus.map((top) => {
    if (top.kind === 'leaf') return top;
    if (top.kind === 'flat') {
      return { ...top, items: top.items.filter((i) => (moves[i.url] ?? top.id) === top.id) };
    }
    return {
      ...top,
      subGroups: top.subGroups.map((sg) => ({
        ...sg,
        items: sg.items.filter((i) => (moves[i.url] ?? top.id) === top.id),
      })),
    };
  });

  // Passo 2: coleta itens importados por topo destino
  const imports: Record<string, Leaf[]> = {};
  for (const [url, targetTopId] of Object.entries(moves)) {
    const originTopId = findTopIdForUrl(url);
    if (!originTopId || originTopId === targetTopId) continue;
    const originTop = menus.find((t) => t.id === originTopId);
    if (!originTop) continue;
    const leaf = allLeaves(originTop).find((l) => l.url === url);
    if (!leaf) continue;
    if (!imports[targetTopId]) imports[targetTopId] = [];
    imports[targetTopId].push(leaf);
  }

  // Passo 3: aplica imports + hidden + ordem custom
  return withoutMoved.map((top) => {
    if (top.kind === 'leaf') {
      // leaf pode ser oculto — retornamos sem alteração; renderer decide
      return top;
    }
    if (top.kind === 'flat') {
      const merged = [...top.items, ...(imports[top.id] ?? [])].filter((i) => !hidden.has(i.url));
      const ordered = applyOrder(merged, layout.orders[top.id]);
      return { ...top, items: ordered };
    }
    // nested
    const filteredSubs = top.subGroups
      .map((sg) => ({ ...sg, items: sg.items.filter((i) => !hidden.has(i.url)) }));
    const importedForTop = (imports[top.id] ?? []).filter((i) => !hidden.has(i.url));
    if (importedForTop.length > 0) {
      const custom: SubGroup = {
        id: CUSTOM_SUBGROUP_ID,
        label: 'Personalizado',
        icon: filteredSubs[0]?.icon ?? top.icon,
        items: importedForTop,
      };
      // se já existir, mescla
      const idx = filteredSubs.findIndex((s) => s.id === CUSTOM_SUBGROUP_ID);
      if (idx >= 0) filteredSubs[idx] = { ...filteredSubs[idx], items: [...filteredSubs[idx].items, ...importedForTop] };
      else filteredSubs.push(custom);
    }
    return { ...top, subGroups: filteredSubs };
  });
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
