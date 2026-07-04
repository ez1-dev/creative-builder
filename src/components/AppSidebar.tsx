import { useMemo, useState } from 'react';
import {
  Home, FileBarChart, Star, StarOff, Search as SearchIcon,
  Package, GitBranch, ShoppingCart, BarChart3,
  Factory, FileCheck, FileSearch, LayoutDashboard, FileInput, Hash, Settings,
  Hammer, Truck, Warehouse, PackageX, Clock, GitCompare, ChevronDown, Landmark, HandCoins, Gauge, Sparkles, ClipboardCheck, Receipt, Plane, CalendarRange, CalendarClock, Users, ShieldCheck, Palette, Database, ShieldAlert, FileText, History, Cog, Printer, Activity, Boxes, PackageSearch,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useFavorites } from '@/hooks/useFavorites';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Item = { title: string; url: string; icon: any };
type SubGroup = { id: string; label: string; items: Item[] };
type Group = { id: string; label: string; icon: any; items?: Item[]; subGroups?: SubGroup[] };

const GROUPS: Group[] = [
  {
    id: 'inicio',
    label: 'Início',
    icon: Home,
    items: [
      { title: 'Dashboard Geral', url: '/', icon: LayoutDashboard },
      { title: 'Relatório Executivo', url: '/bi/faturamento/relatorio-executivo', icon: FileBarChart },
    ],
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    icon: Boxes,
    subGroups: [
      {
        id: 'cad-produtos',
        label: 'Produtos',
        items: [
          { title: 'Produtos', url: '/cadastros/produtos', icon: PackageSearch },
        ],
      },
      {
        id: 'cad-engenharia',
        label: 'Engenharia de Produto',
        items: [
          { title: 'Estrutura Multinível', url: '/bom', icon: GitBranch },
          { title: 'Onde Usa', url: '/onde-usa', icon: SearchIcon },
        ],
      },
    ],
  },
  {
    id: 'estoque',
    label: 'Estoque',
    icon: Warehouse,
    items: [
      { title: 'Consulta de Estoques', url: '/estoque', icon: Package },
      { title: 'Estoque Min/Max', url: '/estoque-min-max', icon: Gauge },
      { title: 'Sugestão Min/Max', url: '/sugestao-min-max', icon: Sparkles },
    ],
  },
  {
    id: 'suprimentos',
    label: 'Suprimentos',
    icon: ShoppingCart,
    items: [
      { title: 'Painel de Compras', url: '/painel-compras', icon: BarChart3 },
      { title: 'Compras / Custos', url: '/compras-produto', icon: ShoppingCart },
      { title: 'Compras e Recebimentos', url: '/demonstrativo-compras-recebimentos', icon: GitCompare },
      { title: 'NF Recebimento', url: '/notas-recebimento', icon: FileInput },
    ],
  },
  {
    id: 'producao',
    label: 'Produção',
    icon: Factory,
    subGroups: [
      {
        id: 'prod-visao',
        label: 'Visão Geral',
        items: [
          { title: 'Dashboard', url: '/producao/dashboard', icon: LayoutDashboard },
          { title: 'Produção no Período', url: '/producao/produzido', icon: Hammer },
          { title: 'Saldo em Pátio', url: '/producao/patio', icon: Warehouse },
          { title: 'Lead Time', url: '/producao/leadtime', icon: Clock },
        ],
      },
      {
        id: 'prod-planejamento',
        label: 'Planejamento',
        items: [
          { title: 'Carga de Produção', url: '/producao/carga', icon: Gauge },
          { title: 'Sequenciamento', url: '/producao/programacao', icon: CalendarClock },
          { title: 'Dashboard de Carga', url: '/producao/carga/dashboard', icon: Activity },
          { title: 'Carga por Recurso', url: '/producao/carga/recursos', icon: Gauge },
        ],
      },
      {
        id: 'prod-obras',
        label: 'Obras e Expedição',
        items: [
          { title: 'Expedição para Obra', url: '/producao/expedido', icon: Truck },
          { title: 'Semanal por Obra', url: '/producao/relatorio-semanal-obra', icon: CalendarRange },
          { title: 'Não Carregados', url: '/producao/nao-carregados', icon: PackageX },
          { title: 'Reserva Nº Série', url: '/numero-serie', icon: Hash },
        ],
      },
      {
        id: 'prod-engenharia',
        label: 'Engenharia / OP',
        items: [
          { title: 'Engenharia x Produção', url: '/producao/engenharia', icon: GitCompare },
          { title: 'Impressão de OP', url: '/producao/impressao-op', icon: Printer },
        ],
      },
    ],
  },
  {
    id: 'comercial',
    label: 'Comercial / Faturamento',
    icon: BarChart3,
    items: [
      { title: 'BI Comercial', url: '/bi/comercial', icon: BarChart3 },
      { title: 'Metas de Faturamento', url: '/bi/comercial/metas', icon: BarChart3 },
      { title: 'Validação Faturamento', url: '/bi/faturamento-validacao', icon: FileCheck },
      { title: 'Faturamento Genius', url: '/faturamento-genius', icon: Receipt },
      { title: 'Auditoria Apont. Genius', url: '/auditoria-apontamento-genius', icon: ClipboardCheck },
    ],
  },
  {
    id: 'fiscal',
    label: 'Fiscal',
    icon: FileCheck,
    items: [
      { title: 'Auditoria Tributária', url: '/auditoria-tributaria', icon: FileCheck },
      { title: 'Conciliação EDocs', url: '/conciliacao-edocs', icon: FileSearch },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: HandCoins,
    items: [
      { title: 'Contas a Pagar', url: '/contas-pagar', icon: Landmark },
      { title: 'Contas a Receber', url: '/contas-receber', icon: HandCoins },
    ],
  },
  {
    id: 'controladoria',
    label: 'Controladoria',
    icon: Landmark,
    items: [
      { title: 'Balanço', url: '/contabilidade/balanco', icon: Landmark },
    ],
    subGroups: [
      {
        id: 'ctrl-dre',
        label: 'DRE',
        items: [
          { title: 'Contabilidade — DRE', url: '/bi/contabilidade/dre', icon: BarChart3 },
          { title: 'DRE Configurável', url: '/bi/financeiro/dre-configuravel', icon: Landmark },
          { title: 'DRE Dinâmica', url: '/bi/contabilidade/dre-dinamica', icon: BarChart3 },
          { title: 'Montador DRE', url: '/bi/contabilidade/dre-dinamica/montador', icon: Cog },
          { title: 'Exceções DRE', url: '/bi/contabilidade/dre/excecoes', icon: FileCheck },
          { title: 'Aprovações DRE', url: '/bi/contabilidade/dre/aprovacoes', icon: FileCheck },
          { title: 'Parametrização DRE', url: '/bi/contabilidade/dre/parametrizacao', icon: FileCheck },
          { title: 'Configurações DRE', url: '/bi/contabilidade/dre/configuracao', icon: Cog },
          { title: 'De/Para DRE', url: '/bi/contabilidade/dre/sincronizacao-depara', icon: Database },
        ],
      },
    ],
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    icon: Cog,
    items: [
      { title: 'Manutenção de Frota', url: '/frota', icon: Truck },
      { title: 'Manutenção de Máquinas', url: '/manutencao-maquinas', icon: Cog },
    ],
  },
  {
    id: 'bi-dados',
    label: 'BI e Dados',
    icon: Database,
    items: [
      { title: 'Biblioteca BI', url: '/biblioteca-bi', icon: Palette },
      { title: 'Central ETL', url: '/etl', icon: Database },
    ],
  },
  {
    id: 'rh',
    label: 'RH',
    icon: Users,
    items: [
      { title: 'Resumo Folha', url: '/rh/resumo-folha', icon: Receipt },
      { title: 'Quadro Colaboradores', url: '/rh/quadro-colaboradores', icon: Users },
      { title: 'Contratos de Experiência', url: '/rh/contrato-experiencia', icon: FileCheck },
      { title: 'Férias', url: '/rh/programacao-ferias', icon: CalendarRange },
      { title: 'Formulários', url: '/rh/formularios', icon: FileText },
    ],
  },
  {
    id: 'regras',
    label: 'Regras Senior',
    icon: ShieldAlert,
    items: [
      { title: 'Dashboard', url: '/regras-senior', icon: LayoutDashboard },
      { title: 'Regras LSP', url: '/regras-senior/regras', icon: FileText },
      { title: 'Identificadores', url: '/regras-senior/identificadores', icon: ShieldCheck },
      { title: 'Auditoria', url: '/regras-senior/auditoria', icon: History },
      { title: 'Snapshots', url: '/regras-senior/snapshots', icon: Database },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: FileText,
    items: [
      { title: 'Criador de Relatórios', url: '/relatorios/desenvolvimento', icon: FileText },
      { title: 'Relatórios Publicados', url: '/relatorios/publicados', icon: FileCheck },
      { title: 'Histórico', url: '/relatorios/execucoes', icon: History },
    ],
  },
  {
    id: 'admin',
    label: 'Administração',
    icon: Settings,
    items: [
      { title: 'Passagens Aéreas', url: '/passagens-aereas', icon: Plane },
      { title: 'Monitor Usuários Senior', url: '/monitor-usuarios-senior', icon: Users },
      { title: 'Gestão SGU', url: '/gestao-sgu-usuarios', icon: ShieldCheck },
      { title: 'Configurações', url: '/configuracoes', icon: Settings },
    ],
  },
];

const OUTROS: Item[] = [];


const ALWAYS_VISIBLE = new Set<string>(['/biblioteca-bi', '/']);

function groupActiveId(pathname: string): string | null {
  const flat: Array<{ id: string; url: string }> = [];
  for (const g of GROUPS) {
    for (const it of g.items ?? []) flat.push({ id: g.id, url: it.url });
    for (const sg of g.subGroups ?? []) for (const it of sg.items) flat.push({ id: g.id, url: it.url });
  }
  // Preferir match exato, depois prefixo mais longo
  let best: { id: string; len: number } | null = null;
  for (const f of flat) {
    if (pathname === f.url || (f.url !== '/' && pathname.startsWith(f.url + '/')) || pathname.startsWith(f.url)) {
      const len = f.url.length;
      if (!best || len > best.len) best = { id: f.id, len };
    }
  }
  return best?.id ?? null;
}

function subGroupActiveId(pathname: string, group: Group): string | null {
  if (!group.subGroups) return null;
  let best: { id: string; len: number } | null = null;
  for (const sg of group.subGroups) {
    for (const it of sg.items) {
      if (pathname === it.url || pathname.startsWith(it.url + '/')) {
        const len = it.url.length;
        if (!best || len > best.len) best = { id: sg.id, len };
      }
    }
  }
  return best?.id ?? group.subGroups[0]?.id ?? null;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { canView, hasPermissions, loading, isAdmin } = useUserPermissions();
  const { favorites, isFavorite, toggle } = useFavorites();

  const activeGroupId = useMemo(() => groupActiveId(location.pathname), [location.pathname]);
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroupId ?? 'inicio');
  const [openSub, setOpenSub] = useState<Record<string, string | null>>({});
  const [query, setQuery] = useState('');

  // Se a rota muda para outro grupo, expande-o
  useMemo(() => {
    if (activeGroupId && activeGroupId !== openGroup) setOpenGroup(activeGroupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId]);

  const isVisible = (url: string) => {
    if (ALWAYS_VISIBLE.has(url)) return true;
    if (loading) return false;
    if (!hasPermissions) return true;
    return canView(url);
  };

  const q = query.trim().toLowerCase();
  const matchesQuery = (title: string) => (q ? title.toLowerCase().includes(q) : true);

  const filterItems = (items: Item[]) =>
    items.filter((it) => isVisible(it.url) && matchesQuery(it.title));

  const setGroupOpen = (id: string, next: boolean) => {
    setOpenGroup(next ? id : null);
  };

  const setSubOpen = (groupId: string, subId: string, next: boolean) => {
    setOpenSub((prev) => ({ ...prev, [groupId]: next ? subId : null }));
  };

  const renderItemRow = (item: Item, canFavorite = true) => {
    const active = location.pathname === item.url;
    const fav = isFavorite(item.url);
    return (
      <SidebarMenuItem key={item.url}>
        <div className="group/item flex items-center">
          <SidebarMenuButton asChild className="flex-1 min-h-[34px]">
            <NavLink
              to={item.url}
              end
              className={cn(
                'hover:bg-sidebar-accent',
                active && 'bg-primary/15 text-primary font-medium',
              )}
              activeClassName="bg-primary/15 text-primary font-medium"
            >
              <item.icon className="mr-2.5 h-[18px] w-[18px]" />
              {!collapsed && <span className="truncate text-[13.5px]">{item.title}</span>}
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

  // Favoritos resolvidos (título + icon) a partir da árvore
  const favoriteItems = useMemo(() => {
    const map = new Map<string, Item>();
    for (const g of GROUPS) {
      for (const it of g.items ?? []) map.set(it.url, it);
      for (const sg of g.subGroups ?? []) for (const it of sg.items) map.set(it.url, it);
    }
    for (const it of OUTROS) map.set(it.url, it);
    return favorites.map((u) => map.get(u)).filter(Boolean).filter((it) => isVisible(it!.url)) as Item[];
  }, [favorites, loading, hasPermissions]);

  const renderGroup = (group: Group) => {
    // Determina se grupo tem conteúdo após filtros
    const items = group.items ? filterItems(group.items) : [];
    const subGroupsFiltered = (group.subGroups ?? [])
      .map((sg) => ({ ...sg, items: filterItems(sg.items) }))
      .filter((sg) => sg.items.length > 0);
    const hasContent = items.length > 0 || subGroupsFiltered.length > 0;
    if (!hasContent && group.id !== 'inicio') return null;
    if (group.id === 'relatorios' && !isAdmin) return null;

    const forceOpen = q.length > 0; // busca abre tudo que tem match
    const isOpen = forceOpen || openGroup === group.id;
    const Icon = group.icon;

    return (
      <SidebarGroup key={group.id}>
        <Collapsible open={isOpen} onOpenChange={(v) => setGroupOpen(group.id, v)}>
          <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2 text-[13px] font-semibold tracking-wide text-sidebar-foreground/80 hover:text-sidebar-foreground">
            <span className="flex items-center gap-2">
              <Icon className="h-[18px] w-[18px]" />
              {!collapsed && group.label}
            </span>
            {!collapsed && <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>
              {items.length > 0 && (
                <SidebarMenu>
                  {items.map((it) => renderItemRow(it))}
                </SidebarMenu>
              )}

              {subGroupsFiltered.map((sg) => {
                const subOpen = forceOpen || openSub[group.id] === sg.id ||
                  (openSub[group.id] === undefined && sg.id === subGroupActiveId(location.pathname, group));
                return (
                  <Collapsible
                    key={sg.id}
                    open={subOpen}
                    onOpenChange={(v) => setSubOpen(group.id, sg.id, v)}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-1.5 text-[12px] font-medium uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground">
                      <span>{!collapsed && sg.label}</span>
                      {!collapsed && <ChevronDown className={cn('h-3 w-3 transition-transform', subOpen && 'rotate-180')} />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu>
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

  

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-sidebar-primary" />
          {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">ERP Sapiens</span>}
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
        {renderFavoritesGroup()}
        {GROUPS.map(renderGroup)}
      </SidebarContent>

    </Sidebar>
  );
}
