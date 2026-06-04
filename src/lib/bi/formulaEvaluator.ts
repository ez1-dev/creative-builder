/**
 * Avaliador seguro de fórmulas para métricas customizadas.
 *
 * Suporta: + - * / ( )  e identificadores [a-z_][a-z0-9_]*
 * Sem `eval`, sem `Function`. Shunting-yard + execução em RPN.
 *
 * Identificadores são resolvidos pelo objeto `vars` (números). Quando ausente
 * ou não-finito, vira 0. Divisão por zero → 0 (em vez de NaN/Infinity).
 */

type Tok =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: '+' | '-' | '*' | '/' }
  | { t: 'lp' } | { t: 'rp' }
  | { t: 'neg' };

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3 };

function tokenize(input: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const s = input.trim();
  let prev: Tok | null = null;
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ' || ch === '\t') { i++; continue; }
    if (ch === '(') { out.push({ t: 'lp' }); prev = out[out.length - 1]; i++; continue; }
    if (ch === ')') { out.push({ t: 'rp' }); prev = out[out.length - 1]; i++; continue; }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      // Unary minus
      const isUnary = ch === '-' && (!prev || prev.t === 'op' || prev.t === 'lp' || prev.t === 'neg');
      if (isUnary) { out.push({ t: 'neg' }); }
      else { out.push({ t: 'op', v: ch as any }); }
      prev = out[out.length - 1]; i++; continue;
    }
    if (ch >= '0' && ch <= '9' || ch === '.') {
      let j = i + 1;
      while (j < s.length && (s[j] === '.' || (s[j] >= '0' && s[j] <= '9'))) j++;
      const n = Number(s.slice(i, j));
      if (!Number.isFinite(n)) throw new Error(`Número inválido em "${s.slice(i, j)}"`);
      out.push({ t: 'num', v: n });
      prev = out[out.length - 1]; i = j; continue;
    }
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      let j = i + 1;
      while (j < s.length && ((s[j] >= 'a' && s[j] <= 'z') || (s[j] >= 'A' && s[j] <= 'Z') || (s[j] >= '0' && s[j] <= '9') || s[j] === '_')) j++;
      out.push({ t: 'id', v: s.slice(i, j).toLowerCase() });
      prev = out[out.length - 1]; i = j; continue;
    }
    throw new Error(`Caractere inválido: "${ch}"`);
  }
  return out;
}

function toRPN(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  const ops: Tok[] = [];
  for (const tk of toks) {
    if (tk.t === 'num' || tk.t === 'id') out.push(tk);
    else if (tk.t === 'neg') ops.push(tk);
    else if (tk.t === 'op') {
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.t === 'lp') break;
        const tp = top.t === 'op' ? PREC[top.v] : top.t === 'neg' ? PREC.neg : 0;
        if (tp >= PREC[tk.v]) out.push(ops.pop()!);
        else break;
      }
      ops.push(tk);
    } else if (tk.t === 'lp') ops.push(tk);
    else if (tk.t === 'rp') {
      while (ops.length && ops[ops.length - 1].t !== 'lp') out.push(ops.pop()!);
      if (!ops.length) throw new Error('Parêntese sem abertura');
      ops.pop();
    }
  }
  while (ops.length) {
    const top = ops.pop()!;
    if (top.t === 'lp' || top.t === 'rp') throw new Error('Parênteses desbalanceados');
    out.push(top);
  }
  return out;
}

function evalRPN(rpn: Tok[], vars: Record<string, number>): number {
  const st: number[] = [];
  for (const tk of rpn) {
    if (tk.t === 'num') st.push(tk.v);
    else if (tk.t === 'id') {
      const v = Number(vars[tk.v]);
      st.push(Number.isFinite(v) ? v : 0);
    } else if (tk.t === 'neg') {
      const a = st.pop() ?? 0;
      st.push(-a);
    } else if (tk.t === 'op') {
      const b = st.pop() ?? 0;
      const a = st.pop() ?? 0;
      if (tk.v === '+') st.push(a + b);
      else if (tk.v === '-') st.push(a - b);
      else if (tk.v === '*') st.push(a * b);
      else if (tk.v === '/') st.push(b === 0 ? 0 : a / b);
    }
  }
  if (st.length !== 1) throw new Error('Fórmula inválida');
  const r = st[0];
  return Number.isFinite(r) ? r : 0;
}

export interface CompiledFormula {
  formula: string;
  identifiers: string[];
  eval: (vars: Record<string, number>) => number;
}

export function compileFormula(formula: string): CompiledFormula {
  const toks = tokenize(formula);
  const ids = Array.from(new Set(toks.filter((t): t is Extract<Tok,{t:'id'}> => t.t === 'id').map((t) => t.v)));
  const rpn = toRPN(toks);
  return {
    formula,
    identifiers: ids,
    eval: (vars) => evalRPN(rpn, vars),
  };
}

export function validateFormula(formula: string, allowed: string[]): { ok: true } | { ok: false; error: string } {
  try {
    const c = compileFormula(formula);
    const set = new Set(allowed.map((s) => s.toLowerCase()));
    const unknown = c.identifiers.find((id) => !set.has(id));
    if (unknown) return { ok: false, error: `Identificador desconhecido: "${unknown}"` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Erro' };
  }
}
