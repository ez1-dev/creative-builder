import {
  Package, Search, GitBranch, ShoppingCart, BarChart3,
  Factory, FileCheck, FileSearch, LayoutDashboard, FileInput, Hash, Settings,
  Hammer, Truck, Warehouse, PackageX, Clock, GitCompare, ChevronDown, Landmark, HandCoins,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';
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
import { cn } from '@/lib/utils';

const modules = [
  { title: 'Consulta de Estoques', url: '/estoque', icon: Package },
  { title: 'Consulta Onde Usa', url: '/onde-usa', icon: Search },
  { title: 'Estrutura BOM', url: '/bom', icon: GitBranch },
  { title: 'Consulta Compras/Custos', url: '/compras-produto', icon: ShoppingCart },
  { title: 'Painel de Compras', url: '/painel-compras', icon: BarChart3 },
  { title: 'Auditoria Tributária', url: '/auditoria-tributaria', icon: FileCheck },
  { title: 'Conciliação EDocs', url: '/conciliacao-edocs', icon: FileSearch },
  { title: 'Consulta NF Receb.', url: '/notas-recebimento', icon: FileInput },
  { title: 'Reserva Nº Série', url: '/numero-serie', icon: Hash },
  { title: 'Contas a Pagar', url: '/contas-pagar', icon: Landmark },
  { title: 'Contas a Receber', url: '/contas-receber', icon: HandCoins },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

const producaoSubItems = [
  { title: 'Dashboard', url: '/producao/dashboard', icon: LayoutDashboard },
  { title: 'Produzido no Período', url: '/producao/produzido', icon: Hammer },
  { title: 'Expedido para Obra', url: '/producao/expedido', icon: Truck },
  { title: 'Saldo em Pátio', url: '/producao/patio', icon: Warehouse },
  { title: 'Itens Não Carregados', url: '/producao/nao-carregados', icon: PackageX },
  { title: 'Lead Time Produção', url: '/producao/leadtime', icon: Clock },
  { title: 'Engenharia x Produção', url: '/producao/engenharia', icon: GitCompare },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { canView, hasPermissions, loading } = useUserPermissions();

  const isProducaoActive = location.pathname.startsWith('/producao');

  const isVisible = (url: string) => {
    if (loading) return false;
    if (!hasPermissions) return true;
    return canView(url);
  };

  const visibleModules = modules.filter((m) => isVisible(m.url));
  const visibleProducao = producaoSubItems.filter((m) => isVisible(m.url));
  const showProducaoGroup = visibleProducao.length > 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-sidebar-primary" />
          {!collapsed && <span className="font-bold text-sm text-sidebar-foreground">ERP Sapiens</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showProducaoGroup && (
          <SidebarGroup>
            <Collapsible defaultOpen={isProducaoActive}>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground">
                <span className="flex items-center gap-2">
                  <Factory className="h-4 w-4" />
                  {!collapsed && 'Produção'}
                </span>
                {!collapsed && <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleProducao.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end
                            className="hover:bg-sidebar-accent"
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                          >
                            <item.icon className="mr-2 h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
