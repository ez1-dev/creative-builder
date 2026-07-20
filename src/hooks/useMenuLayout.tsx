import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TOP_MENUS, TopMenu, Leaf, SubGroup, allLeaves, findTopIdForUrl } from '@/config/menuCatalog';

export type MoveTarget = { topId: string; subGroupId?: string };

export type MenuLayoutOverride = {
  version: 1;
  hidden: string[]; // urls hidden from sidebar
  moves: Record<string, MoveTarget>; // url -> destination { topId, subGroupId? }
  orders: Record<string, string[]>; // key = topId (flat) OR `${topId}:${subGroupId}` (nested subgroup)
};

const DEFAULT_LAYOUT: MenuLayoutOverride = { version: 1, hidden: [], moves: {}, orders: {} };
const CUSTOM_SUBGROUP_ID = 'personalizado';

function storageKey(userId: string | null | undefined) {
  return `menuLayout:${userId ?? 'anon'}`;
}

function normalizeMoves(raw: any): Record<string, MoveTarget> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, MoveTarget> = {};
  for (const [url, val] of Object.entries(raw)) {
    if (typeof val === 'string') out[url] = { topId: val };
    else if (val && typeof val === 'object' && typeof (val as any).topId === 'string') {
      out[url] = {
        topId: (val as any).topId,
        subGroupId: typeof (val as any).subGroupId === 'string' ? (val as any).subGroupId : undefined,
      };
    }
  }
  return out;
}

function readLayout(userId: string | null | undefined): MenuLayoutOverride {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return {
      version: 1,
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      moves: normalizeMoves(parsed.moves),
      orders: parsed.orders && typeof parsed.orders === 'object' ? parsed.orders : {},
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function writeLayout(userId: string | null | undefined, layout: MenuLayoutOverride) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(layout));
    window.dispatchEvent(new CustomEvent('menuLayout:changed'));
  } catch {
    // ignore
  }
}

export function orderKey(topId: string, subGroupId?: string) {
  return subGroupId ? `${topId}:${subGroupId}` : topId;
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
      return { ...top, items: top.items.filter((i) => (moves[i.url]?.topId ?? top.id) === top.id) };
    }
    // nested: para cada item, se movido, e o destino é o mesmo topo com subGroupId, remove daqui e recolocaremos abaixo
    return {
      ...top,
      subGroups: top.subGroups.map((sg) => ({
        ...sg,
        items: sg.items.filter((i) => {
          const mv = moves[i.url];
          if (!mv) return true;
          if (mv.topId !== top.id) return false; // moveu para outro topo
          // mesmo topo: se subGroupId definido e diferente, remove daqui
          if (mv.subGroupId && mv.subGroupId !== sg.id) return false;
          return true;
        }),
      })),
    };
  });

  // Passo 2: coleta itens importados por topo destino (e subgrupo, quando houver)
  type Import = { leaf: Leaf; subGroupId?: string };
  const imports: Record<string, Import[]> = {};
  for (const [url, target] of Object.entries(moves)) {
    const originTopId = findTopIdForUrl(url);
    if (!originTopId) continue;
    // mesmo topo sem subGroupId => nada a importar
    if (originTopId === target.topId && !target.subGroupId) continue;
    const originTop = menus.find((t) => t.id === originTopId);
    if (!originTop) continue;
    const leaf = allLeaves(originTop).find((l) => l.url === url);
    if (!leaf) continue;
    if (!imports[target.topId]) imports[target.topId] = [];
    imports[target.topId].push({ leaf, subGroupId: target.subGroupId });
  }

  // Passo 3: aplica imports + hidden + ordem custom
  return withoutMoved.map((top) => {
    if (top.kind === 'leaf') {
      return top;
    }
    if (top.kind === 'flat') {
      const importedLeaves = (imports[top.id] ?? []).map((i) => i.leaf);
      const merged = [...top.items, ...importedLeaves].filter((i) => !hidden.has(i.url));
      const ordered = applyOrder(merged, layout.orders[top.id]);
      return { ...top, items: ordered };
    }
    // nested
    const importsForTop = imports[top.id] ?? [];
    const knownSubIds = new Set(top.subGroups.map((s) => s.id));

    const filteredSubs: SubGroup[] = top.subGroups.map((sg) => {
      const importedHere = importsForTop
        .filter((i) => i.subGroupId === sg.id)
        .map((i) => i.leaf);
      const merged = [...sg.items, ...importedHere].filter((i) => !hidden.has(i.url));
      const ordered = applyOrder(merged, layout.orders[orderKey(top.id, sg.id)]);
      return { ...sg, items: ordered };
    });

    // itens sem subgrupo escolhido (ou com subgrupo inexistente) -> Personalizado
    const orphanImports = importsForTop
      .filter((i) => !i.subGroupId || !knownSubIds.has(i.subGroupId))
      .map((i) => i.leaf)
      .filter((l) => !hidden.has(l.url));

    if (orphanImports.length > 0) {
      const existingIdx = filteredSubs.findIndex((s) => s.id === CUSTOM_SUBGROUP_ID);
      if (existingIdx >= 0) {
        const merged = [...filteredSubs[existingIdx].items, ...orphanImports];
        const ordered = applyOrder(merged, layout.orders[orderKey(top.id, CUSTOM_SUBGROUP_ID)]);
        filteredSubs[existingIdx] = { ...filteredSubs[existingIdx], items: ordered };
      } else {
        const ordered = applyOrder(orphanImports, layout.orders[orderKey(top.id, CUSTOM_SUBGROUP_ID)]);
        filteredSubs.push({
          id: CUSTOM_SUBGROUP_ID,
          label: 'Personalizado',
          icon: top.subGroups[0]?.icon ?? top.icon,
          items: ordered,
        });
      }
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
