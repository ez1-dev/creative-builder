import { useMemo } from 'react';
import { TOP_MENUS, TopMenu, Leaf, allLeaves, findTopIdForUrl } from '@/config/menuCatalog';
import { useMenuLayout, orderKey, MoveTarget } from '@/hooks/useMenuLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const CUSTOM_SUBGROUP_ID = 'personalizado';
const NONE_SUB = '__none__';

function moveInArray<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  const [it] = copy.splice(from, 1);
  copy.splice(to, 0, it);
  return copy;
}

export default function PersonalizarMenusPage() {
  const { layout, setLayout, resetLayout, effectiveMenus } = useMenuLayout();

  const topOptions = useMemo(
    () => TOP_MENUS.map((t) => ({ id: t.id, label: t.label, kind: t.kind })),
    [],
  );

  const setHidden = (url: string, hidden: boolean) =>
    setLayout((prev) => ({
      ...prev,
      hidden: hidden
        ? Array.from(new Set([...prev.hidden, url]))
        : prev.hidden.filter((u) => u !== url),
    }));

  const setMove = (url: string, target: MoveTarget | null) =>
    setLayout((prev) => {
      const originTopId = findTopIdForUrl(url);
      const nextMoves = { ...prev.moves };
      if (!target || (!target.subGroupId && target.topId === originTopId)) {
        delete nextMoves[url];
      } else {
        nextMoves[url] = target;
      }
      return { ...prev, moves: nextMoves };
    });

  const setTopMove = (url: string, targetTopId: string) => {
    const originTopId = findTopIdForUrl(url);
    // Se o topo destino é nested, preserva/limpa subgrupo. Se for o mesmo topo do original, limpa move.
    const targetTop = TOP_MENUS.find((t) => t.id === targetTopId);
    if (!targetTop) return;
    if (targetTop.kind !== 'nested') {
      setMove(url, targetTopId === originTopId ? null : { topId: targetTopId });
      return;
    }
    // nested destino: mantém subGroupId atual se ainda existir, senão undefined
    const current = layout.moves[url];
    const currentSub = current?.topId === targetTopId ? current?.subGroupId : undefined;
    setMove(url, { topId: targetTopId, subGroupId: currentSub });
  };

  const setSubMove = (url: string, targetTopId: string, subValue: string) => {
    const subGroupId = subValue === NONE_SUB ? undefined : subValue;
    setMove(url, { topId: targetTopId, subGroupId });
  };

  const reorderInBucket = (bucketKey: string, urlsInBucket: string[], url: string, direction: -1 | 1) =>
    setLayout((prev) => {
      const currentOrder = prev.orders[bucketKey] ?? urlsInBucket;
      // garante que urls faltantes vão para o final
      const merged = [...currentOrder.filter((u) => urlsInBucket.includes(u)), ...urlsInBucket.filter((u) => !currentOrder.includes(u))];
      const idx = merged.indexOf(url);
      if (idx < 0) return prev;
      const next = moveInArray(merged, idx, idx + direction);
      return { ...prev, orders: { ...prev.orders, [bucketKey]: next } };
    });

  const renderRow = (
    leaf: Leaf,
    topId: string,
    idx: number,
    bucketUrls: string[],
    bucketKey: string,
  ) => {
    const originTopId = findTopIdForUrl(leaf.url) ?? topId;
    const currentMove = layout.moves[leaf.url];
    const currentTargetTopId = currentMove?.topId ?? originTopId;
    const targetTop = TOP_MENUS.find((t) => t.id === currentTargetTopId);
    const hidden = layout.hidden.includes(leaf.url);

    const subOptions =
      targetTop?.kind === 'nested'
        ? [
            { value: NONE_SUB, label: 'Personalizado (novo grupo)' },
            ...targetTop.subGroups
              .filter((s) => s.id !== CUSTOM_SUBGROUP_ID)
              .map((s) => ({ value: s.id, label: s.label })),
          ]
        : null;

    const currentSubValue = currentMove?.subGroupId ?? (currentTargetTopId === originTopId ? undefined : NONE_SUB);

    return (
      <div
        key={leaf.url}
        className="flex items-center gap-2 border-b py-2 last:border-b-0 flex-wrap"
      >
        <div className="flex flex-col">
          <button
            className="rounded p-1 hover:bg-accent disabled:opacity-30"
            disabled={idx === 0}
            onClick={() => reorderInBucket(bucketKey, bucketUrls, leaf.url, -1)}
            aria-label="Mover para cima"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded p-1 hover:bg-accent disabled:opacity-30"
            disabled={idx === bucketUrls.length - 1}
            onClick={() => reorderInBucket(bucketKey, bucketUrls, leaf.url, 1)}
            aria-label="Mover para baixo"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{leaf.title}</div>
          <div className="text-xs text-muted-foreground truncate">{leaf.url}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Menu:</span>
          <Select
            value={currentTargetTopId}
            onValueChange={(v) => setTopMove(leaf.url, v)}
          >
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {subOptions && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Submenu:</span>
            <Select
              value={currentSubValue ?? NONE_SUB}
              onValueChange={(v) => setSubMove(leaf.url, currentTargetTopId, v)}
            >
              <SelectTrigger className="h-8 w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Visível</span>
          <Switch checked={!hidden} onCheckedChange={(v) => setHidden(leaf.url, !v)} />
        </div>
      </div>
    );
  };

  const renderTop = (top: TopMenu) => {
    const effTop = effectiveMenus.find((t) => t.id === top.id);
    if (!effTop) return null;

    if (effTop.kind === 'nested') {
      const totalCount = effTop.subGroups.reduce((s, sg) => s + sg.items.length, 0);
      return (
        <Card key={top.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <top.icon className="h-4 w-4" />
              {top.label}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {totalCount} {totalCount === 1 ? 'página' : 'páginas'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {effTop.subGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem páginas neste menu.</p>
            ) : (
              effTop.subGroups.map((sg) => {
                const urls = sg.items.map((i) => i.url);
                const bucket = orderKey(top.id, sg.id);
                return (
                  <div key={sg.id}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
                      <sg.icon className="h-3.5 w-3.5" />
                      {sg.label}
                      <span className="ml-1 font-normal normal-case">
                        ({sg.items.length})
                      </span>
                    </div>
                    {sg.items.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic pl-5">Sem páginas.</p>
                    ) : (
                      <div className="divide-y">
                        {sg.items.map((leaf, idx) => renderRow(leaf, top.id, idx, urls, bucket))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      );
    }

    // flat / leaf
    const items = allLeaves(effTop);
    const urls = items.map((i) => i.url);
    return (
      <Card key={top.id}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <top.icon className="h-4 w-4" />
            {top.label}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {items.length} {items.length === 1 ? 'página' : 'páginas'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem páginas neste menu.</p>
          ) : (
            <div className="divide-y">
              {items.map((leaf, idx) => renderRow(leaf, top.id, idx, urls, top.id))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Personalizar Menus</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha em qual menu (e submenu) cada página aparece, reordene ou oculte o que não usa. As alterações são salvas apenas para o seu usuário.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            resetLayout();
            toast.success('Menu restaurado para o padrão.');
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrão
        </Button>
      </div>

      {TOP_MENUS.map(renderTop)}
    </div>
  );
}
