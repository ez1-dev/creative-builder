import { useMemo, useState } from 'react';
import { TOP_MENUS, TopMenu, Leaf, findTopIdForUrl } from '@/config/menuCatalog';
import {
  useMenuLayout, orderKey, MoveTarget, MenuScope, MenuLayoutV2,
  idTop, idSub, idLeaf, CustomTop, CustomSubGroup, CustomItem,
} from '@/hooks/useMenuLayout';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { IconPicker } from '@/components/menus/IconPicker';
import { iconToName } from '@/config/menuIcons';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  ArrowDown, ArrowUp, RotateCcw, RefreshCw, Plus, Trash2, ExternalLink, Info,
} from 'lucide-react';
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

function randomId(prefix: string) {
  return `${prefix}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export default function PersonalizarMenusPage() {
  const { isAdmin } = useUserPermissions();
  const {
    userLayout, globalLayout, merged, effectiveMenus, editorMenus, loaded,
    setLayout, resetLayout, refresh,
  } = useMenuLayout();

  const [scope, setScope] = useState<MenuScope>('user');
  const activeLayout = scope === 'user' ? userLayout : globalLayout;

  const mutate = async (updater: (prev: MenuLayoutV2) => MenuLayoutV2) => {
    try {
      await setLayout(scope, updater);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao salvar');
    }
  };

  const topOptions = useMemo(
    () => [
      ...TOP_MENUS.map((t) => ({ id: t.id, label: t.label, kind: t.kind })),
      ...merged.customTops.map((t) => ({ id: t.id, label: t.label, kind: 'flat' as const })),
    ],
    [merged.customTops],
  );

  // --------- Mutations ---------
  const setHidden = (url: string, hidden: boolean) =>
    mutate((prev) => ({
      ...prev,
      hidden: hidden
        ? Array.from(new Set([...prev.hidden, url]))
        : prev.hidden.filter((u) => u !== url),
    }));

  const setHiddenGroup = (nodeId: string, hidden: boolean) =>
    mutate((prev) => ({
      ...prev,
      hiddenGroups: hidden
        ? Array.from(new Set([...prev.hiddenGroups, nodeId]))
        : prev.hiddenGroups.filter((u) => u !== nodeId),
    }));

  const setRename = (nodeId: string, value: string, factoryDefault: string) =>
    mutate((prev) => {
      const renames = { ...prev.renames };
      if (!value.trim() || value.trim() === factoryDefault) delete renames[nodeId];
      else renames[nodeId] = value.trim();
      return { ...prev, renames };
    });

  const setIconOverride = (nodeId: string, name: string | null) =>
    mutate((prev) => {
      const icons = { ...prev.icons };
      if (!name) delete icons[nodeId];
      else icons[nodeId] = name;
      return { ...prev, icons };
    });

  const setMove = (url: string, target: MoveTarget | null) =>
    mutate((prev) => {
      const originTopId = findTopIdForUrl(url);
      const nextMoves = { ...prev.moves };
      if (!target || (!target.subGroupId && target.topId === originTopId)) delete nextMoves[url];
      else nextMoves[url] = target;
      return { ...prev, moves: nextMoves };
    });

  const setTopMove = (url: string, targetTopId: string) => {
    const originTopId = findTopIdForUrl(url);
    const targetTop = TOP_MENUS.find((t) => t.id === targetTopId) ??
      merged.customTops.find((t) => t.id === targetTopId);
    if (!targetTop) return;
    const isNested = (targetTop as any).kind === 'nested';
    if (!isNested) {
      setMove(url, targetTopId === originTopId ? null : { topId: targetTopId });
      return;
    }
    const current = activeLayout.moves[url];
    const currentSub = current?.topId === targetTopId ? current?.subGroupId : undefined;
    setMove(url, { topId: targetTopId, subGroupId: currentSub });
  };

  const setSubMove = (url: string, targetTopId: string, subValue: string) => {
    const subGroupId = subValue === NONE_SUB ? undefined : subValue;
    setMove(url, { topId: targetTopId, subGroupId });
  };

  const reorderInBucket = (bucketKey: string, urlsInBucket: string[], url: string, direction: -1 | 1) =>
    mutate((prev) => {
      const currentOrder = prev.orders[bucketKey] ?? urlsInBucket;
      const merged2 = [
        ...currentOrder.filter((u) => urlsInBucket.includes(u)),
        ...urlsInBucket.filter((u) => !currentOrder.includes(u)),
      ];
      const idx = merged2.indexOf(url);
      if (idx < 0) return prev;
      const next = moveInArray(merged2, idx, idx + direction);
      return { ...prev, orders: { ...prev.orders, [bucketKey]: next } };
    });

  const addCustomTop = (draft: { label: string; icon: string }) =>
    mutate((prev) => ({
      ...prev,
      customTops: [...prev.customTops, {
        id: randomId('custom:top'), kind: 'flat',
        label: draft.label, icon: draft.icon,
        position: prev.customTops.length,
      }],
    }));

  const addCustomSubGroup = (draft: { topId: string; label: string; icon: string }) =>
    mutate((prev) => ({
      ...prev,
      customSubGroups: [...prev.customSubGroups, {
        id: randomId('custom:sub'), topId: draft.topId,
        label: draft.label, icon: draft.icon,
        position: prev.customSubGroups.length,
      }],
    }));

  const addCustomItem = (draft: Omit<CustomItem, 'id' | 'position'>) =>
    mutate((prev) => ({
      ...prev,
      customItems: [...prev.customItems, {
        ...draft, id: randomId('custom:item'), position: prev.customItems.length,
      }],
    }));

  const deleteCustom = (kind: 'top' | 'sub' | 'item', id: string) =>
    mutate((prev) => ({
      ...prev,
      customTops: kind === 'top' ? prev.customTops.filter((t) => t.id !== id) : prev.customTops,
      customSubGroups: kind === 'sub' ? prev.customSubGroups.filter((s) => s.id !== id) : prev.customSubGroups,
      customItems: kind === 'item' ? prev.customItems.filter((i) => i.id !== id) : prev.customItems,
    }));

  // --------- Row rendering ---------
  const renderRow = (
    leaf: Leaf,
    topId: string,
    idx: number,
    bucketUrls: string[],
    bucketKey: string,
  ) => {
    const customId = (leaf as any).__customId as string | undefined;
    const isExternal = !!(leaf as any).__external;
    const originTopId = customId ? topId : (findTopIdForUrl(leaf.url) ?? topId);
    const currentMove = activeLayout.moves[leaf.url];
    const currentTargetTopId = currentMove?.topId ?? originTopId;
    const targetTop = TOP_MENUS.find((t) => t.id === currentTargetTopId) ??
      merged.customTops.find((t) => t.id === currentTargetTopId);
    const hidden = activeLayout.hidden.includes(leaf.url);
    const nodeKey = idLeaf(customId ?? leaf.url);
    const factoryTitle = customId
      ? (merged.customItems.find((c) => c.id === customId)?.title ?? leaf.title)
      : leaf.title;
    const currentRename = activeLayout.renames[nodeKey] ?? '';
    const currentIcon = activeLayout.icons[nodeKey] ?? (customId ? undefined : iconToName(leaf.icon));

    const isNestedTarget = (targetTop as any)?.kind === 'nested';
    const nestedSubs = isNestedTarget
      ? [
          ...((targetTop as any).subGroups as { id: string; label: string }[]),
          ...merged.customSubGroups.filter((s) => s.topId === (targetTop as any).id),
        ].filter((s) => s.id !== CUSTOM_SUBGROUP_ID)
      : [];

    const subOptions = isNestedTarget
      ? [{ value: NONE_SUB, label: 'Personalizado (novo grupo)' },
         ...nestedSubs.map((s) => ({ value: s.id, label: s.label }))]
      : null;
    const currentSubValue = currentMove?.subGroupId ?? (currentTargetTopId === originTopId ? undefined : NONE_SUB);

    return (
      <div key={customId ?? leaf.url} className="flex items-center gap-2 border-b py-2 last:border-b-0 flex-wrap">
        <div className="flex flex-col">
          <button className="rounded p-1 hover:bg-accent disabled:opacity-30" disabled={idx === 0}
            onClick={() => reorderInBucket(bucketKey, bucketUrls, leaf.url, -1)} aria-label="Mover para cima">
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button className="rounded p-1 hover:bg-accent disabled:opacity-30" disabled={idx === bucketUrls.length - 1}
            onClick={() => reorderInBucket(bucketKey, bucketUrls, leaf.url, 1)} aria-label="Mover para baixo">
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 mb-1">
            <IconPicker
              value={currentIcon}
              onChange={(name) => setIconOverride(nodeKey, name)}
              triggerLabel=""
              className="w-11 px-0 justify-center"
            />
            <Input
              value={currentRename || factoryTitle}
              onChange={(e) => setRename(nodeKey, e.target.value, factoryTitle)}
              className="h-8 flex-1 text-sm"
            />
            {isExternal && <Badge variant="secondary" className="gap-1"><ExternalLink className="h-3 w-3" />externo</Badge>}
            {customId && <Badge variant="outline">criado</Badge>}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{leaf.url}</div>
        </div>
        {!customId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Menu:</span>
            <Select value={currentTargetTopId} onValueChange={(v) => setTopMove(leaf.url, v)}>
              <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {topOptions.map((opt) => <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {!customId && subOptions && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Submenu:</span>
            <Select value={currentSubValue ?? NONE_SUB} onValueChange={(v) => setSubMove(leaf.url, currentTargetTopId, v)}>
              <SelectTrigger className="h-8 w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {subOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Visível</span>
          <Switch checked={!hidden} onCheckedChange={(v) => setHidden(leaf.url, !v)} />
        </div>
        {customId && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
            onClick={() => deleteCustom('item', customId)} aria-label="Excluir item">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  // --------- Top card ---------
  const renderTop = (top: TopMenu) => {
    const isCustom = merged.customTops.some((c) => c.id === top.id);
    const topNodeKey = idTop(top.id);
    const topRename = activeLayout.renames[topNodeKey] ?? '';
    const topIconOverride = activeLayout.icons[topNodeKey];
    const topHidden = activeLayout.hiddenGroups.includes(topNodeKey);

    const nested = top.kind === 'nested';
    const totalCount = nested
      ? top.subGroups.reduce((s, sg) => s + sg.items.length, 0)
      : top.kind === 'flat' ? top.items.length : 1;

    return (
      <Card key={top.id}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <IconPicker
                value={topIconOverride ?? iconToName(top.icon)}
                onChange={(name) => setIconOverride(topNodeKey, name)}
                triggerLabel=""
                className="w-11 px-0 justify-center"
              />
              <Input
                value={topRename || top.label}
                onChange={(e) => setRename(topNodeKey, e.target.value, top.label)}
                className="h-9 max-w-[300px] font-semibold"
              />
              <span className="text-xs text-muted-foreground">
                {totalCount} {totalCount === 1 ? 'página' : 'páginas'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Menu visível
                <Switch checked={!topHidden} onCheckedChange={(v) => setHiddenGroup(topNodeKey, !v)} />
              </div>
              {isCustom && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                  onClick={() => deleteCustom('top', top.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {nested && <NovoSubgrupoDialog topId={top.id} onCreate={addCustomSubGroup} />}
              <NovoItemDialog defaultTopId={top.id} tops={topOptions} onCreate={addCustomItem}
                subGroupsForTop={(tid) => {
                  const t = TOP_MENUS.find((x) => x.id === tid);
                  const subs = t?.kind === 'nested' ? t.subGroups.map((s) => ({ id: s.id, label: s.label })) : [];
                  const extra = merged.customSubGroups.filter((s) => s.topId === tid).map((s) => ({ id: s.id, label: s.label }));
                  return [...subs.filter((s) => s.id !== CUSTOM_SUBGROUP_ID), ...extra];
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {top.kind === 'nested' ? (
            top.subGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem páginas neste menu.</p>
            ) : (
              top.subGroups.map((sg) => {
                const urls = sg.items.map((i) => i.url);
                const bucket = orderKey(top.id, sg.id);
                const subNodeKey = idSub(sg.id);
                const subRename = activeLayout.renames[subNodeKey] ?? '';
                const subIconOverride = activeLayout.icons[subNodeKey];
                const subHidden = activeLayout.hiddenGroups.includes(subNodeKey);
                const isCustomSub = merged.customSubGroups.some((c) => c.id === sg.id);
                return (
                  <div key={sg.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <IconPicker value={subIconOverride ?? iconToName(sg.icon)}
                        onChange={(name) => setIconOverride(subNodeKey, name)}
                        triggerLabel="" className="w-9 h-8 px-0 justify-center" />
                      <Input value={subRename || sg.label}
                        onChange={(e) => setRename(subNodeKey, e.target.value, sg.label)}
                        className="h-8 max-w-[260px] text-xs font-semibold uppercase" />
                      <span className="text-xs text-muted-foreground">({sg.items.length})</span>
                      <div className="flex-1" />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        Visível
                        <Switch checked={!subHidden} onCheckedChange={(v) => setHiddenGroup(subNodeKey, !v)} />
                      </div>
                      {isCustomSub && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => deleteCustom('sub', sg.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
            )
          ) : top.kind === 'flat' ? (
            top.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem páginas neste menu.</p>
            ) : (
              <div className="divide-y">
                {top.items.map((leaf, idx) => renderRow(leaf, top.id, idx, top.items.map((i) => i.url), top.id))}
              </div>
            )
          ) : (
            <div className="divide-y">
              {renderRow(top.item, top.id, 0, [top.item.url], top.id)}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Personalizar Menus</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Renomeie itens, escolha ícones, mova entre menus/submenus, oculte o que não usa e crie novos atalhos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NovoTopoDialog onCreate={addCustomTop} />
          <Button variant="outline" onClick={() => {
            refresh();
            toast.success('Menus sincronizados com o servidor.');
          }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar agora
          </Button>
          <Button variant="outline" onClick={async () => {
            await resetLayout(scope);
            toast.success(`Layout ${scope === 'user' ? 'pessoal' : 'global'} restaurado.`);
          }}>
            <RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrão
          </Button>
        </div>

      </div>

      <Tabs value={scope} onValueChange={(v) => setScope(v as MenuScope)}>
        <TabsList>
          <TabsTrigger value="user">Meu usuário</TabsTrigger>
          {isAdmin && <TabsTrigger value="global">Padrão global (admin)</TabsTrigger>}
        </TabsList>
        <TabsContent value="user" className="mt-4">
          <div className="flex items-center gap-2 rounded-md border border-muted p-2 text-xs text-muted-foreground mb-3">
            <Info className="h-4 w-4" /> Alterações aqui valem só para você e sobrescrevem o padrão global.
          </div>
        </TabsContent>
        {isAdmin && (
          <TabsContent value="global" className="mt-4">
            <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs mb-3">
              <Info className="h-4 w-4" /> Você está editando o layout <b>global</b> — visível para todos os usuários.
            </div>
          </TabsContent>
        )}
      </Tabs>

      {!loaded && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {loaded && effectiveMenus.map(renderTop)}
    </div>
  );
}

// ============= Dialogs =============
function NovoTopoDialog({ onCreate }: { onCreate: (d: { label: string; icon: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('Folder');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="mr-2 h-4 w-4" />Novo menu de topo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo menu de topo</DialogTitle>
          <DialogDescription>Cria um menu vazio ao lado dos existentes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Favoritos da equipe" />
          </div>
          <div>
            <Label className="text-xs">Ícone</Label>
            <div><IconPicker value={icon} onChange={setIcon} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!label.trim()} onClick={() => { onCreate({ label: label.trim(), icon }); setOpen(false); setLabel(''); }}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoSubgrupoDialog({ topId, onCreate }: {
  topId: string; onCreate: (d: { topId: string; label: string; icon: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('Folder');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Submenu</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo submenu</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Meus atalhos" />
          </div>
          <div>
            <Label className="text-xs">Ícone</Label>
            <div><IconPicker value={icon} onChange={setIcon} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!label.trim()} onClick={() => { onCreate({ topId, label: label.trim(), icon }); setOpen(false); setLabel(''); }}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoItemDialog({ defaultTopId, tops, subGroupsForTop, onCreate }: {
  defaultTopId: string;
  tops: { id: string; label: string; kind: string }[];
  subGroupsForTop: (topId: string) => { id: string; label: string }[];
  onCreate: (d: Omit<CustomItem, 'id' | 'position'>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [topId, setTopId] = useState(defaultTopId);
  const [subGroupId, setSubGroupId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('Link');
  const [url, setUrl] = useState('');
  const [external, setExternal] = useState(false);
  const currentTop = tops.find((t) => t.id === topId);
  const nested = currentTop?.kind === 'nested';
  const subs = nested ? subGroupsForTop(topId) : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo item de menu</DialogTitle>
          <DialogDescription>Aponte para uma página do sistema ou um link externo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Menu</Label>
              <Select value={topId} onValueChange={(v) => { setTopId(v); setSubGroupId(''); }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tops.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {nested && (
              <div>
                <Label className="text-xs">Submenu (opcional)</Label>
                <Select value={subGroupId || NONE_SUB} onValueChange={(v) => setSubGroupId(v === NONE_SUB ? '' : v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_SUB}>— nenhum (personalizado) —</SelectItem>
                    {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs">URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder={external ? 'https://…' : '/minha-rota'} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <Label className="text-xs">Externo</Label>
              <Switch checked={external} onCheckedChange={setExternal} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Ícone</Label>
            <div><IconPicker value={icon} onChange={setIcon} /></div>
          </div>
          {!external && url && !url.startsWith('/') && (
            <p className="text-xs text-amber-600">Rotas internas costumam começar com "/".</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={!title.trim() || !url.trim() || !topId}
            onClick={() => {
              onCreate({
                topId, subGroupId: subGroupId || undefined,
                title: title.trim(), icon, url: url.trim(), external,
              });
              setOpen(false); setTitle(''); setUrl(''); setSubGroupId(''); setExternal(false);
            }}
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
