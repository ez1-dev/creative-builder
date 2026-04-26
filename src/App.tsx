import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import AuthCallback from "@/pages/AuthCallback";
import EstoquePage from "@/pages/EstoquePage";
import EstoqueMinMaxPage from "@/pages/EstoqueMinMaxPage";
import SugestaoMinMaxPage from "@/pages/SugestaoMinMaxPage";
import OndeUsaPage from "@/pages/OndeUsaPage";
import BomPage from "@/pages/BomPage";
import ComprasProdutoPage from "@/pages/ComprasProdutoPage";
import PainelComprasPage from "@/pages/PainelComprasPage";
import EngenhariaProducaoPage from "@/pages/EngenhariaProducaoPage";
import AuditoriaTributariaPage from "@/pages/AuditoriaTributariaPage";
import AuditoriaApontamentoGeniusPage from "@/pages/AuditoriaApontamentoGeniusPage";
import ConciliacaoEdocsPage from "@/pages/ConciliacaoEdocsPage";
import NotasRecebimentoPage from "@/pages/NotasRecebimentoPage";
import NumeroSeriePage from "@/pages/NumeroSeriePage";
import ConfiguracoesPage from "@/pages/ConfiguracoesPage";
import ProducaoDashboardPage from "@/pages/producao/ProducaoDashboardPage";
import ProduzidoPeriodoPage from "@/pages/producao/ProduzidoPeriodoPage";
import ExpedidoObraPage from "@/pages/producao/ExpedidoObraPage";
import SaldoPatioPage from "@/pages/producao/SaldoPatioPage";
import NaoCarregadosPage from "@/pages/producao/NaoCarregadosPage";
import LeadTimeProducaoPage from "@/pages/producao/LeadTimeProducaoPage";
import ContasPagarPage from "@/pages/ContasPagarPage";
import ContasReceberPage from "@/pages/ContasReceberPage";
import FaturamentoGeniusPage from "@/pages/FaturamentoGeniusPage";
import NotFound from "@/pages/NotFound";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserTrackingProvider } from "@/components/UserTrackingProvider";
import { AiPageContextProvider } from "@/contexts/AiPageContext";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <UserTrackingProvider>
          <AiPageContextProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/estoque" replace />} />
              <Route path="/estoque" element={<ProtectedRoute path="/estoque"><EstoquePage /></ProtectedRoute>} />
              <Route path="/estoque-min-max" element={<ProtectedRoute path="/estoque-min-max"><EstoqueMinMaxPage /></ProtectedRoute>} />
              <Route path="/sugestao-min-max" element={<ProtectedRoute path="/sugestao-min-max"><SugestaoMinMaxPage /></ProtectedRoute>} />
              <Route path="/onde-usa" element={<ProtectedRoute path="/onde-usa"><OndeUsaPage /></ProtectedRoute>} />
              <Route path="/bom" element={<ProtectedRoute path="/bom"><BomPage /></ProtectedRoute>} />
              <Route path="/compras-produto" element={<ProtectedRoute path="/compras-produto"><ComprasProdutoPage /></ProtectedRoute>} />
              <Route path="/painel-compras" element={<ProtectedRoute path="/painel-compras"><PainelComprasPage /></ProtectedRoute>} />
              <Route path="/auditoria-tributaria" element={<ProtectedRoute path="/auditoria-tributaria"><AuditoriaTributariaPage /></ProtectedRoute>} />
              <Route path="/auditoria-apontamento-genius" element={<ProtectedRoute path="/auditoria-apontamento-genius"><AuditoriaApontamentoGeniusPage /></ProtectedRoute>} />
              <Route path="/faturamento-genius" element={<ProtectedRoute path="/faturamento-genius"><FaturamentoGeniusPage /></ProtectedRoute>} />
              <Route path="/conciliacao-edocs" element={<ProtectedRoute path="/conciliacao-edocs"><ConciliacaoEdocsPage /></ProtectedRoute>} />
              <Route path="/notas-recebimento" element={<ProtectedRoute path="/notas-recebimento"><NotasRecebimentoPage /></ProtectedRoute>} />
              <Route path="/numero-serie" element={<ProtectedRoute path="/numero-serie"><NumeroSeriePage /></ProtectedRoute>} />
              <Route path="/contas-pagar" element={<ProtectedRoute path="/contas-pagar"><ContasPagarPage /></ProtectedRoute>} />
              <Route path="/contas-receber" element={<ProtectedRoute path="/contas-receber"><ContasReceberPage /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute path="/configuracoes"><ConfiguracoesPage /></ProtectedRoute>} />
              {/* Produção */}
              <Route path="/producao/dashboard" element={<ProtectedRoute path="/producao/dashboard"><ProducaoDashboardPage /></ProtectedRoute>} />
              <Route path="/producao/produzido" element={<ProtectedRoute path="/producao/produzido"><ProduzidoPeriodoPage /></ProtectedRoute>} />
              <Route path="/producao/expedido" element={<ProtectedRoute path="/producao/expedido"><ExpedidoObraPage /></ProtectedRoute>} />
              <Route path="/producao/patio" element={<ProtectedRoute path="/producao/patio"><SaldoPatioPage /></ProtectedRoute>} />
              <Route path="/producao/nao-carregados" element={<ProtectedRoute path="/producao/nao-carregados"><NaoCarregadosPage /></ProtectedRoute>} />
              <Route path="/producao/leadtime" element={<ProtectedRoute path="/producao/leadtime"><LeadTimeProducaoPage /></ProtectedRoute>} />
              <Route path="/producao/engenharia" element={<ProtectedRoute path="/producao/engenharia"><EngenhariaProducaoPage /></ProtectedRoute>} />
              {/* Redirect old route */}
              <Route path="/engenharia-producao" element={<Navigate to="/producao/engenharia" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AiPageContextProvider>
          </UserTrackingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
