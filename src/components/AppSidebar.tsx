import {
  Package, Search, GitBranch, ShoppingCart, BarChart3,
  Factory, FileCheck, LayoutDashboard,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
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

const modules = [
  { title: 'Estoque', url: '/estoque', icon: Package },
  { title: 'Onde Usa', url: '/onde-usa', icon: Search },
  { title: 'Estrutura (BOM)', url: '/bom', icon: GitBranch },
  { title: 'Compras / Custos', url: '/compras-produto', icon: ShoppingCart },
  { title: 'Painel de Compras', url: '/painel-compras', icon: BarChart3 },
  { title: 'Eng. x Produção', url: '/engenharia-producao', icon: Factory },
  { title: 'Auditoria Tributária', url: '/auditoria-tributaria', icon: FileCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

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
              {modules.map((item) => (
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
      </SidebarContent>
    </Sidebar>
  );
}
