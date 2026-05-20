/**
 * Extrai parâmetros nomeados (formato :nome) de uma SQL.
 * Ignora `::cast` do Postgres.
 */
export function parseSqlParams(sql: string): string[] {
  if (!sql) return [];
  const re = /(?<!:):([a-z_][a-z0-9_]*)/gi;
  const seen = new Set<string>();
  const result: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const name = m[1].toLowerCase();
    if (!seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

const DML_DDL_RE = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|merge|replace)\b/i;

/**
 * Bloqueio heurístico no frontend (validação autoritativa fica no FastAPI).
 * Retorna mensagem de erro se a SQL contém DML/DDL; null se OK.
 */
export function checkSqlSafe(sql: string): string | null {
  const stripped = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  if (DML_DDL_RE.test(stripped)) {
    return 'A SQL contém comandos de alteração de dados (INSERT/UPDATE/DELETE/DDL). Apenas SELECT é permitido.';
  }
  if (!/^\s*(with|select)\b/i.test(stripped)) {
    return 'A SQL deve começar com SELECT ou WITH.';
  }
  return null;
}
