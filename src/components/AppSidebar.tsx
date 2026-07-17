import { useEffect, useMemo, useState } from 'react';
import {
  Home, Star, StarOff, Search as SearchIcon, ChevronDown,
  Package, Users, Settings, Factory, ShoppingCart, Warehouse, Landmark,
  Receipt, BarChart3, Boxes, ShieldAlert, FileText, Cog, LayoutDashboard,
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

function BrandName() {
  const { name } = useBrand('ERP Sapiens');
  return <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground truncate">{name}</span>;
}

// ============ Tipos ============
type Leaf = { title: string; url: string; icon: any };
type SubGroup = { id: string; label: string; icon: any; items: Leaf[] };
type TopMenu =
  | { id: string; label: string; icon: any; kind: 'leaf'; item: Leaf }
  | { id: string; label: string; icon: any; kind: 'flat'; items: Leaf[] }
  | { id: string; label: string; icon: any; kind: 'nested'; subGroups: SubGroup[] };

// ============ Árvore do menu ============
const TOP_MENUS: TopMenu[] = [
  {
    id: 'inicio',
    label: 'Início',
    icon: Home,
    kind: 'leaf',
    item: { title: 'Início', url: '/dashboard-geral', icon: Home },
  },
  {
    id: 'erp',
    label: 'ERP',
    icon: Package,
    kind: 'nested',
    subGroups: [
      {
        id: 'erp-producao', label: 'Produção', icon: Factory,
        items: [
          { title: 'Produção — Dashboard', url: '/producao/dashboard', icon: LayoutDashboard },
          { title: 'Produzido no Período', url: '/producao/produzido', icon: Factory },
          { title: 'Expedido para Obra', url: '/producao/expedido', icon: Factory },
          { title: 'Saldo em Pátio', url: '/producao/patio', icon: Warehouse },
          { title: 'Não Carregados', url: '/producao/nao-carregados', icon: Factory },
          { title: 'Lead Time', url: '/producao/leadtime', icon: Factory },
          { title: 'Engenharia x Produção', url: '/producao/engenharia', icon: Factory },
          { title: 'Relatório Semanal por Obra', url: '/producao/relatorio-semanal-obra', icon: FileText },
          { title: 'Impressão de Ordem de Produção', url: '/producao/impressao-op', icon: FileText },
          { title: 'Carga de Produção', url: '/producao/carga', icon: Factory },
          { title: 'Carga — Dashboard BI', url: '/producao/carga/dashboard', icon: LayoutDashboard },
          { title: 'Carga por Centro de Recurso', url: '/producao/carga/recursos', icon: Factory },
          { title: 'Programação e Sequenciamento', url: '/producao/programacao', icon: Factory },
        ],
      },
      {
        id: 'erp-compras', label: 'Compras e Suprimentos', icon: ShoppingCart,
        items: [
          { title: 'Compras / Custos', url: '/compras-produto', icon: ShoppingCart },
          { title: 'Painel de Compras', url: '/painel-compras', icon: ShoppingCart },
          { title: 'Demonstrativo de Compras e Recebimentos', url: '/demonstrativo-compras-recebimentos', icon: ShoppingCart },
          { title: 'Auditoria Tributária', url: '/auditoria-tributaria', icon: FileText },
          { title: 'Notas Fiscais de Recebimento', url: '/notas-recebimento', icon: Receipt },
        ],
      },
      {
        id: 'erp-estoque', label: 'Estoque', icon: Warehouse,
        items: [
          { title: 'Estoque', url: '/estoque', icon: Warehouse },
          { title: 'Estoque Mínimo/Máximo', url: '/estoque-min-max', icon: Warehouse },
          { title: 'Sugestão de Mínimo/Máximo', url: '/sugestao-min-max', icon: Warehouse },
          { title: 'Onde Usa', url: '/onde-usa', icon: SearchIcon },
          { title: 'Estrutura de Produto — BOM', url: '/bom', icon: Boxes },
          { title: 'Reserva de Número de Série', url: '/numero-serie', icon: Boxes },
        ],
      },
      {
        id: 'erp-financeiro', label: 'Financeiro e Contábil', icon: Landmark,
        items: [
          { title: 'Conciliação EDocs', url: '/conciliacao-edocs', icon: Landmark },
          { title: 'Contas a Pagar', url: '/contas-pagar', icon: Landmark },
          { title: 'Contas a Receber', url: '/contas-receber', icon: Landmark },
          { title: 'Balanço Patrimonial', url: '/contabilidade/balanco', icon: Landmark },
          { title: 'DRE Studio — Visão Geral', url: '/contabilidade/dre-studio', icon: Landmark },
          { title: 'DRE Studio — Modelos', url: '/contabilidade/dre-studio', icon: Landmark },
          { title: 'DRE Studio — Novo Modelo', url: '/contabilidade/dre-studio/novo', icon: Landmark },
        ],
      },
      {
        id: 'erp-faturamento', label: 'Faturamento', icon: Receipt,
        items: [
          { title: 'Auditoria de Apontamento Genius', url: '/auditoria-apontamento-genius', icon: FileText },
          { title: 'Faturamento Genius', url: '/faturamento-genius', icon: Receipt },
        ],
      },
      {
        id: 'erp-bi', label: 'BI e Analytics', icon: BarChart3,
        items: [
          { title: 'Contabilidade — DRE', url: '/bi/contabilidade/dre', icon: BarChart3 },
          { title: 'DRE — Exceções', url: '/bi/contabilidade/dre/excecoes', icon: BarChart3 },
          { title: 'DRE — Aprovações', url: '/bi/contabilidade/dre/aprovacoes', icon: BarChart3 },
          { title: 'DRE — Parametrização', url: '/bi/contabilidade/dre/parametrizacao', icon: BarChart3 },
          { title: 'DRE — Sincronização De/Para', url: '/bi/contabilidade/dre/sincronizacao-depara', icon: BarChart3 },
          { title: 'Configuração da DRE Gerencial', url: '/bi/contabilidade/dre/configuracao', icon: BarChart3 },
          { title: 'DRE Dinâmica Gerencial', url: '/bi/contabilidade/dre-dinamica', icon: BarChart3 },
          { title: 'Montador da DRE Gerencial', url: '/bi/contabilidade/dre-dinamica/montador', icon: BarChart3 },
          { title: 'BI Financeiro — DRE Configurável', url: '/bi/financeiro/dre-configuravel', icon: BarChart3 },
          { title: 'Validação de Faturamento', url: '/bi/faturamento-validacao', icon: BarChart3 },
          { title: 'BI Comercial', url: '/bi/comercial', icon: BarChart3 },
          { title: 'Metas de Faturamento', url: '/bi/comercial/metas', icon: BarChart3 },
          { title: 'Relatório Executivo de Faturamento', url: '/bi/faturamento/relatorio-executivo', icon: BarChart3 },
          { title: 'ETL / Camada Analítica', url: '/etl', icon: BarChart3 },
        ],
      },
      {
        id: 'erp-cadastros', label: 'Cadastros', icon: Boxes,
        items: [
          { title: 'Consulta de Produtos', url: '/cadastros/produtos', icon: Boxes },
        ],
      },
      {
        id: 'erp-regras', label: 'Regras Senior', icon: ShieldAlert,
        items: [
          { title: 'Dashboard', url: '/regras-senior', icon: LayoutDashboard },
          { title: 'Lista de Regras', url: '/regras-senior/regras', icon: FileText },
          { title: 'Identificadores', url: '/regras-senior/identificadores', icon: ShieldAlert },
          { title: 'Auditoria', url: '/regras-senior/auditoria', icon: FileText },
          { title: 'Snapshots', url: '/regras-senior/snapshots', icon: FileText },
        ],
      },
      {
        id: 'erp-relatorios', label: 'Relatórios', icon: FileText,
        items: [
          { title: 'Desenvolvimento', url: '/relatorios/desenvolvimento', icon: FileText },
          { title: 'Publicados', url: '/relatorios/publicados', icon: FileText },
          { title: 'Histórico de Execuções', url: '/relatorios/execucoes', icon: FileText },
        ],
      },
      {
        id: 'erp-operacional', label: 'Operacional', icon: Cog,
        items: [
          { title: 'Passagens Aéreas', url: '/passagens-aereas', icon: Cog },
          { title: 'Passagens — Relatório Executivo', url: '/passagens-aereas/relatorio-executivo', icon: FileText },
          { title: 'Manutenção de Frota', url: '/frota', icon: Cog },
          { title: 'Frota — Relatório Executivo', url: '/frota/relatorio-executivo', icon: FileText },
          { title: 'Manutenção de Máquinas', url: '/manutencao-maquinas', icon: Cog },
          { title: 'Máquinas — Relatório Executivo', url: '/manutencao-maquinas/relatorio-executivo', icon: FileText },
          { title: 'Tipos de Máquina', url: '/manutencao-maquinas/tipos', icon: Cog },
        ],
      },
    ],
  },
  {
    id: 'hcm',
    label: 'HCM',
    icon: Users,
    kind: 'flat',
    items: [
      { title: 'Visão Geral do RH', url: '/rh', icon: Users },
      { title: 'Resumo da Folha', url: '/rh/resumo-folha', icon: Receipt },
      { title: 'Quadro de Colaboradores', url: '/rh/quadro-colaboradores', icon: Users },
      { title: 'Contratos de Experiência', url: '/rh/contrato-experiencia', icon: FileText },
      { title: 'Férias', url: '/rh/programacao-ferias', icon: Users },
      { title: 'Turnover', url: '/rh/turnover', icon: Users },
      { title: 'Absenteísmo e Afastamentos', url: '/rh/absenteismo', icon: Users },
      { title: 'Formulários', url: '/rh/formularios', icon: FileText },
      { title: 'Relatório Gerencial — PDF + IA', url: '/rh/relatorio-gerencial', icon: FileText },
    ],
  },
  {
    id: 'config',
    label: 'Configurações',
    icon: Settings,
    kind: 'flat',
    items: [
      { title: 'Monitor de Usuários Senior', url: '/monitor-usuarios-senior', icon: Users },
      { title: 'Monitor de Telas (IA)', url: '/monitor-telas', icon: BarChart3 },
      { title: 'Gestão SGU — Usuários ERP Senior', url: '/gestao-sgu-usuarios', icon: Users },
      { title: 'Configurações Gerais', url: '/configuracoes', icon: Settings },
      { title: 'Biblioteca BI — Catálogo de Componentes', url: '/biblioteca-bi', icon: Boxes },
    ],
  },
];

const ALWAYS_VISIBLE = new Set<string>(['/biblioteca-bi', '/']);

// ============ Helpers ============
function allLeaves(top: TopMenu): Leaf[] {
  if (top.kind === 'leaf') return [top.item];
  if (top.kind === 'flat') return top.items;
  return top.subGroups.flatMap((sg) => sg.items);
}

function findActive(pathname: string): { topId: string | null; subId: string | null } {
  let best: { topId: string; subId: string | null; len: number } | null = null;
  for (const top of TOP_MENUS) {
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

  const { topId: activeTopId, subId: activeSubId } = useMemo(
    () => findActive(location.pathname),
    [location.pathname],
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
