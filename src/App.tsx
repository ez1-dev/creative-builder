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
import RelatorioSemanalObraPage from "@/pages/producao/RelatorioSemanalObraPage";
import ImpressaoOrdemProducaoPage from "@/pages/producao/ImpressaoOrdemProducaoPage";
import ContasPagarPage from "@/pages/ContasPagarPage";
import ContasReceberPage from "@/pages/ContasReceberPage";
import FaturamentoGeniusPage from "@/pages/FaturamentoGeniusPage";
import PassagensAereasPage from "@/pages/PassagensAereasPage";
import PassagensAereasCompartilhadoPage from "@/pages/PassagensAereasCompartilhadoPage";
import ManutencaoFrotaPage from "@/pages/ManutencaoFrotaPage";
import ManutencaoFrotaCompartilhadoPage from "@/pages/ManutencaoFrotaCompartilhadoPage";
import ManutencaoMaquinasPage from "@/pages/ManutencaoMaquinasPage";
import ManutencaoMaquinasCompartilhadoPage from "@/pages/ManutencaoMaquinasCompartilhadoPage";
import MonitorUsuariosSeniorPage from "@/pages/MonitorUsuariosSeniorPage";
import GestaoSguUsuariosPage from "@/pages/GestaoSguUsuariosPage";
import DemonstrativoComprasRecebimentosPage from "@/pages/DemonstrativoComprasRecebimentosPage";
import BiComponentsDemoPage from "@/pages/BiComponentsDemoPage";
import EtlAdminPage from "@/pages/EtlAdminPage";
import BalancoPatrimonialPage from "@/pages/contabilidade/BalancoPatrimonialPage";
import RegrasSeniorDashboardPage from "@/pages/regras-senior/RegrasSeniorDashboardPage";
import RegrasListPage from "@/pages/regras-senior/RegrasListPage";
import RegraNovaPage from "@/pages/regras-senior/RegraNovaPage";
import RegraDetalhePage from "@/pages/regras-senior/RegraDetalhePage";
import RegraEditorPage from "@/pages/regras-senior/RegraEditorPage";
import RegraNegocioPage from "@/pages/regras-senior/RegraNegocioPage";
import IdentificadoresPage from "@/pages/regras-senior/IdentificadoresPage";
import AuditoriaPage from "@/pages/regras-senior/AuditoriaPage";
import SnapshotsPage from "@/pages/regras-senior/SnapshotsPage";
import DesenvolvimentoRelatoriosPage from "@/pages/relatorios/DesenvolvimentoRelatoriosPage";
import RelatoriosPublicadosPage from "@/pages/relatorios/RelatoriosPublicadosPage";
import HistoricoExecucoesPage from "@/pages/relatorios/HistoricoExecucoesPage";
import NotFound from "@/pages/NotFound";
import { ProtectedRoute, PostLoginRedirect } from "@/components/ProtectedRoute";
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
            <Route path="/passagens-aereas/compartilhado" element={<PassagensAereasCompartilhadoPage />} />
            <Route path="/frota/compartilhado" element={<ManutencaoFrotaCompartilhadoPage />} />
            <Route path="/manutencao-maquinas/compartilhado" element={<ManutencaoMaquinasCompartilhadoPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<PostLoginRedirect />} />
              <Route path="/estoque" element={<ProtectedRoute path="/estoque"><EstoquePage /></ProtectedRoute>} />
              <Route path="/estoque-min-max" element={<ProtectedRoute path="/estoque-min-max"><EstoqueMinMaxPage /></ProtectedRoute>} />
              <Route path="/sugestao-min-max" element={<ProtectedRoute path="/sugestao-min-max"><SugestaoMinMaxPage /></ProtectedRoute>} />
              <Route path="/onde-usa" element={<ProtectedRoute path="/onde-usa"><OndeUsaPage /></ProtectedRoute>} />
              <Route path="/bom" element={<ProtectedRoute path="/bom"><BomPage /></ProtectedRoute>} />
              <Route path="/compras-produto" element={<ProtectedRoute path="/compras-produto"><ComprasProdutoPage /></ProtectedRoute>} />
              <Route path="/painel-compras" element={<ProtectedRoute path="/painel-compras"><PainelComprasPage /></ProtectedRoute>} />
              <Route path="/demonstrativo-compras-recebimentos" element={<ProtectedRoute path="/demonstrativo-compras-recebimentos"><DemonstrativoComprasRecebimentosPage /></ProtectedRoute>} />
              <Route path="/auditoria-tributaria" element={<ProtectedRoute path="/auditoria-tributaria"><AuditoriaTributariaPage /></ProtectedRoute>} />
              <Route path="/auditoria-apontamento-genius" element={<ProtectedRoute path="/auditoria-apontamento-genius"><AuditoriaApontamentoGeniusPage /></ProtectedRoute>} />
              <Route path="/faturamento-genius" element={<ProtectedRoute path="/faturamento-genius"><FaturamentoGeniusPage /></ProtectedRoute>} />
              <Route path="/conciliacao-edocs" element={<ProtectedRoute path="/conciliacao-edocs"><ConciliacaoEdocsPage /></ProtectedRoute>} />
              <Route path="/notas-recebimento" element={<ProtectedRoute path="/notas-recebimento"><NotasRecebimentoPage /></ProtectedRoute>} />
              <Route path="/numero-serie" element={<ProtectedRoute path="/numero-serie"><NumeroSeriePage /></ProtectedRoute>} />
              <Route path="/contas-pagar" element={<ProtectedRoute path="/contas-pagar"><ContasPagarPage /></ProtectedRoute>} />
              <Route path="/contas-receber" element={<ProtectedRoute path="/contas-receber"><ContasReceberPage /></ProtectedRoute>} />
              <Route path="/passagens-aereas" element={<ProtectedRoute path="/passagens-aereas"><PassagensAereasPage /></ProtectedRoute>} />
              <Route path="/frota" element={<ProtectedRoute path="/frota"><ManutencaoFrotaPage /></ProtectedRoute>} />
              <Route path="/manutencao-maquinas" element={<ProtectedRoute path="/manutencao-maquinas"><ManutencaoMaquinasPage /></ProtectedRoute>} />
              <Route path="/monitor-usuarios-senior" element={<ProtectedRoute path="/monitor-usuarios-senior"><MonitorUsuariosSeniorPage /></ProtectedRoute>} />
              <Route path="/usuarios-conectados" element={<ProtectedRoute path="/monitor-usuarios-senior"><MonitorUsuariosSeniorPage /></ProtectedRoute>} />
              <Route path="/gestao-sgu-usuarios" element={<ProtectedRoute path="/gestao-sgu-usuarios"><GestaoSguUsuariosPage /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute path="/configuracoes"><ConfiguracoesPage /></ProtectedRoute>} />
              <Route path="/bi-components-demo" element={<BiComponentsDemoPage />} />
              <Route path="/biblioteca-bi" element={<BiComponentsDemoPage />} />
              <Route path="/etl" element={<ProtectedRoute path="/etl"><EtlAdminPage /></ProtectedRoute>} />
              <Route path="/contabilidade/balanco" element={<ProtectedRoute path="/contabilidade/balanco"><BalancoPatrimonialPage /></ProtectedRoute>} />
              {/* Regras Senior */}
              <Route path="/regras-senior" element={<ProtectedRoute path="/regras-senior"><RegrasSeniorDashboardPage /></ProtectedRoute>} />
              <Route path="/regras-senior/regras" element={<ProtectedRoute path="/regras-senior/regras"><RegrasListPage /></ProtectedRoute>} />
              <Route path="/regras-senior/regras/nova" element={<ProtectedRoute path="/regras-senior/regras/nova"><RegraNovaPage /></ProtectedRoute>} />
              <Route path="/regras-senior/regras/:id" element={<ProtectedRoute path="/regras-senior/regras"><RegraDetalhePage /></ProtectedRoute>} />
              <Route path="/regras-senior/regras/:id/editor" element={<ProtectedRoute path="/regras-senior/regras"><RegraEditorPage /></ProtectedRoute>} />
              <Route path="/regras-senior/regras/:id/negocio" element={<ProtectedRoute path="/regras-senior/regras"><RegraNegocioPage /></ProtectedRoute>} />
              <Route path="/regras-senior/identificadores" element={<ProtectedRoute path="/regras-senior/identificadores"><IdentificadoresPage /></ProtectedRoute>} />
              <Route path="/regras-senior/auditoria" element={<ProtectedRoute path="/regras-senior/auditoria"><AuditoriaPage /></ProtectedRoute>} />
              <Route path="/regras-senior/snapshots" element={<ProtectedRoute path="/regras-senior/snapshots"><SnapshotsPage /></ProtectedRoute>} />
              {/* Produção */}
              <Route path="/producao/dashboard" element={<ProtectedRoute path="/producao/dashboard"><ProducaoDashboardPage /></ProtectedRoute>} />
              <Route path="/producao/produzido" element={<ProtectedRoute path="/producao/produzido"><ProduzidoPeriodoPage /></ProtectedRoute>} />
              <Route path="/producao/expedido" element={<ProtectedRoute path="/producao/expedido"><ExpedidoObraPage /></ProtectedRoute>} />
              <Route path="/producao/patio" element={<ProtectedRoute path="/producao/patio"><SaldoPatioPage /></ProtectedRoute>} />
              <Route path="/producao/nao-carregados" element={<ProtectedRoute path="/producao/nao-carregados"><NaoCarregadosPage /></ProtectedRoute>} />
              <Route path="/producao/leadtime" element={<ProtectedRoute path="/producao/leadtime"><LeadTimeProducaoPage /></ProtectedRoute>} />
              <Route path="/producao/engenharia" element={<ProtectedRoute path="/producao/engenharia"><EngenhariaProducaoPage /></ProtectedRoute>} />
              <Route path="/producao/relatorio-semanal-obra" element={<ProtectedRoute path="/producao/relatorio-semanal-obra"><RelatorioSemanalObraPage /></ProtectedRoute>} />
              <Route path="/producao/impressao-op" element={<ProtectedRoute path="/producao/impressao-op"><ImpressaoOrdemProducaoPage /></ProtectedRoute>} />
              {/* Relatórios */}
              <Route path="/relatorios/desenvolvimento" element={<ProtectedRoute path="/relatorios/desenvolvimento"><DesenvolvimentoRelatoriosPage /></ProtectedRoute>} />
              <Route path="/relatorios/publicados" element={<ProtectedRoute path="/relatorios/publicados"><RelatoriosPublicadosPage /></ProtectedRoute>} />
              <Route path="/relatorios/execucoes" element={<ProtectedRoute path="/relatorios/execucoes"><HistoricoExecucoesPage /></ProtectedRoute>} />
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
