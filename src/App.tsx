import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import AuthCallback from "@/pages/AuthCallback";
import OAuthConsent from "@/pages/OAuthConsent";
import ConnectAgentPage from "@/pages/ConnectAgentPage";
import DashboardGeralPage from "@/pages/DashboardGeralPage";

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
import PersonalizarMenusPage from "@/pages/PersonalizarMenusPage";
import ProducaoDashboardPage from "@/pages/producao/ProducaoDashboardPage";
import ProduzidoPeriodoPage from "@/pages/producao/ProduzidoPeriodoPage";
import ExpedidoObraPage from "@/pages/producao/ExpedidoObraPage";
import SaldoPatioPage from "@/pages/producao/SaldoPatioPage";
import NaoCarregadosPage from "@/pages/producao/NaoCarregadosPage";
import LeadTimeProducaoPage from "@/pages/producao/LeadTimeProducaoPage";
import RelatorioSemanalObraPage from "@/pages/producao/RelatorioSemanalObraPage";
import ImpressaoOrdemProducaoPage from "@/pages/producao/ImpressaoOrdemProducaoPage";
import CargaProducaoPage from "@/pages/producao/CargaProducaoPage";
import CargaDashboardPage from "@/pages/producao/CargaDashboardPage";
import CargaRecursosDashboardPage from "@/pages/producao/CargaRecursosDashboardPage";
import ProgramacaoPage from "@/pages/producao/ProgramacaoPage";
import ConsultaProdutosPage from "@/pages/cadastros/ConsultaProdutosPage";


import ContasPagarPage from "@/pages/ContasPagarPage";
import ContasReceberPage from "@/pages/ContasReceberPage";
import FaturamentoGeniusPage from "@/pages/FaturamentoGeniusPage";
import PassagensAereasPage from "@/pages/PassagensAereasPage";
import PassagensAereasCompartilhadoPage from "@/pages/PassagensAereasCompartilhadoPage";
import ManutencaoFrotaPage from "@/pages/ManutencaoFrotaPage";
import ManutencaoFrotaCompartilhadoPage from "@/pages/ManutencaoFrotaCompartilhadoPage";
import ManutencaoMaquinasPage from "@/pages/ManutencaoMaquinasPage";
import ManutencaoMaquinasCompartilhadoPage from "@/pages/ManutencaoMaquinasCompartilhadoPage";
import TiposMaquinaPage from "@/pages/maquinas/TiposMaquinaPage";
import MonitorUsuariosSeniorPage from "@/pages/MonitorUsuariosSeniorPage";
import MonitorTelasPage from "@/pages/MonitorTelasPage";
import MonitorErpNativoPage from "@/pages/MonitorErpNativoPage";
import GestaoSguUsuariosPage from "@/pages/GestaoSguUsuariosPage";
import DemonstrativoComprasRecebimentosPage from "@/pages/DemonstrativoComprasRecebimentosPage";
import BiComponentsDemoPage from "@/pages/BiComponentsDemoPage";
import EtlAdminPage from "@/pages/EtlAdminPage";
import EtlTarefaDetalhePage from "@/pages/EtlTarefaDetalhePage";
import FaturamentoValidacaoPage from "@/pages/bi/FaturamentoValidacaoPage";
import ComercialPage from "@/pages/bi/ComercialPage";
import MetasFaturamentoPage from "@/pages/bi/MetasFaturamentoPage";
import RelatorioExecutivoFaturamentoPage from "@/pages/bi/RelatorioExecutivoFaturamentoPage";
import RelatorioExecutivoPassagensPage from "@/pages/relatorios/RelatorioExecutivoPassagensPage";
import RelatorioExecutivoFrotaPage from "@/pages/relatorios/RelatorioExecutivoFrotaPage";
import RelatorioExecutivoMaquinasPage from "@/pages/relatorios/RelatorioExecutivoMaquinasPage";
import BalancoPatrimonialPage from "@/pages/contabilidade/BalancoPatrimonialPage";
import DrePage from "@/pages/bi/contabilidade/DrePage";
import DreExcecoesPage from "@/pages/bi/contabilidade/DreExcecoesPage";
import DreAprovacoesPage from "@/pages/bi/contabilidade/DreAprovacoesPage";
import DreParametrizacaoPage from "@/pages/bi/contabilidade/DreParametrizacaoPage";
import DreSincronizacaoDeparaPage from "@/pages/bi/contabilidade/DreSincronizacaoDeparaPage";
import DreConfiguracaoPage from "@/pages/bi/contabilidade/DreConfiguracaoPage";
import DreDinamicaPage from "@/pages/bi/contabilidade/DreDinamicaPage";
import DreMontadorPage from "@/pages/bi/contabilidade/DreMontadorPage";
import DreConfiguravelPainelPage from "@/pages/bi/financeiro/DreConfiguravelPainelPage";
import DreStudioLayout from "@/pages/contabilidade/dre-studio/DreStudioLayout";
import DreStudioModelosPage from "@/pages/contabilidade/dre-studio/DreStudioModelosPage";
import DreStudioNovoPage from "@/pages/contabilidade/dre-studio/DreStudioNovoPage";
import DreStudioConfiguracoesPage from "@/pages/contabilidade/dre-studio/DreStudioConfiguracoesPage";
import DreStudioModeloLayout from "@/pages/contabilidade/dre-studio/DreStudioModeloLayout";
import DreStudioModeloIndexPage from "@/pages/contabilidade/dre-studio/DreStudioModeloIndexPage";
import DreStudioModeloEditarPage from "@/pages/contabilidade/dre-studio/DreStudioModeloEditarPage";
import DreStudioEstruturaPage from "@/pages/contabilidade/dre-studio/DreStudioEstruturaPage";
import DreStudioOrcamentoPage from "@/pages/contabilidade/dre-studio/DreStudioOrcamentoPage";
import DreStudioVisualizacaoPage from "@/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage";
import DrePadraoPage from "@/pages/contabilidade/dre-padrao/DrePadraoPage";
import IndicadoresContabeisPage from "@/pages/contabilidade/IndicadoresContabeisPage";
// import BalancoPadraoPage from "@/pages/contabilidade/balanco-padrao/BalancoPadraoPage"; // TODO: reativar quando o Balanço Padrão for entregue
import DreStudioConciliacaoPage from "@/pages/contabilidade/dre-studio/DreStudioConciliacaoPage";
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
import RhIndexPage from "@/pages/rh/RhIndexPage";
import ResumoFolhaPage from "@/pages/rh/ResumoFolhaPage";
import QuadroColaboradoresPage from "@/pages/rh/QuadroColaboradoresPage";
import ContratoExperienciaPage from "@/pages/rh/ContratoExperienciaPage";
import ProgramacaoFeriasPage from "@/pages/rh/ProgramacaoFeriasPage";
import TurnoverPage from "@/pages/rh/TurnoverPage";
import AbsenteismoPage from "@/pages/rh/AbsenteismoPage";
import FormulariosPage from "@/pages/rh/FormulariosPage";
import RelatorioGerencialPage from "@/pages/rh/RelatorioGerencialPage";

import RequisicoesListPage from "@/pages/requisicoes/RequisicoesListPage";
import NovaRequisicaoPage from "@/pages/requisicoes/NovaRequisicaoPage";
import NovaRequisicaoOpPage from "@/pages/requisicoes/NovaRequisicaoOpPage";
import NovaRequisicaoAvulsaPage from "@/pages/requisicoes/NovaRequisicaoAvulsaPage";
import PortalRequisicoesPage from "@/pages/requisicoes/PortalRequisicoesPage";
import RequisicaoDetalhePage from "@/pages/requisicoes/RequisicaoDetalhePage";
import AprovacoesPage from "@/pages/requisicoes/AprovacoesPage";
import AlmoxarifadoFilaPage from "@/pages/requisicoes/AlmoxarifadoFilaPage";
import SeparacaoAgrupadaPage from "@/pages/requisicoes/SeparacaoAgrupadaPage";
import ConfiguracoesRequisicoesPage from "@/pages/requisicoes/ConfiguracoesRequisicoesPage";
import TesteSidPage from "@/pages/requisicoes/TesteSidPage";


import NotFound from "@/pages/NotFound";
import { ProtectedRoute, PostLoginRedirect } from "@/components/ProtectedRoute";
import { UserTrackingProvider } from "@/components/UserTrackingProvider";
import { AiPageContextProvider } from "@/contexts/AiPageContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { DemoModeProvider } from "@/contexts/DemoModeContext";

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
          <PermissionsProvider>
          <DemoModeProvider>
          <UserTrackingProvider>
          <AiPageContextProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />

            <Route path="/passagens-aereas/compartilhado" element={<PassagensAereasCompartilhadoPage />} />
            <Route path="/frota/compartilhado" element={<ManutencaoFrotaCompartilhadoPage />} />
            <Route path="/manutencao-maquinas/compartilhado" element={<ManutencaoMaquinasCompartilhadoPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<PostLoginRedirect />} />
              <Route path="/dashboard-geral" element={<ProtectedRoute path="/dashboard-geral"><DashboardGeralPage /></ProtectedRoute>} />
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
              <Route path="/passagens-aereas/relatorio-executivo" element={<ProtectedRoute path="/passagens-aereas"><RelatorioExecutivoPassagensPage /></ProtectedRoute>} />
              <Route path="/frota" element={<ProtectedRoute path="/frota"><ManutencaoFrotaPage /></ProtectedRoute>} />
              <Route path="/frota/relatorio-executivo" element={<ProtectedRoute path="/frota"><RelatorioExecutivoFrotaPage /></ProtectedRoute>} />
              <Route path="/manutencao-maquinas" element={<ProtectedRoute path="/manutencao-maquinas"><ManutencaoMaquinasPage /></ProtectedRoute>} />
              <Route path="/manutencao-maquinas/relatorio-executivo" element={<ProtectedRoute path="/manutencao-maquinas"><RelatorioExecutivoMaquinasPage /></ProtectedRoute>} />
              <Route path="/manutencao-maquinas/tipos" element={<ProtectedRoute path="/manutencao-maquinas"><TiposMaquinaPage /></ProtectedRoute>} />
              <Route path="/monitor-usuarios-senior" element={<ProtectedRoute path="/monitor-usuarios-senior"><MonitorUsuariosSeniorPage /></ProtectedRoute>} />
              <Route path="/usuarios-conectados" element={<ProtectedRoute path="/monitor-usuarios-senior"><MonitorUsuariosSeniorPage /></ProtectedRoute>} />
              <Route path="/monitor-telas" element={<ProtectedRoute path="/monitor-telas"><MonitorTelasPage /></ProtectedRoute>} />
              <Route path="/monitor-erp-nativo" element={<ProtectedRoute path="/monitor-erp-nativo"><MonitorErpNativoPage /></ProtectedRoute>} />
              <Route path="/gestao-sgu-usuarios" element={<ProtectedRoute path="/gestao-sgu-usuarios"><GestaoSguUsuariosPage /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute path="/configuracoes"><ConfiguracoesPage /></ProtectedRoute>} />
              <Route path="/configuracoes/personalizar-menus" element={<PersonalizarMenusPage />} />
              <Route path="/connect" element={<ConnectAgentPage />} />
              <Route path="/bi-components-demo" element={<BiComponentsDemoPage />} />
              <Route path="/biblioteca-bi" element={<BiComponentsDemoPage />} />
              <Route path="/etl" element={<ProtectedRoute path="/etl"><EtlAdminPage /></ProtectedRoute>} />
              <Route path="/etl/tarefas/:nome" element={<ProtectedRoute path="/etl"><EtlTarefaDetalhePage /></ProtectedRoute>} />
              <Route path="/bi/faturamento-validacao" element={<ProtectedRoute path="/bi/faturamento-validacao"><FaturamentoValidacaoPage /></ProtectedRoute>} />
              <Route path="/bi/comercial" element={<ProtectedRoute path="/bi/comercial"><ComercialPage /></ProtectedRoute>} />
              <Route path="/bi/comercial/metas" element={<ProtectedRoute path="/bi/comercial/metas"><MetasFaturamentoPage /></ProtectedRoute>} />
              <Route path="/bi/faturamento/relatorio-executivo" element={<ProtectedRoute path="/bi/faturamento/relatorio-executivo"><RelatorioExecutivoFaturamentoPage /></ProtectedRoute>} />

              <Route path="/contabilidade/balanco" element={<ProtectedRoute path="/contabilidade/balanco"><BalancoPatrimonialPage /></ProtectedRoute>} />
              <Route path="/contabilidade/dre-padrao" element={<ProtectedRoute path="/contabilidade/dre-padrao"><DrePadraoPage /></ProtectedRoute>} />
              {/* <Route path="/contabilidade/balanco-padrao" element={<ProtectedRoute path="/contabilidade/balanco-padrao"><BalancoPadraoPage /></ProtectedRoute>} /> */}
              <Route path="/contabilidade/configuracoes" element={<ProtectedRoute path="/contabilidade/dre-studio"><DreStudioConfiguracoesPage /></ProtectedRoute>} />
              <Route path="/bi/contabilidade/dre" element={<ProtectedRoute path="/bi/contabilidade/dre"><DrePage /></ProtectedRoute>} />
              <Route path="/bi/contabilidade/dre/excecoes" element={<ProtectedRoute path="/bi/contabilidade/dre"><DreExcecoesPage /></ProtectedRoute>} />
              <Route path="/bi/contabilidade/dre/aprovacoes" element={<ProtectedRoute path="/bi/contabilidade/dre"><DreAprovacoesPage /></ProtectedRoute>} />
              <Route path="/bi/contabilidade/dre/parametrizacao" element={<ProtectedRoute path="/bi/contabilidade/dre"><DreParametrizacaoPage /></ProtectedRoute>} />
              <Route path="/bi/contabilidade/dre/sincronizacao-depara" element={<ProtectedRoute path="/bi/contabilidade/dre"><DreSincronizacaoDeparaPage /></ProtectedRoute>} />
              <Route path="/bi/contabilidade/dre/configuracao" element={<ProtectedRoute path="/bi/contabilidade/dre/configuracao"><DreConfiguracaoPage /></ProtectedRoute>} />
              <Route path="/bi/contabilidade/dre-dinamica" element={<ProtectedRoute path="/bi/contabilidade/dre-dinamica"><DreDinamicaPage /></ProtectedRoute>} />
              <Route path="/bi/contabilidade/dre-dinamica/montador" element={<ProtectedRoute path="/bi/contabilidade/dre-dinamica/montador"><DreMontadorPage /></ProtectedRoute>} />
              <Route path="/bi/financeiro/dre-configuravel" element={<ProtectedRoute path="/bi/financeiro/dre-configuravel"><DreConfiguravelPainelPage /></ProtectedRoute>} />
              {/* DRE Studio */}
              <Route path="/contabilidade/dre-studio" element={<ProtectedRoute path="/contabilidade/dre-studio"><DreStudioLayout /></ProtectedRoute>}>
                <Route index element={<DreStudioModelosPage />} />
                <Route path="novo" element={<DreStudioNovoPage />} />
                <Route path="configuracoes" element={<DreStudioConfiguracoesPage />} />
                <Route path=":id" element={<DreStudioModeloLayout />}>
                  <Route index element={<DreStudioModeloIndexPage />} />
                  <Route path="estrutura" element={<DreStudioEstruturaPage />} />
                  <Route path="visualizacao" element={<DreStudioVisualizacaoPage />} />
                  <Route path="orcamento" element={<DreStudioOrcamentoPage />} />
                  <Route path="conciliacao" element={<DreStudioConciliacaoPage />} />
                  <Route path="editar" element={<DreStudioModeloEditarPage />} />
                </Route>
              </Route>
              {/* Legacy redirects */}
              <Route path="/contabilidade/dre-studio/modelos" element={<Navigate to="/contabilidade/dre-studio" replace />} />
              <Route path="/contabilidade/dre-studio/modelos/novo" element={<Navigate to="/contabilidade/dre-studio/novo" replace />} />
              <Route path="/contabilidade/dre-studio/orcamento" element={<Navigate to="/contabilidade/dre-studio" replace />} />
              <Route path="/contabilidade/dre-studio/resultado" element={<Navigate to="/contabilidade/dre-studio" replace />} />
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
              <Route path="/producao/carga" element={<ProtectedRoute path="/producao/carga"><CargaProducaoPage /></ProtectedRoute>} />
              <Route path="/producao/carga/dashboard" element={<ProtectedRoute path="/producao/carga"><CargaDashboardPage /></ProtectedRoute>} />
              <Route path="/producao/carga/recursos" element={<ProtectedRoute path="/producao/carga"><CargaRecursosDashboardPage /></ProtectedRoute>} />
              <Route path="/producao/programacao" element={<ProtectedRoute path="/producao/programacao"><ProgramacaoPage /></ProtectedRoute>} />

              {/* Cadastros */}
              <Route path="/cadastros/produtos" element={<ProtectedRoute path="/cadastros/produtos"><ConsultaProdutosPage /></ProtectedRoute>} />




              {/* Relatórios */}
              <Route path="/relatorios/desenvolvimento" element={<ProtectedRoute path="/relatorios/desenvolvimento"><DesenvolvimentoRelatoriosPage /></ProtectedRoute>} />
              <Route path="/relatorios/publicados" element={<ProtectedRoute path="/relatorios/publicados"><RelatoriosPublicadosPage /></ProtectedRoute>} />
              <Route path="/relatorios/execucoes" element={<ProtectedRoute path="/relatorios/execucoes"><HistoricoExecucoesPage /></ProtectedRoute>} />
              {/* RH */}
              <Route path="/rh" element={<ProtectedRoute path="/rh"><RhIndexPage /></ProtectedRoute>} />
              <Route path="/rh/resumo-folha" element={<ProtectedRoute path="/rh/resumo-folha"><ResumoFolhaPage /></ProtectedRoute>} />
              <Route path="/rh/quadro-colaboradores" element={<ProtectedRoute path="/rh/quadro-colaboradores"><QuadroColaboradoresPage /></ProtectedRoute>} />
              <Route path="/rh/contrato-experiencia" element={<ProtectedRoute path="/rh/contrato-experiencia"><ContratoExperienciaPage /></ProtectedRoute>} />
              <Route path="/rh/programacao-ferias" element={<ProtectedRoute path="/rh/programacao-ferias"><ProgramacaoFeriasPage /></ProtectedRoute>} />
              <Route path="/rh/turnover" element={<ProtectedRoute path="/rh/turnover"><TurnoverPage /></ProtectedRoute>} />
              <Route path="/rh/absenteismo" element={<ProtectedRoute path="/rh/absenteismo"><AbsenteismoPage /></ProtectedRoute>} />

              <Route path="/rh/formularios" element={<ProtectedRoute path="/rh/formularios"><FormulariosPage /></ProtectedRoute>} />
              <Route path="/rh/relatorio-gerencial" element={<ProtectedRoute path="/rh/relatorio-gerencial"><RelatorioGerencialPage /></ProtectedRoute>} />
              {/* Requisição de Materiais */}
              <Route path="/requisicoes" element={<ProtectedRoute path="/requisicoes"><RequisicoesListPage /></ProtectedRoute>} />
              <Route path="/requisicoes/nova" element={<ProtectedRoute path="/requisicoes"><NovaRequisicaoPage /></ProtectedRoute>} />
              <Route path="/requisicoes/nova-op" element={<ProtectedRoute path="/requisicoes"><NovaRequisicaoOpPage /></ProtectedRoute>} />
              <Route path="/requisicoes/nova-avulsa" element={<ProtectedRoute path="/requisicoes"><NovaRequisicaoAvulsaPage /></ProtectedRoute>} />
              <Route path="/requisicoes/portal" element={<ProtectedRoute path="/requisicoes"><PortalRequisicoesPage /></ProtectedRoute>} />
              <Route path="/requisicoes/aprovacoes" element={<ProtectedRoute path="/requisicoes/aprovacoes"><AprovacoesPage /></ProtectedRoute>} />
              <Route path="/requisicoes/almoxarifado" element={<ProtectedRoute path="/requisicoes/almoxarifado"><AlmoxarifadoFilaPage /></ProtectedRoute>} />
              <Route path="/requisicoes/agrupadas" element={<ProtectedRoute path="/requisicoes/almoxarifado"><SeparacaoAgrupadaPage /></ProtectedRoute>} />
              <Route path="/requisicoes/configuracoes" element={<ProtectedRoute path="/requisicoes/configuracoes"><ConfiguracoesRequisicoesPage /></ProtectedRoute>} />
              <Route path="/requisicoes/configuracoes/teste-sid" element={<ProtectedRoute path="/requisicoes/configuracoes"><TesteSidPage /></ProtectedRoute>} />
              <Route path="/requisicoes/:id" element={<ProtectedRoute path="/requisicoes"><RequisicaoDetalhePage /></ProtectedRoute>} />
              {/* Redirect old route */}
              <Route path="/engenharia-producao" element={<Navigate to="/producao/engenharia" replace />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </AiPageContextProvider>
          </UserTrackingProvider>
          </DemoModeProvider>
          </PermissionsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
