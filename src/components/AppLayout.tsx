import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Clock } from 'lucide-react';
import { HeaderInfo } from '@/components/HeaderInfo';
import { AiAssistantChat } from '@/components/erp/AiAssistantChat';
import { UpdateNotifier } from '@/components/UpdateNotifier';
import packageJson from '../../package.json';

export default function AppLayout() {
  const { isAuthenticated, user, displayName, approved, loading, logout } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!approved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[hsl(215,70%,22%)] to-[hsl(215,60%,35%)]">
        <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-2xl text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Acesso Pendente</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta foi criada com sucesso, mas ainda está aguardando aprovação de um administrador.
          </p>
          <p className="text-xs text-muted-foreground">
            Você será notificado quando seu acesso for liberado. Tente novamente mais tarde.
          </p>
          <Button variant="outline" onClick={logout} className="w-full gap-2">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    );
  }

  const label = displayName || user?.email || '';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center justify-between border-b bg-card px-3">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="ml-0" />
              <HeaderInfo />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Olá, <strong className="text-foreground">{label}</strong>
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
          <AiAssistantChat />
          <UpdateNotifier />
          <footer className="border-t bg-card px-3 py-2 text-center text-xs text-muted-foreground">
            EZ ERP IA v{packageJson.version} · © {new Date().getFullYear()} Todos os direitos reservados.
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
