// Mapa rota -> { codigo, nome } para gravar tela_codigo / tela_nome
// no log de navegação. Mantenha este catálogo em sincronia com as rotas reais.

export interface ScreenInfo {
  codigo: string;
  nome: string;
}

const EXACT: Record<string, ScreenInfo> = {
  '/':                          { codigo: 'HOME',         nome: 'Início' },
  '/login':                     { codigo: 'LOGIN',        nome: 'Login' },
  '/dashboard':                 { codigo: 'DASH',         nome: 'Dashboard' },
  '/configuracoes':             { codigo: 'CONFIG',       nome: 'Configurações' },
  '/passagens-aereas':          { codigo: 'PASSAGENS',    nome: 'Passagens Aéreas' },
  '/monitor-usuarios-senior':   { codigo: 'MON_SR',       nome: 'Monitor Usuários Senior' },
  '/faturamento-genius':        { codigo: 'FAT_GENIUS',   nome: 'Faturamento Genius' },
};

const PREFIX: Array<[string, ScreenInfo]> = [
  ['/passagens-aereas/share',   { codigo: 'PASSAGENS_SHARE', nome: 'Passagens Aéreas — Link Público' }],
  ['/configuracoes',            { codigo: 'CONFIG',          nome: 'Configurações' }],
  ['/dashboard',                { codigo: 'DASH',            nome: 'Dashboard' }],
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
