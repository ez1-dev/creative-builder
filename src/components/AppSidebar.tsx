import { useEffect, useMemo, useState } from 'react';
import {
  Star, StarOff, Search as SearchIcon, ChevronDown, LayoutDashboard,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useFavorites } from '@/hooks/useFavorites';
import { useDemoMode, useBrand } from '@/contexts/DemoModeContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TOP_MENUS, ALWAYS_VISIBLE, allLeaves, type Leaf, type TopMenu } from '@/config/menuCatalog';
import { useMenuLayout } from '@/hooks/useMenuLayout';

function BrandName() {
  const { name } = useBrand('ERP Sapiens');
  return <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground truncate">{name}</span>;
}

function findActive(menus: TopMenu[], pathname: string): { topId: string | null; subId: string | null } {
  let best: { topId: string; subId: string | null; len: number } | null = null;
  for (const top of menus) {
    if (top.kind === 'leaf') {
      const u = top.item.url;
      if (pathname === u || pathname.startsWith(u + '/')) {
        if (!best || u.length > best.len) best = { topId: top.id, subId: null, len: u.length };
      }
    } else if (top.kind === 'flat') {
      for (const it of top.items) {
        if (pathname === it.url || pathname.startsWith(it.url + '/')) {
          if (!best || it.url.length > best.len) best = { topId: top.id, subId: null, len: it.url.length };
        }
      }
    } else {
      for (const sg of top.subGroups) {
        for (const it of sg.items) {
          if (pathname === it.url || pathname.startsWith(it.url + '/')) {
            if (!best || it.url.length > best.len) best = { topId: top.id, subId: sg.id, len: it.url.length };
          }
        }
      }
    }
  }
  return { topId: best?.topId ?? null, subId: best?.subId ?? null };
}

// ============ Componente ============
export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { canView, hasPermissions, loading, isAdmin } = useUserPermissions();
  const { favorites, isFavorite, toggle } = useFavorites();
  const { isModuleHidden } = useDemoMode();
  const { effectiveMenus, isHidden: isMenuHidden } = useMenuLayout();

  const { topId: activeTopId, subId: activeSubId } = useMemo(
    () => findActive(effectiveMenus, location.pathname),
    [effectiveMenus, location.pathname],
  );

  const [openTop, setOpenTop] = useState<string | null>(activeTopId ?? 'inicio');
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');

  // Expande automaticamente topo + subgrupo da rota ativa (sem fechar outros subs já abertos)
  useEffect(() => {
    if (activeTopId) setOpenTop(activeTopId);
    if (activeSubId) setOpenSubs((prev) => (prev[activeSubId] ? prev : { ...prev, [activeSubId]: true }));
  }, [activeTopId, activeSubId]);

  const isVisible = (url: string) => {
    if (isModuleHidden(url)) return false;
    if (ALWAYS_VISIBLE.has(url)) return true;
    if (loading) return false;
    if (!hasPermissions) return true;
    return canView(url);
  };

  const q = query.trim().toLowerCase();
  const matchesQuery = (title: string) => (q ? title.toLowerCase().includes(q) : true);
  const forceOpen = q.length > 0;

  const filterLeaves = (items: Leaf[]) =>
    items.filter((it) => isVisible(it.url) && matchesQuery(it.title));

  const closeMobileMaybe = () => {
    if (isMobile) setOpenMobile(false);
  };

  // ---- Renderers ----
  const renderItemRow = (item: Leaf, canFavorite = true) => {
    const active = location.pathname === item.url;
    const fav = isFavorite(item.url);
    return (
      <SidebarMenuItem key={item.url}>
        <div className="group/item flex items-center rounded-md transition-colors hover:bg-sidebar-accent/70">
          <SidebarMenuButton asChild className="flex-1 min-h-[28px] py-1">
            <NavLink
              to={item.url}
              end
              onClick={closeMobileMaybe}
              className={cn(
                'relative transition-colors hover:bg-transparent',
                'before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[2px] before:-translate-y-1/2 before:rounded-r before:bg-primary before:opacity-0 before:transition-opacity group-hover/item:before:opacity-60',
                active && 'bg-primary/15 text-primary before:opacity-100',
              )}
              activeClassName="bg-primary/15 text-primary"
            >
              {!collapsed && <span className="truncate text-[12.5px] font-normal">{item.title}</span>}
              {collapsed && <item.icon className="h-[18px] w-[18px]" />}
            </NavLink>
          </SidebarMenuButton>

          {!collapsed && canFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(item.url);
              }}
              className={cn(
                'mr-1 rounded p-1 opacity-0 transition group-hover/item:opacity-100 hover:bg-sidebar-accent',
                fav && 'opacity-100 text-primary',
              )}
              aria-label={fav ? 'Remover favorito' : 'Adicionar favorito'}
            >
              {fav ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </SidebarMenuItem>
    );
  };

  // Favoritos resolvidos
  const favoriteItems = useMemo(() => {
    const map = new Map<string, Leaf>();
    for (const top of TOP_MENUS) for (const l of allLeaves(top)) map.set(l.url, l);
    return favorites.map((u) => map.get(u)).filter(Boolean).filter((it) => isVisible(it!.url)) as Leaf[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites, loading, hasPermissions]);

  const setTopOpen = (id: string, next: boolean) => setOpenTop(next ? id : null);
  const setSubOpen = (id: string, next: boolean) =>
    setOpenSubs((prev) => ({ ...prev, [id]: next }));

  const renderFavoritesTop = () => {
    const isOpen = forceOpen || openTop === 'favoritos';
    const visibleFavs = favoriteItems.filter((it) => matchesQuery(it.title));
    return (
      <SidebarGroup key="favoritos" className="py-0.5">
        <Collapsible open={isOpen} onOpenChange={(v) => setTopOpen('favoritos', v)}>
          <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-1.5 text-[13px] font-semibold tracking-wide text-sidebar-foreground/80 hover:text-sidebar-foreground">
            <span className="flex min-w-0 items-center gap-2">
              <Star className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate whitespace-nowrap">Favoritos</span>}
            </span>
            {!collapsed && <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>
              {visibleFavs.length > 0 ? (
                <SidebarMenu className={cn(!collapsed && 'ml-[18px] border-l border-sidebar-border/40 pl-1.5 gap-0')}>
                  {visibleFavs.map((it) => renderItemRow(it))}
                </SidebarMenu>
              ) : (
                !collapsed && (
                  <p className="px-4 py-1 text-[12px] leading-snug text-sidebar-foreground/50">
                    {q ? 'Nenhum favorito corresponde à busca.' : 'Nenhum favorito ainda. Clique na ★ ao lado de qualquer item para adicionar.'}
                  </p>
                )
              )}
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    );
  };

  const renderLeafTop = (top: Extract<TopMenu, { kind: 'leaf' }>) => {
    if (!isVisible(top.item.url)) return null;
    if (!matchesQuery(top.label) && !matchesQuery(top.item.title)) return null;
    const active = location.pathname === top.item.url;
    const Icon = top.icon;
    return (
      <SidebarGroup key={top.id} className="py-0.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="min-h-[32px]">
              <NavLink
                to={top.item.url}
                end
                onClick={closeMobileMaybe}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-[13px] font-semibold tracking-wide text-sidebar-foreground/80 hover:text-sidebar-foreground',
                  active && 'bg-primary/15 text-primary',
                )}
                activeClassName="bg-primary/15 text-primary"
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate whitespace-nowrap">{top.label}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  };

  const renderFlatTop = (top: Extract<TopMenu, { kind: 'flat' }>) => {
    const items = filterLeaves(top.items);
    if (items.length === 0) return null;
    if (top.id === 'config' && !isAdmin) {
      // Se algum item requer permissão, o filtro isVisible já cuidou. Sem gate extra.
    }
    const isOpen = forceOpen || openTop === top.id;
    const Icon = top.icon;
    return (
      <SidebarGroup key={top.id} className="py-0.5">
        <Collapsible open={isOpen} onOpenChange={(v) => setTopOpen(top.id, v)}>
          <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-1.5 text-[13px] font-semibold tracking-wide text-sidebar-foreground/80 hover:text-sidebar-foreground">
            <span className="flex min-w-0 items-center gap-2">
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate whitespace-nowrap">{top.label}</span>}
            </span>
            {!collapsed && <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu className={cn(!collapsed && 'ml-[18px] border-l border-sidebar-border/40 pl-1.5 gap-0')}>
                {items.map((it) => renderItemRow(it))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    );
  };

  const renderNestedTop = (top: Extract<TopMenu, { kind: 'nested' }>) => {
    const subs = top.subGroups
      .map((sg) => ({ ...sg, items: filterLeaves(sg.items) }))
      .filter((sg) => sg.items.length > 0);
    if (subs.length === 0) return null;
    const isOpen = forceOpen || openTop === top.id;
    const Icon = top.icon;
    return (
      <SidebarGroup key={top.id} className="py-0.5">
        <Collapsible open={isOpen} onOpenChange={(v) => setTopOpen(top.id, v)}>
          <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-1.5 text-[13px] font-semibold tracking-wide text-sidebar-foreground/80 hover:text-sidebar-foreground">
            <span className="flex min-w-0 items-center gap-2">
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate whitespace-nowrap">{top.label}</span>}
            </span>
            {!collapsed && <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>
              {subs.map((sg) => {
                const subOpen = forceOpen || openSubs[sg.id] === true;
                const SubIcon = sg.icon;
                return (
                  <Collapsible
                    key={sg.id}
                    open={subOpen}
                    onOpenChange={(v) => setSubOpen(sg.id, v)}
                    className={cn(!collapsed && 'ml-[18px] border-l border-sidebar-border/40 pl-1')}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-1 text-[12px] font-medium tracking-normal text-sidebar-foreground/70 hover:text-sidebar-foreground">
                      <span className="flex min-w-0 items-center gap-2">
                        <SubIcon className="h-3.5 w-3.5 shrink-0" />
                        {!collapsed && <span className="truncate whitespace-nowrap">{sg.label}</span>}
                      </span>
                      {!collapsed && <ChevronDown className={cn('h-3 w-3 transition-transform', subOpen && 'rotate-180')} />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu className={cn(!collapsed && 'ml-2 border-l border-sidebar-border/30 pl-1.5 gap-0')}>
                        {sg.items.map((it) => renderItemRow(it))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    );
  };

  const renderTop = (top: TopMenu) => {
    if (top.kind === 'leaf') return renderLeafTop(top);
    if (top.kind === 'flat') return renderFlatTop(top);
    return renderNestedTop(top);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-sidebar-primary" />
          {!collapsed && <BrandName />}
        </div>
        {!collapsed && (
          <div className="relative mt-3">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/50" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar menu…"
              className="h-9 pl-8 text-sm bg-sidebar-accent/40 border-sidebar-border"
            />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {renderFavoritesTop()}
        {TOP_MENUS.map(renderTop)}
      </SidebarContent>
    </Sidebar>
  );
}
