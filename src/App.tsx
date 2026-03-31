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
import NotasRecebimentoPage from "@/pages/NotasRecebimentoPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

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
              <Route path="/estoque" element={<EstoquePage />} />
              <Route path="/onde-usa" element={<OndeUsaPage />} />
              <Route path="/bom" element={<BomPage />} />
              <Route path="/compras-produto" element={<ComprasProdutoPage />} />
              <Route path="/painel-compras" element={<PainelComprasPage />} />
              <Route path="/engenharia-producao" element={<EngenhariaProducaoPage />} />
              <Route path="/auditoria-tributaria" element={<AuditoriaTributariaPage />} />
              <Route path="/notas-recebimento" element={<NotasRecebimentoPage />} />
              <Route path="/numero-serie" element={<NumeroSeriePage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
