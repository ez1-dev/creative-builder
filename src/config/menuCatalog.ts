import {
  Home, Package, Users, Settings, Factory, ShoppingCart, Warehouse, Landmark,
  Receipt, BarChart3, Boxes, ShieldAlert, FileText, Cog, LayoutDashboard, Database,
  Search as SearchIcon,
} from 'lucide-react';

export type Leaf = { title: string; url: string; icon: any };
export type SubGroup = { id: string; label: string; icon: any; items: Leaf[] };
export type TopMenu =
  | { id: string; label: string; icon: any; kind: 'leaf'; item: Leaf }
  | { id: string; label: string; icon: any; kind: 'flat'; items: Leaf[] }
  | { id: string; label: string; icon: any; kind: 'nested'; subGroups: SubGroup[] };

export const TOP_MENUS: TopMenu[] = [
  {
    id: 'inicio',
    label: 'Início',
    icon: Home,
    kind: 'leaf',
    item: { title: 'Início', url: '/dashboard-geral', icon: Home },
  },
  {
    id: 'erp',
    label: 'ERP',
    icon: Package,
    kind: 'nested',
    subGroups: [
      {
        id: 'erp-producao', label: 'Produção', icon: Factory,
        items: [
          { title: 'Produção — Dashboard', url: '/producao/dashboard', icon: LayoutDashboard },
          { title: 'Produzido no Período', url: '/producao/produzido', icon: Factory },
          { title: 'Expedido para Obra', url: '/producao/expedido', icon: Factory },
          { title: 'Saldo em Pátio', url: '/producao/patio', icon: Warehouse },
          { title: 'Não Carregados', url: '/producao/nao-carregados', icon: Factory },
          { title: 'Lead Time', url: '/producao/leadtime', icon: Factory },
          { title: 'Engenharia x Produção', url: '/producao/engenharia', icon: Factory },
          { title: 'Relatório Semanal por Obra', url: '/producao/relatorio-semanal-obra', icon: FileText },
          { title: 'Impressão de Ordem de Produção', url: '/producao/impressao-op', icon: FileText },
          { title: 'Carga de Produção', url: '/producao/carga', icon: Factory },
          { title: 'Carga — Dashboard BI', url: '/producao/carga/dashboard', icon: LayoutDashboard },
          { title: 'Carga por Centro de Recurso', url: '/producao/carga/recursos', icon: Factory },
          { title: 'Programação e Sequenciamento', url: '/producao/programacao', icon: Factory },
        ],
      },
      {
        id: 'erp-compras', label: 'Compras e Suprimentos', icon: ShoppingCart,
        items: [
          { title: 'Compras / Custos', url: '/compras-produto', icon: ShoppingCart },
          { title: 'Painel de Compras', url: '/painel-compras', icon: ShoppingCart },
          { title: 'Demonstrativo de Compras e Recebimentos', url: '/demonstrativo-compras-recebimentos', icon: ShoppingCart },
          { title: 'Auditoria Tributária', url: '/auditoria-tributaria', icon: FileText },
          { title: 'Notas Fiscais de Recebimento', url: '/notas-recebimento', icon: Receipt },
        ],
      },
      {
        id: 'erp-estoque', label: 'Estoque', icon: Warehouse,
        items: [
          { title: 'Estoque', url: '/estoque', icon: Warehouse },
          { title: 'Estoque Mínimo/Máximo', url: '/estoque-min-max', icon: Warehouse },
          { title: 'Sugestão de Mínimo/Máximo', url: '/sugestao-min-max', icon: Warehouse },
          { title: 'Onde Usa', url: '/onde-usa', icon: SearchIcon },
          { title: 'Estrutura de Produto — BOM', url: '/bom', icon: Boxes },
          { title: 'Reserva de Número de Série', url: '/numero-serie', icon: Boxes },
         { title: 'Requisição de Materiais', url: '/requisicoes', icon: Boxes },
         { title: 'Portal de Requisições', url: '/requisicoes/portal', icon: Boxes },
          { title: 'Requisições — Aprovações', url: '/requisicoes/aprovacoes', icon: Boxes },
          { title: 'Requisições — Almoxarifado', url: '/requisicoes/almoxarifado', icon: Boxes },
          { title: 'Requisições — Separação agrupada', url: '/requisicoes/agrupadas', icon: Boxes },
          { title: 'Requisições — Configurações', url: '/requisicoes/configuracoes', icon: Settings },
        ],
      },
      {
        id: 'erp-financeiro', label: 'Financeiro e Contábil', icon: Landmark,
        items: [
          { title: 'Conciliação EDocs', url: '/conciliacao-edocs', icon: Landmark },
          { title: 'Contas a Pagar', url: '/contas-pagar', icon: Landmark },
          { title: 'Contas a Receber', url: '/contas-receber', icon: Landmark },
          { title: 'DRE Padrão', url: '/contabilidade/dre-padrao', icon: Landmark },
          { title: 'Balanço Padrão', url: '/contabilidade/balanco-padrao', icon: Landmark },
          { title: 'Balanço Patrimonial (avançado)', url: '/contabilidade/balanco', icon: Landmark },
          { title: 'DRE Studio — Visão Geral', url: '/contabilidade/dre-studio', icon: Landmark },
          { title: 'DRE Studio — Novo Modelo', url: '/contabilidade/dre-studio/novo', icon: Landmark },
        ],
      },
      {
        id: 'erp-faturamento', label: 'Faturamento', icon: Receipt,
        items: [
          { title: 'Auditoria de Apontamento Genius', url: '/auditoria-apontamento-genius', icon: FileText },
          { title: 'Faturamento Genius', url: '/faturamento-genius', icon: Receipt },
        ],
      },
      {
        id: 'erp-bi', label: 'BI e Analytics', icon: BarChart3,
        items: [
          { title: 'Contabilidade — DRE', url: '/bi/contabilidade/dre', icon: BarChart3 },
          { title: 'DRE — Exceções', url: '/bi/contabilidade/dre/excecoes', icon: BarChart3 },
          { title: 'DRE — Aprovações', url: '/bi/contabilidade/dre/aprovacoes', icon: BarChart3 },
          { title: 'DRE — Parametrização', url: '/bi/contabilidade/dre/parametrizacao', icon: BarChart3 },
          { title: 'DRE — Sincronização De/Para', url: '/bi/contabilidade/dre/sincronizacao-depara', icon: BarChart3 },
          { title: 'Configuração da DRE Gerencial', url: '/bi/contabilidade/dre/configuracao', icon: BarChart3 },
          { title: 'DRE Dinâmica Gerencial', url: '/bi/contabilidade/dre-dinamica', icon: BarChart3 },
          { title: 'Montador da DRE Gerencial', url: '/bi/contabilidade/dre-dinamica/montador', icon: BarChart3 },
          { title: 'BI Financeiro — DRE Configurável', url: '/bi/financeiro/dre-configuravel', icon: BarChart3 },
          { title: 'Validação de Faturamento', url: '/bi/faturamento-validacao', icon: BarChart3 },
          { title: 'BI Comercial', url: '/bi/comercial', icon: BarChart3 },
          { title: 'Metas de Faturamento', url: '/bi/comercial/metas', icon: BarChart3 },
          { title: 'Relatório Executivo de Faturamento', url: '/bi/faturamento/relatorio-executivo', icon: BarChart3 },
          { title: 'ETL / Camada Analítica', url: '/etl', icon: BarChart3 },
        ],
      },
      {
        id: 'erp-cadastros', label: 'Cadastros', icon: Boxes,
        items: [
          { title: 'Consulta de Produtos', url: '/cadastros/produtos', icon: Boxes },
        ],
      },
      {
        id: 'erp-regras', label: 'Regras Senior', icon: ShieldAlert,
        items: [
          { title: 'Dashboard', url: '/regras-senior', icon: LayoutDashboard },
          { title: 'Lista de Regras', url: '/regras-senior/regras', icon: FileText },
          { title: 'Identificadores', url: '/regras-senior/identificadores', icon: ShieldAlert },
          { title: 'Auditoria', url: '/regras-senior/auditoria', icon: FileText },
          { title: 'Snapshots', url: '/regras-senior/snapshots', icon: FileText },
        ],
      },
      {
        id: 'erp-relatorios', label: 'Relatórios', icon: FileText,
        items: [
          { title: 'Desenvolvimento', url: '/relatorios/desenvolvimento', icon: FileText },
          { title: 'Publicados', url: '/relatorios/publicados', icon: FileText },
          { title: 'Histórico de Execuções', url: '/relatorios/execucoes', icon: FileText },
        ],
      },
      {
        id: 'erp-operacional', label: 'Operacional', icon: Cog,
        items: [
          { title: 'Passagens Aéreas', url: '/passagens-aereas', icon: Cog },
          { title: 'Passagens — Relatório Executivo', url: '/passagens-aereas/relatorio-executivo', icon: FileText },
          { title: 'Manutenção de Frota', url: '/frota', icon: Cog },
          { title: 'Frota — Relatório Executivo', url: '/frota/relatorio-executivo', icon: FileText },
          { title: 'Manutenção de Máquinas', url: '/manutencao-maquinas', icon: Cog },
          { title: 'Máquinas — Relatório Executivo', url: '/manutencao-maquinas/relatorio-executivo', icon: FileText },
          { title: 'Tipos de Máquina', url: '/manutencao-maquinas/tipos', icon: Cog },
        ],
      },
    ],
  },
  {
    id: 'hcm',
    label: 'HCM',
    icon: Users,
    kind: 'flat',
    items: [
      { title: 'Visão Geral do RH', url: '/rh', icon: Users },
      { title: 'Resumo da Folha', url: '/rh/resumo-folha', icon: Receipt },
      { title: 'Quadro de Colaboradores', url: '/rh/quadro-colaboradores', icon: Users },
      { title: 'Contratos de Experiência', url: '/rh/contrato-experiencia', icon: FileText },
      { title: 'Férias', url: '/rh/programacao-ferias', icon: Users },
      { title: 'Turnover', url: '/rh/turnover', icon: Users },
      { title: 'Absenteísmo e Afastamentos', url: '/rh/absenteismo', icon: Users },
      { title: 'Formulários', url: '/rh/formularios', icon: FileText },
      { title: 'Relatório Gerencial — PDF + IA', url: '/rh/relatorio-gerencial', icon: FileText },
    ],
  },
  {
    id: 'config',
    label: 'Configurações',
    icon: Settings,
    kind: 'flat',
    items: [
      { title: 'Personalizar Menus', url: '/configuracoes/personalizar-menus', icon: Settings },
      { title: 'Monitor de Usuários Senior', url: '/monitor-usuarios-senior', icon: Users },
      { title: 'Monitor de Telas (IA)', url: '/monitor-telas', icon: BarChart3 },
      { title: 'Monitor de Telas — ERP Nativo', url: '/monitor-erp-nativo', icon: Database },
      { title: 'Gestão SGU — Usuários ERP Senior', url: '/gestao-sgu-usuarios', icon: Users },
      { title: 'Configurações Gerais', url: '/configuracoes', icon: Settings },
      { title: 'Biblioteca BI — Catálogo de Componentes', url: '/biblioteca-bi', icon: Boxes },
    ],
  },
];

export const ALWAYS_VISIBLE = new Set<string>(['/biblioteca-bi', '/', '/configuracoes/personalizar-menus']);

export function allLeaves(top: TopMenu): Leaf[] {
  if (top.kind === 'leaf') return [top.item];
  if (top.kind === 'flat') return top.items;
  return top.subGroups.flatMap((sg) => sg.items);
}

export function allLeavesFlat(): Leaf[] {
  return TOP_MENUS.flatMap(allLeaves);
}

export function findTopIdForUrl(url: string): string | null {
  for (const top of TOP_MENUS) {
    if (top.kind === 'leaf' && top.item.url === url) return top.id;
    if (top.kind === 'flat' && top.items.some((i) => i.url === url)) return top.id;
    if (top.kind === 'nested' && top.subGroups.some((sg) => sg.items.some((i) => i.url === url))) return top.id;
  }
  return null;
}
