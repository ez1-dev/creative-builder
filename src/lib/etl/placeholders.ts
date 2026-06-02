/**
 * Placeholders no padrão UpQuery/Senior: $[NOME]
 * O frontend apenas armazena/edita; a FastAPI faz o replace antes de enviar ao ERP.
 */

export const PLACEHOLDERS_SUPORTADOS = ['ANOMES_INI', 'ANOMES_FIM'] as const;
export type PlaceholderSuportado = (typeof PLACEHOLDERS_SUPORTADOS)[number];

const RE_PLACEHOLDER = /\$\[([A-Z_][A-Z0-9_]*)\]/g;

export function extrairPlaceholders(sql: string): string[] {
  if (!sql) return [];
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = RE_PLACEHOLDER.exec(sql)) !== null) {
    set.add(m[1]);
  }
  return Array.from(set);
}

export function validarPlaceholders(sql: string): {
  encontrados: string[];
  desconhecidos: string[];
} {
  const encontrados = extrairPlaceholders(sql);
  const suportados = new Set<string>(PLACEHOLDERS_SUPORTADOS);
  const desconhecidos = encontrados.filter((p) => !suportados.has(p));
  return { encontrados, desconhecidos };
}
