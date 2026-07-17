import { useMemo } from 'react';
import { TOP_MENUS, allLeaves, findTopIdForUrl } from '@/config/menuCatalog';
import { useMenuLayout } from '@/hooks/useMenuLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

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
    () => TOP_MENUS.map((t) => ({ id: t.id, label: t.label })),
    [],
  );

  const setHidden = (url: string, hidden: boolean) =>
    setLayout((prev) => ({
      ...prev,
      hidden: hidden
        ? Array.from(new Set([...prev.hidden, url]))
        : prev.hidden.filter((u) => u !== url),
    }));

  const setMove = (url: string, targetTopId: string) =>
    setLayout((prev) => {
      const originTopId = findTopIdForUrl(url);
      const nextMoves = { ...prev.moves };
      if (!originTopId || targetTopId === originTopId) delete nextMoves[url];
      else nextMoves[url] = targetTopId;
      return { ...prev, moves: nextMoves };
    });

  const reorderInTop = (topId: string, url: string, direction: -1 | 1) =>
    setLayout((prev) => {
      const top = effectiveMenus.find((t) => t.id === topId);
      if (!top) return prev;
      const currentOrder = prev.orders[topId] ?? allLeaves(top).map((l) => l.url);
      const idx = currentOrder.indexOf(url);
      if (idx < 0) return prev;
      const next = moveInArray(currentOrder, idx, idx + direction);
      return { ...prev, orders: { ...prev.orders, [topId]: next } };
    });

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Personalizar Menus</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha quais páginas aparecem em cada menu, mova-as entre grupos ou oculte o que não usa. As alterações são salvas apenas para o seu usuário.
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

      {TOP_MENUS.map((top) => {
        const effTop = effectiveMenus.find((t) => t.id === top.id);
        const orderedItems = effTop ? allLeaves(effTop) : allLeaves(top);
        const rows = orderedItems.map((leaf, idx) => {
          const originTopId = findTopIdForUrl(leaf.url) ?? top.id;
          const currentTargetTopId = layout.moves[leaf.url] ?? originTopId;
          const hidden = layout.hidden.includes(leaf.url);
          return (
            <div
              key={leaf.url}
              className="flex items-center gap-2 border-b py-2 last:border-b-0 flex-wrap"
            >
              <div className="flex flex-col">
                <button
                  className="rounded p-1 hover:bg-accent disabled:opacity-30"
                  disabled={idx === 0}
                  onClick={() => reorderInTop(top.id, leaf.url, -1)}
                  aria-label="Mover para cima"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  className="rounded p-1 hover:bg-accent disabled:opacity-30"
                  disabled={idx === orderedItems.length - 1}
                  onClick={() => reorderInTop(top.id, leaf.url, 1)}
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
                  onValueChange={(v) => setMove(leaf.url, v)}
                >
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {topOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Visível</span>
                <Switch checked={!hidden} onCheckedChange={(v) => setHidden(leaf.url, !v)} />
              </div>
            </div>
          );
        });

        return (
          <Card key={top.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <top.icon className="h-4 w-4" />
                {top.label}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {orderedItems.length} {orderedItems.length === 1 ? 'página' : 'páginas'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem páginas neste menu.</p>
              ) : (
                <div className="divide-y">{rows}</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
