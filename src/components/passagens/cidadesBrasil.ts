// Coordenadas (lat, lng) das cidades brasileiras usadas no módulo de Passagens Aéreas.
// Cobre as 27 capitais + cidades efetivamente registradas no banco.

export interface Coord { lat: number; lng: number; uf: string }

const RAW: Record<string, Coord> = {
  // Capitais
  'RIO BRANCO': { lat: -9.97499, lng: -67.8243, uf: 'AC' },
  MACEIO: { lat: -9.66599, lng: -35.7350, uf: 'AL' },
  MACAPA: { lat: 0.0349, lng: -51.0694, uf: 'AP' },
  MANAUS: { lat: -3.119, lng: -60.0217, uf: 'AM' },
  SALVADOR: { lat: -12.9714, lng: -38.5014, uf: 'BA' },
  FORTALEZA: { lat: -3.7172, lng: -38.5433, uf: 'CE' },
  BRASILIA: { lat: -15.7942, lng: -47.8822, uf: 'DF' },
  VITORIA: { lat: -20.3155, lng: -40.3128, uf: 'ES' },
  GOIANIA: { lat: -16.6869, lng: -49.2648, uf: 'GO' },
  'SAO LUIS': { lat: -2.5307, lng: -44.3068, uf: 'MA' },
  CUIABA: { lat: -15.601, lng: -56.0974, uf: 'MT' },
  'CAMPO GRANDE': { lat: -20.4486, lng: -54.6295, uf: 'MS' },
  'BELO HORIZONTE': { lat: -19.9167, lng: -43.9345, uf: 'MG' },
  BELEM: { lat: -1.4558, lng: -48.4902, uf: 'PA' },
  'JOAO PESSOA': { lat: -7.1153, lng: -34.8641, uf: 'PB' },
  CURITIBA: { lat: -25.4284, lng: -49.2733, uf: 'PR' },
  RECIFE: { lat: -8.0476, lng: -34.877, uf: 'PE' },
  TERESINA: { lat: -5.0892, lng: -42.8019, uf: 'PI' },
  'RIO DE JANEIRO': { lat: -22.9068, lng: -43.1729, uf: 'RJ' },
  NATAL: { lat: -5.7945, lng: -35.211, uf: 'RN' },
  'PORTO ALEGRE': { lat: -30.0346, lng: -51.2177, uf: 'RS' },
  'PORTO VELHO': { lat: -8.7619, lng: -63.9039, uf: 'RO' },
  'BOA VISTA': { lat: 2.8235, lng: -60.6758, uf: 'RR' },
  FLORIANOPOLIS: { lat: -27.5949, lng: -48.5482, uf: 'SC' },
  'SAO PAULO': { lat: -23.5505, lng: -46.6333, uf: 'SP' },
  ARACAJU: { lat: -10.9472, lng: -37.0731, uf: 'SE' },
  PALMAS: { lat: -10.1845, lng: -48.3336, uf: 'TO' },
  // Demais cidades vistas no banco
  CAMPINAS: { lat: -22.9056, lng: -47.0608, uf: 'SP' },
  CHAPECO: { lat: -27.0966, lng: -52.6184, uf: 'SC' },
  GUARAPUAVA: { lat: -25.3935, lng: -51.4582, uf: 'PR' },
  GUARULHOS: { lat: -23.4538, lng: -46.5333, uf: 'SP' },
  ITABUNA: { lat: -14.7858, lng: -39.2803, uf: 'BA' },
  ITAITUBA: { lat: -4.2738, lng: -55.9836, uf: 'PA' },
  ITARARE: { lat: -24.1124, lng: -49.3322, uf: 'SP' },
  ITIRAPINA: { lat: -22.2542, lng: -47.8228, uf: 'SP' },
  ITUIUTABA: { lat: -18.9744, lng: -49.4625, uf: 'MG' },
  'JUAZEIRO DO NORTE': { lat: -7.213, lng: -39.3157, uf: 'CE' },
  OSASCO: { lat: -23.5325, lng: -46.7917, uf: 'SP' },
  PARANAGUA: { lat: -25.5161, lng: -48.5224, uf: 'PR' },
  PIRACICABA: { lat: -22.7253, lng: -47.6492, uf: 'SP' },
  'RIO GRANDE': { lat: -32.0349, lng: -52.0986, uf: 'RS' },
  SANTAREM: { lat: -2.4431, lng: -54.7083, uf: 'PA' },
  SANTOS: { lat: -23.9608, lng: -46.3331, uf: 'SP' },
  'SAO FRANCISCO DO SUL': { lat: -26.2435, lng: -48.6383, uf: 'SC' },
  'SAO JOSE DOS PINHAIS': { lat: -25.5316, lng: -49.2065, uf: 'PR' },
  JOINVILLE: { lat: -26.3045, lng: -48.8487, uf: 'SC' },
  CASCAVEL: { lat: -24.9555, lng: -53.4552, uf: 'PR' },
  LONDRINA: { lat: -23.3045, lng: -51.1696, uf: 'PR' },
  MARINGA: { lat: -23.4205, lng: -51.9333, uf: 'PR' },
  UBERLANDIA: { lat: -18.9186, lng: -48.2772, uf: 'MG' },
  'RIBEIRAO PRETO': { lat: -21.1775, lng: -47.8208, uf: 'SP' },
  'SAO JOSE DO RIO PRETO': { lat: -20.8113, lng: -49.3758, uf: 'SP' },
  PETROLINA: { lat: -9.3891, lng: -40.5026, uf: 'PE' },
  'JUAZEIRO': { lat: -9.4111, lng: -40.4986, uf: 'BA' },
  IMPERATRIZ: { lat: -5.5269, lng: -47.4828, uf: 'MA' },
};

function normaliza(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function geocodeCidade(nome: string | null | undefined): Coord | null {
  if (!nome) return null;
  const k = normaliza(nome);
  return RAW[k] ?? null;
}

export function nomeNormalizado(nome: string): string {
  return normaliza(nome);
}
