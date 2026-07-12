// Camada de dados do módulo DRE/Balanço — TODAS as chamadas vão para a
// API Python (https://dreconfiguravel.ngrok.app). Nada de Supabase no front.

import { api } from "./contabilApi";
import { CODEMP, CODFIL } from "./contabilConfig";
import type {
  ContaVinculada,
  LinhaModelo,
  Modelo,
  ModeloDetalhe,
  OrcamentoItem,
  TipoModelo,
} from "@/types/contabil";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function unwrapList<T>(d: unknown): T[] {
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === "object" && "dados" in d && Array.isArray((d as any).dados)) {
    return (d as any).dados as T[];
  }
  return [];
}

function unwrapModeloDetalhe(d: any): ModeloDetalhe {
  // Aceita {modelo, linhas, contas} ou um objeto plano com esses campos.
  const modelo: Modelo = d.modelo ?? d;
  const linhas: LinhaModelo[] = d.linhas ?? [];
  const contas: ContaVinculada[] = d.contas ?? [];
  return { modelo, linhas, contas };
}

// ------------------------------------------------------------------
// Modelos
// ------------------------------------------------------------------
export async function listModelos(filters?: {
  tipo_modelo?: TipoModelo;
  ativo?: boolean;
}): Promise<Modelo[]> {
  const raw = await api.get<unknown>("/api/contabil/modelos", { codemp: CODEMP });
  let all = unwrapList<Modelo>(raw);
  if (filters?.tipo_modelo) all = all.filter((m) => m.tipo_modelo === filters.tipo_modelo);
  if (typeof filters?.ativo === "boolean") all = all.filter((m) => m.ativo === filters.ativo);
  return all.sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function getModeloDetalhe(id: string): Promise<ModeloDetalhe> {
  const d = await api.get<any>(`/api/contabil/modelos/${id}`);
  const det = unwrapModeloDetalhe(d);
  det.linhas = [...det.linhas].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  return det;
}

function unwrapModelo(d: any): Modelo {
  const m = (d?.dados ?? d?.modelo ?? d) as Modelo;
  if (!m || !m.id) {
    throw new Error("API não retornou id do modelo.");
  }
  return m;
}

export async function createModelo(input: {
  nome: string;
  tipo_modelo: TipoModelo;
  descricao?: string;
  ativo: boolean;
}): Promise<Modelo> {
  const raw = await api.post<any>("/api/contabil/modelos", {
    codemp: CODEMP,
    nome: input.nome,
    tipo_modelo: input.tipo_modelo,
    descricao: input.descricao ?? null,
    ativo: input.ativo,
  });
  return unwrapModelo(raw);
}

export async function updateModelo(id: string, patch: Partial<Modelo>): Promise<Modelo> {
  const raw = await api.put<any>(`/api/contabil/modelos/${id}`, {
    nome: patch.nome,
    tipo_modelo: patch.tipo_modelo,
    descricao: patch.descricao,
    ativo: patch.ativo,
  });
  return unwrapModelo(raw);
}

export async function deleteModelo(id: string): Promise<void> {
  await api.del<unknown>(`/api/contabil/modelos/${id}`);
}

// ------------------------------------------------------------------
// Linhas
// ------------------------------------------------------------------
export async function createLinha(
  modelo_id: string,
  body: Partial<LinhaModelo>,
): Promise<LinhaModelo> {
  return api.post<LinhaModelo>(`/api/contabil/modelos/${modelo_id}/linhas`, {
    linha_pai_id: body.linha_pai_id ?? null,
    ordem: body.ordem ?? 0,
    codigo: body.codigo ?? "",
    descricao: body.descricao ?? "",
    tipo_linha: body.tipo_linha ?? "ANALITICA",
    natureza: body.natureza ?? "OUTROS",
    operador: body.operador ?? "SOMA",
    sinal: body.sinal ?? 1,
    exibir: body.exibir ?? true,
    negrito: body.negrito ?? false,
    formula: body.formula ?? null,
  });
}

export async function updateLinha(
  modelo_id: string,
  linha_id: string,
  patch: Partial<LinhaModelo>,
): Promise<LinhaModelo> {
  return api.put<LinhaModelo>(
    `/api/contabil/modelos/${modelo_id}/linhas/${linha_id}`,
    {
      linha_pai_id: patch.linha_pai_id,
      ordem: patch.ordem,
      codigo: patch.codigo,
      descricao: patch.descricao,
      tipo_linha: patch.tipo_linha,
      natureza: patch.natureza,
      operador: patch.operador,
      sinal: patch.sinal,
      exibir: patch.exibir,
      negrito: patch.negrito,
      formula: patch.formula,
    },
  );
}

export async function deleteLinha(modelo_id: string, linha_id: string): Promise<void> {
  await api.del<unknown>(`/api/contabil/modelos/${modelo_id}/linhas/${linha_id}`);
}

export async function reordenarLinhas(
  modelo_id: string,
  updates: Array<{ id: string; linha_pai_id: string | null; ordem: number }>,
): Promise<void> {
  await Promise.all(
    updates.map((u) =>
      api.put<unknown>(`/api/contabil/modelos/${modelo_id}/linhas/${u.id}`, {
        linha_pai_id: u.linha_pai_id,
        ordem: u.ordem,
      }),
    ),
  );
}

// ------------------------------------------------------------------
// Contas vinculadas
// ------------------------------------------------------------------
export async function vincularConta(
  modelo_id: string,
  linha_id: string,
  conta: Omit<ContaVinculada, "id" | "linha_id">,
): Promise<ContaVinculada> {
  return api.post<ContaVinculada>(
    `/api/contabil/modelos/${modelo_id}/linhas/${linha_id}/contas`,
    {
      codemp: CODEMP,
      ctared: conta.ctared,
      clacta: conta.clacta,
      descta: conta.descta,
      nivcta: conta.nivcta,
      anasin: conta.anasin,
      incluir_subcontas: conta.incluir_subcontas,
      sinal: conta.sinal,
    },
  );
}

export async function removerConta(
  modelo_id: string,
  linha_id: string,
  conta_id: string,
): Promise<void> {
  await api.del<unknown>(
    `/api/contabil/modelos/${modelo_id}/linhas/${linha_id}/contas/${conta_id}`,
  );
}

// ------------------------------------------------------------------
// Orçamento
// ------------------------------------------------------------------
export async function listOrcamento(
  modelo_id: string,
  anomes_ini: number,
  anomes_fim: number,
): Promise<OrcamentoItem[]> {
  const raw = await api.get<unknown>("/api/contabil/orcamento", {
    modelo_id,
    anomes_ini,
    anomes_fim,
  });
  return unwrapList<OrcamentoItem>(raw);
}

export async function upsertOrcamento(item: OrcamentoItem): Promise<void> {
  await api.post<unknown>("/api/contabil/orcamento", {
    modelo_id: item.modelo_id,
    linha_id: item.linha_id,
    codemp: item.codemp ?? CODEMP,
    codfil: item.codfil ?? CODFIL,
    codccu: item.codccu ?? null,
    ctared: item.ctared ?? null,
    anomes: item.anomes,
    valor_orcado: item.valor_orcado,
  });
}
