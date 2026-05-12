export interface LspRisco {
  nivel: 'info' | 'warning' | 'error';
  mensagem: string;
}

export interface LspAnalise {
  tabelas_consultadas: string[];
  tabelas_alteradas: string[];
  mensagens: string[];
  comandos_sql: string[];
  riscos: LspRisco[];
}

const uniq = (arr: string[]) => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));

/** Extrai conteúdo de chamadas Funcao(...) de primeiro nível, tolerando parênteses internos. */
function extractCalls(src: string, fnNames: string[]): string[] {
  const out: string[] = [];
  const re = new RegExp(`\\b(${fnNames.join('|')})\\s*\\(`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length;
    let depth = 1;
    let buf = '';
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (depth === 0) break; }
      buf += ch;
      i++;
    }
    out.push(buf);
  }
  return out;
}

function tabelasDeSql(sql: string): { from: string[]; into: string[]; updated: string[]; deleted: string[] } {
  const norm = sql.replace(/\s+/g, ' ');
  const from = Array.from(norm.matchAll(/\bFROM\s+([A-Z_][A-Z0-9_]*)/gi)).map((m) => m[1]);
  const joins = Array.from(norm.matchAll(/\bJOIN\s+([A-Z_][A-Z0-9_]*)/gi)).map((m) => m[1]);
  const into = Array.from(norm.matchAll(/\bINSERT\s+INTO\s+([A-Z_][A-Z0-9_]*)/gi)).map((m) => m[1]);
  const updated = Array.from(norm.matchAll(/\bUPDATE\s+([A-Z_][A-Z0-9_]*)/gi)).map((m) => m[1]);
  const deleted = Array.from(norm.matchAll(/\bDELETE\s+FROM\s+([A-Z_][A-Z0-9_]*)/gi)).map((m) => m[1]);
  return { from: [...from, ...joins], into, updated, deleted };
}

function avaliarRiscos(comandosSql: string[], alteradas: string[]): LspRisco[] {
  const riscos: LspRisco[] = [];
  for (const cmd of comandosSql) {
    const c = cmd.replace(/\s+/g, ' ').toUpperCase();
    if (/\bDELETE\s+FROM\b/.test(c) && !/\bWHERE\b/.test(c)) {
      riscos.push({ nivel: 'error', mensagem: 'DELETE sem cláusula WHERE detectado.' });
    }
    if (/\bUPDATE\s+[A-Z_][A-Z0-9_]*/.test(c) && !/\bWHERE\b/.test(c)) {
      riscos.push({ nivel: 'error', mensagem: 'UPDATE sem cláusula WHERE detectado.' });
    }
    if (/\b(DROP|TRUNCATE)\b/.test(c)) {
      riscos.push({ nivel: 'error', mensagem: `Comando ${c.match(/\b(DROP|TRUNCATE)\b/)![1]} detectado.` });
    }
    if (/['"]\s*\+\s*[A-Za-z_]/.test(cmd) || /\+\s*['"]/.test(cmd)) {
      riscos.push({ nivel: 'warning', mensagem: 'Concatenação de variáveis em SQL pode causar injeção.' });
    }
  }
  if (alteradas.length > 3) {
    riscos.push({ nivel: 'info', mensagem: `Regra altera ${alteradas.length} tabelas distintas.` });
  }
  return riscos;
}

export function analisarFonteLsp(src: string | null | undefined): LspAnalise {
  const empty: LspAnalise = {
    tabelas_consultadas: [], tabelas_alteradas: [],
    mensagens: [], comandos_sql: [], riscos: [],
  };
  if (!src || !src.trim()) return empty;

  const comandos_sql = extractCalls(src, ['ExecSQL', 'ExecSQLEx']);
  const mensagens = extractCalls(src, ['GeraLog', 'Mensagem'])
    .map((arg) => {
      const m = arg.match(/["']([^"']*)["']/);
      return m ? m[1] : arg.trim();
    });

  // também procura por SQLs soltos no corpo (heurístico)
  const sqlInline = src;
  const allSql = [...comandos_sql, sqlInline];

  const consultadas: string[] = [];
  const alteradas: string[] = [];
  for (const sql of allSql) {
    const t = tabelasDeSql(sql);
    consultadas.push(...t.from);
    alteradas.push(...t.into, ...t.updated, ...t.deleted);
  }

  const tabelas_consultadas = uniq(consultadas);
  const tabelas_alteradas = uniq(alteradas);
  const riscos = avaliarRiscos(comandos_sql, tabelas_alteradas);

  return {
    tabelas_consultadas,
    tabelas_alteradas,
    mensagens: uniq(mensagens),
    comandos_sql,
    riscos,
  };
}
