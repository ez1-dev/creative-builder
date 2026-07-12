import type { NaturezaLinha, Operador, TipoLinha } from "@/types/contabil";

export interface EstruturaPadraoItem {
  codigo: string;
  descricao: string;
  tipo_linha: TipoLinha;
  natureza: NaturezaLinha;
  operador: Operador;
  sinal: 1 | -1;
  negrito: boolean;
  exibir: boolean;
  ordem_sugerida?: number;
}

export interface BalancoSeniorItem extends EstruturaPadraoItem {
  // campos brutos do payload Senior, usados para vínculo automático de conta
  ctared?: number | null;
  clacta?: string;
  descta?: string;
  nivcta?: number;
  anasin?: "A" | "S";
  eh_analitica?: boolean;
}

// Normaliza variações vindas do backend/legado para o enum Operador
const normOperador = (op: string): Operador => {
  const v = String(op ?? "").toUpperCase();
  if (v === "SUBTRACAO" || v === "SUBTRAI" || v === "-" || v === "SUB") return "SUBTRAI";
  return "SOMA";
};

const normTipoLinha = (t: unknown): TipoLinha => {
  const v = String(t ?? "").toUpperCase();
  if (v === "GRUPO" || v === "SUBTOTAL" || v === "TOTAL" || v === "FORMULA" || v === "ANALITICA") {
    return v as TipoLinha;
  }
  return "ANALITICA";
};

const NATUREZAS: NaturezaLinha[] = [
  "RECEITA", "DEDUCAO", "CUSTO", "DESPESA", "RESULTADO",
  "ATIVO", "PASSIVO", "PATRIMONIO", "OUTROS",
];
const normNatureza = (n: unknown): NaturezaLinha => {
  const v = String(n ?? "").toUpperCase();
  return (NATUREZAS as string[]).includes(v) ? (v as NaturezaLinha) : "OUTROS";
};

export function normalizarItem(raw: Record<string, unknown>): EstruturaPadraoItem {
  return {
    codigo: String(raw.codigo ?? ""),
    descricao: String(raw.descricao ?? ""),
    tipo_linha: normTipoLinha(raw.tipo_linha),
    natureza: normNatureza(raw.natureza),
    operador: normOperador(String(raw.operador ?? "SOMA")),
    sinal: (Number(raw.sinal) === -1 ? -1 : 1) as 1 | -1,
    negrito: Boolean(raw.negrito),
    exibir: raw.exibir !== false,
    ordem_sugerida:
      raw.ordem_sugerida != null ? Number(raw.ordem_sugerida) : undefined,
  };
}

export function normalizarItemBalancoSenior(
  raw: Record<string, unknown>,
): BalancoSeniorItem {
  const clacta = raw.clacta != null ? String(raw.clacta) : undefined;
  const descta = raw.descta != null ? String(raw.descta) : undefined;
  const codigo = clacta ?? String(raw.codigo ?? "");
  const descricao =
    descta ?? String(raw.descricao ?? raw.label ?? "");
  const anasinRaw = String(raw.anasin ?? "").toUpperCase();
  const anasin: "A" | "S" | undefined =
    anasinRaw === "A" ? "A" : anasinRaw === "S" ? "S" : undefined;
  const ctaredRaw = raw.ctared;
  const ctaredNum =
    ctaredRaw === null || ctaredRaw === undefined || ctaredRaw === ""
      ? null
      : Number(ctaredRaw);

  return {
    codigo,
    descricao,
    tipo_linha: normTipoLinha(raw.tipo_linha),
    natureza: normNatureza(raw.natureza),
    operador: normOperador(String(raw.operador ?? "SOMA")),
    sinal: (Number(raw.sinal) === -1 ? -1 : 1) as 1 | -1,
    negrito: Boolean(raw.negrito),
    exibir: raw.exibir !== false,
    ordem_sugerida:
      raw.ordem_sugerida != null ? Number(raw.ordem_sugerida) : undefined,
    ctared:
      ctaredNum != null && Number.isFinite(ctaredNum) ? ctaredNum : null,
    clacta,
    descta,
    nivcta: raw.nivcta != null ? Number(raw.nivcta) : undefined,
    anasin,
    eh_analitica:
      raw.eh_analitica === true || raw.eh_analitica === 1 || anasin === "A",
  };
}

export function proximaOrdem(ordensExistentes: number[]): number {
  if (ordensExistentes.length === 0) return 10;
  return Math.max(...ordensExistentes) + 10;
}
