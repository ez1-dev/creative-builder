// Mapa rota -> { codigo, nome } para gravar tela_codigo / tela_nome
// no log de navegação. Mantenha este catálogo em sincronia com as rotas reais.

export interface ScreenInfo {
  codigo: string;
  nome: string;
}

const EXACT: Record<string, ScreenInfo> = {
  '/':                          { codigo: 'HOME',         nome: 'Início' },
  '/dashboard-geral':           { codigo: 'DASH_GERAL',   nome: 'Dashboard Geral' },
  '/login':                     { codigo: 'LOGIN',        nome: 'Login' },
  '/dashboard':                 { codigo: 'DASH',         nome: 'Dashboard' },
  '/configuracoes':             { codigo: 'CONFIG',       nome: 'Configurações' },
  '/passagens-aereas':          { codigo: 'PASSAGENS',    nome: 'Passagens Aéreas' },
  '/frota':                     { codigo: 'FROTA',        nome: 'Manutenção de Frota' },
  '/manutencao-maquinas':       { codigo: 'MAQUINAS',     nome: 'Manutenção de Máquinas' },
  '/monitor-usuarios-senior':   { codigo: 'MON_SR',       nome: 'Monitor Usuários Senior' },
  '/faturamento-genius':        { codigo: 'FAT_GENIUS',   nome: 'Faturamento Genius' },
  '/gestao-sgu-usuarios':       { codigo: 'SGU_USR',      nome: 'Gestão SGU - Usuários ERP Senior' },
  '/demonstrativo-compras-recebimentos': { codigo: 'DEM_COMP_REC', nome: 'Demonstrativo de Compras e Recebimentos' },
  '/biblioteca-bi':             { codigo: 'BIBLIO_BI',    nome: 'Biblioteca BI' },
  '/contabilidade/balanco':     { codigo: 'CONT_BAL',     nome: 'Contabilidade — Balanço Patrimonial' },
  '/bi/contabilidade/dre':      { codigo: 'CONT_DRE',     nome: 'Contabilidade — DRE' },
  '/bi/contabilidade/dre/configuracao': { codigo: 'CONT_DRE_CFG', nome: 'Configuração da DRE Gerencial' },
  '/bi/contabilidade/dre-dinamica': { codigo: 'CONT_DRE_DIN', nome: 'DRE Dinâmica Gerencial' },
  '/bi/contabilidade/dre-dinamica/montador': { codigo: 'CONT_DRE_MONTADOR', nome: 'Montador da DRE Gerencial' },
  '/bi/financeiro/dre-configuravel': { codigo: 'BI_FIN_DRE_CFG', nome: 'BI Financeiro — DRE Configurável' },
  
  '/producao/impressao-op':     { codigo: 'PROD_IMP_OP',  nome: 'Impressão de Ordem de Produção' },
  '/producao/carga':            { codigo: 'PROD_CARGA',   nome: 'Carga de Produção' },
  '/producao/carga/dashboard':  { codigo: 'PROD_CARGA_BI', nome: 'Carga de Produção — Dashboard BI' },
  '/producao/carga/recursos':   { codigo: 'PROD_CARGA_REC', nome: 'Carga de Produção — Por Centro de Recurso' },
  '/producao/programacao':      { codigo: 'PROD_PROGRAMACAO', nome: 'Programação e Sequenciamento' },
  '/cadastros/produtos':        { codigo: 'CAD_PRODUTOS',  nome: 'Consulta de Produtos' },
  '/bi/faturamento-validacao':  { codigo: 'BI_FAT_VAL',    nome: 'Validação BI Faturamento' },
  '/bi/comercial':              { codigo: 'BI_COMERCIAL',  nome: 'BI Comercial' },
  '/bi/faturamento/relatorio-executivo': { codigo: 'BI_FAT_REL_EXEC', nome: 'BI - Relatório Executivo de Faturamento' },
  '/rh':                        { codigo: 'RH',            nome: 'RH' },
  '/rh/resumo-folha':           { codigo: 'RH_RESUMO',     nome: 'RH — Resumo Folha' },
  '/rh/quadro-colaboradores':   { codigo: 'RH_QUADRO',     nome: 'RH — Quadro de Colaboradores' },
  '/rh/contrato-experiencia':   { codigo: 'RH_CONTRATO',   nome: 'RH — Contrato Experiência' },
  '/rh/programacao-ferias':     { codigo: 'RH_FERIAS',     nome: 'RH — Programação de Férias' },
  '/rh/turnover':               { codigo: 'RH_TURNOVER',   nome: 'RH — Rotatividade / Turnover' },
  '/rh/absenteismo':            { codigo: 'RH_ABSENTEISMO', nome: 'RH — Absenteísmo / Afastamentos' },
  '/rh/formularios':            { codigo: 'RH_FORM',       nome: 'RH — Formulários' },
  '/rh/relatorio-gerencial':    { codigo: 'RH_RELATORIO_GERENCIAL', nome: 'RH — Relatório Gerencial (PDF+IA)' },

};

const PREFIX: Array<[string, ScreenInfo]> = [
  ['/passagens-aereas/share',   { codigo: 'PASSAGENS_SHARE', nome: 'Passagens Aéreas — Link Público' }],
  ['/contabilidade',            { codigo: 'CONT',            nome: 'Contabilidade' }],
  ['/configuracoes',            { codigo: 'CONFIG',          nome: 'Configurações' }],
  ['/dashboard',                { codigo: 'DASH',            nome: 'Dashboard' }],
  ['/cadastros',                { codigo: 'CAD',             nome: 'Cadastros' }],
];

const titleCase = (s: string) =>
  s.replace(/[-_/]+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase()) || 'Tela';

export function resolveScreen(path: string): ScreenInfo {
  const clean = (path || '/').split('?')[0].split('#')[0] || '/';
  if (EXACT[clean]) return EXACT[clean];
  for (const [pref, info] of PREFIX) {
    if (clean.startsWith(pref)) return info;
  }
  return { codigo: clean, nome: titleCase(clean) };
}
