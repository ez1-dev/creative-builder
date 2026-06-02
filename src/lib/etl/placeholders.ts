/**
 * Placeholders no padrão UpQuery/Senior: $[NOME]
 * O frontend apenas armazena/edita; a FastAPI faz o replace antes de enviar ao ERP.
 */

export type PlaceholderTipo = 'anomes' | 'data' | 'inteiro' | 'inteiro_list';

export interface PlaceholderSpec {
  nome: string;
  tipo: PlaceholderTipo;
  /** Regex usada para validar o valor antes do replace (front e back). */
  regex: RegExp;
  /** Tipo do input HTML sugerido. */
  inputType: 'number' | 'date' | 'text';
  /** Texto auxiliar (placeholder/help). */
  exemplo: string;
}

export const PLACEHOLDER_SPECS: Record<string, PlaceholderSpec> = {
  ANOMES_INI: { nome: 'ANOMES_INI', tipo: 'anomes', regex: /^\d{6}$/, inputType: 'number', exemplo: '202601' },
  ANOMES_FIM: { nome: 'ANOMES_FIM', tipo: 'anomes', regex: /^\d{6}$/, inputType: 'number', exemplo: '202612' },
  DATA_INI: { nome: 'DATA_INI', tipo: 'data', regex: /^\d{4}-\d{2}-\d{2}$/, inputType: 'date', exemplo: '2026-01-01' },
  DATA_FIM: { nome: 'DATA_FIM', tipo: 'data', regex: /^\d{4}-\d{2}-\d{2}$/, inputType: 'date', exemplo: '2026-12-31' },
  CODEMP: { nome: 'CODEMP', tipo: 'inteiro', regex: /^\d+$/, inputType: 'number', exemplo: '1' },
  CODFIL: { nome: 'CODFIL', tipo: 'inteiro', regex: /^\d+$/, inputType: 'number', exemplo: '1' },
  CODEMP_LIST: { nome: 'CODEMP_LIST', tipo: 'inteiro_list', regex: /^\d+(,\d+)*$/, inputType: 'text', exemplo: '1,2,5' },
  CODFIL_LIST: { nome: 'CODFIL_LIST', tipo: 'inteiro_list', regex: /^\d+(,\d+)*$/, inputType: 'text', exemplo: '1,2,5' },
};

export const PLACEHOLDERS_SUPORTADOS = Object.keys(PLACEHOLDER_SPECS) as readonly string[];

const RE_PLACEHOLDER = /\$\[([^\]]*)\]/g;
const RE_NOME_VALIDO = /^[A-Z_][A-Z0-9_]*$/;

export function extrairPlaceholders(sql: string): string[] {
  if (!sql) return [];
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(RE_PLACEHOLDER.source, 'g');
  while ((m = re.exec(sql)) !== null) {
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

export interface ResultadoValidacaoSalvar {
  ok: boolean;
  erros: string[];
  avisos: string[];
}

/**
 * Validação no momento de salvar. Erros bloqueiam; avisos só pedem confirmação.
 */
export function validarParaSalvar(
  sql: string,
  ctx?: { estrategia_carga?: string | null },
): ResultadoValidacaoSalvar {
  const erros: string[] = [];
  const avisos: string[] = [];

  if (!sql || !sql.trim()) {
    return { ok: true, erros, avisos };
  }

  // 1. Encontra TODOS os $[...] (incluindo mal formados) para validar nome.
  const re = new RegExp(RE_PLACEHOLDER.source, 'g');
  const vistos = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const nomeRaw = m[1];
    if (vistos.has(nomeRaw)) continue;
    vistos.add(nomeRaw);
    if (nomeRaw.length === 0) {
      erros.push('Placeholder vazio encontrado: `$[]`.');
      continue;
    }
    if (!RE_NOME_VALIDO.test(nomeRaw)) {
      erros.push(
        `Placeholder mal formado: \`$[${nomeRaw}]\` — use apenas letras maiúsculas, números e _ (ex.: $[ANOMES_INI]).`,
      );
      continue;
    }
    if (!PLACEHOLDERS_SUPORTADOS.includes(nomeRaw)) {
      erros.push(
        `Placeholder desconhecido: \`$[${nomeRaw}]\`. Suportados: ${PLACEHOLDERS_SUPORTADOS.join(', ')}.`,
      );
    }
  }

  // 2. Aviso: REPLACE_PERIODO sem placeholder de período.
  if (ctx?.estrategia_carga === 'REPLACE_PERIODO') {
    const temPeriodo =
      vistos.has('ANOMES_INI') ||
      vistos.has('ANOMES_FIM') ||
      vistos.has('DATA_INI') ||
      vistos.has('DATA_FIM');
    if (!temPeriodo) {
      avisos.push(
        'Estratégia REPLACE_PERIODO sem placeholder de período ($[ANOMES_INI]/$[ANOMES_FIM] ou $[DATA_INI]/$[DATA_FIM]) — toda a tabela pode ser recarregada.',
      );
    }
  }

  return { ok: erros.length === 0, erros, avisos };
}

/**
 * Valida um conjunto de valores contra os placeholders detectados num SQL.
 * Usado pelos modais de execução e teste antes de enviar à FastAPI.
 */
export function validarValores(
  sql: string,
  valores: Record<string, string | number | null | undefined>,
): { ok: boolean; erros: string[] } {
  const erros: string[] = [];
  const placeholders = extrairPlaceholders(sql).filter((p) => PLACEHOLDERS_SUPORTADOS.includes(p));
  for (const p of placeholders) {
    const spec = PLACEHOLDER_SPECS[p];
    const v = valores[p];
    if (v === null || v === undefined || v === '') {
      erros.push(`${p} é obrigatório.`);
      continue;
    }
    if (!spec.regex.test(String(v))) {
      erros.push(`${p}: valor inválido (esperado ${spec.exemplo}).`);
    }
  }
  return { ok: erros.length === 0, erros };
}
