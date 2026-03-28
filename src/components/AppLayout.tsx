import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function AppLayout() {
  const { isAuthenticated, usuario, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center justify-between border-b bg-card px-3">
            <SidebarTrigger className="ml-0" />
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Olá, <strong className="text-foreground">{usuario}</strong>
              </span>
              <Button size="sm" variant="ghost" onClick={logout} className="h-7 text-xs gap-1">
                <LogOut className="h-3 w-3" />
                Sair
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
