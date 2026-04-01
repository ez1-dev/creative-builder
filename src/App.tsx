import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import EstoquePage from "@/pages/EstoquePage";
import OndeUsaPage from "@/pages/OndeUsaPage";
import BomPage from "@/pages/BomPage";
import ComprasProdutoPage from "@/pages/ComprasProdutoPage";
import PainelComprasPage from "@/pages/PainelComprasPage";
import EngenhariaProducaoPage from "@/pages/EngenhariaProducaoPage";
import AuditoriaTributariaPage from "@/pages/AuditoriaTributariaPage";
import ConciliacaoEdocsPage from "@/pages/ConciliacaoEdocsPage";
import NotasRecebimentoPage from "@/pages/NotasRecebimentoPage";
import NumeroSeriePage from "@/pages/NumeroSeriePage";
import ConfiguracoesPage from "@/pages/ConfiguracoesPage";
import NotFound from "@/pages/NotFound";
import { useUserPermissions } from "@/hooks/useUserPermissions";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

function ProtectedRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { canView, loading, hasPermissions } = useUserPermissions();
  if (loading) return null;
  if (hasPermissions && !canView(path)) {
    return <Navigate to="/estoque" replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/estoque" replace />} />
              <Route path="/estoque" element={<ProtectedRoute path="/estoque"><EstoquePage /></ProtectedRoute>} />
              <Route path="/onde-usa" element={<ProtectedRoute path="/onde-usa"><OndeUsaPage /></ProtectedRoute>} />
              <Route path="/bom" element={<ProtectedRoute path="/bom"><BomPage /></ProtectedRoute>} />
              <Route path="/compras-produto" element={<ProtectedRoute path="/compras-produto"><ComprasProdutoPage /></ProtectedRoute>} />
              <Route path="/painel-compras" element={<ProtectedRoute path="/painel-compras"><PainelComprasPage /></ProtectedRoute>} />
              <Route path="/engenharia-producao" element={<ProtectedRoute path="/engenharia-producao"><EngenhariaProducaoPage /></ProtectedRoute>} />
              <Route path="/auditoria-tributaria" element={<ProtectedRoute path="/auditoria-tributaria"><AuditoriaTributariaPage /></ProtectedRoute>} />
              <Route path="/conciliacao-edocs" element={<ProtectedRoute path="/conciliacao-edocs"><ConciliacaoEdocsPage /></ProtectedRoute>} />
              <Route path="/notas-recebimento" element={<ProtectedRoute path="/notas-recebimento"><NotasRecebimentoPage /></ProtectedRoute>} />
              <Route path="/numero-serie" element={<ProtectedRoute path="/numero-serie"><NumeroSeriePage /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute path="/configuracoes"><ConfiguracoesPage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
