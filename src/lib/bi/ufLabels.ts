/**
 * Mapa fixo de UF → nome do estado para exibição "SP - São Paulo" em
 * gráficos, drills e chips do BI Comercial. Backend pode devolver `nm_estado`
 * ou `estado_label` (sempre prevalecem); este catálogo é só fallback.
 */
export const UF_LABELS: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
  EX: 'Exterior',
};

export function ufName(uf: string | null | undefined): string | undefined {
  if (!uf) return undefined;
  const k = String(uf).trim().toUpperCase();
  return UF_LABELS[k];
}

/** Devolve "SP - São Paulo" quando reconhece a UF; senão devolve o código puro. */
export function formatEstadoLabel(uf: string | null | undefined): string {
  if (uf == null) return '';
  const code = String(uf).trim().toUpperCase();
  if (!code) return '';
  const name = UF_LABELS[code];
  return name ? `${code} - ${name}` : code;
}
