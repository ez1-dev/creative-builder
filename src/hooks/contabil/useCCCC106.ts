import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/contabilApi";
import { CODEMP, CODFIL } from "@/lib/contabilConfig";
import { useResultadoCache } from "@/hooks/contabil/api";
import type { ComparativoResponseV2, ComparativoLinhaV2 } from "@/types/contabil";

export interface CCCC106LinhaImport {
  codigo: string;
  ctared?: number | null;
  clacta?: string | null;
  descricao: string;
  tipo?: string | null;
  natureza?: string | null;
  saldo_anterior?: number | null;
  debito?: number | null;
  credito?: number | null;
  saldo_final: number;
}

export interface ImportarCCCC106Payload {
  modelo_id: string;
  codemp: number;
  codfil: number;
  anomes: number;
  origem_arquivo: string;
  substituir_periodo?: boolean;
  linhas: CCCC106LinhaImport[];
}

export interface SeniorCCCC106Response {
  modelo_id: string;
  codemp: number;
  codfil: number;
  origem: string;
  anomes?: number;
  gravados?: number;
  linhas?: CCCC106LinhaImport[];
}

export type ConciliacaoStatus = "OK" | "DIVERGENTE" | "SEM_CCCC106" | "SEM_API" | string;

export type FonteSistema = "MENSAL_E650SAL" | "CCCC106_E640LCT_ACUMULADO";

export interface ConciliacaoLinha {
  codigo: string;
  descricao: string;
  ctared?: number | null;
  tipo?: string | null;
  natureza?: string | null;
  valor_cccc106?: number | null;
  valor_api?: number | null;
  diferenca?: number | null;
  status: ConciliacaoStatus;
  chave_match?: "CTARED" | "CODIGO" | string;
  fonte_sistema?: FonteSistema;
}

export interface ConciliacaoResponse {
  modelo_id: string;
  codemp: number;
  codfil: number;
  anomes: number;
  origem?: string | null;
  ultima_importacao?: string | null;
  tem_saldo_final?: boolean;
  coluna_origem_cccc106?: string | null;
  linhas: ConciliacaoLinha[];
}

function handleError(e: unknown) {
  const err = e as ApiError | Error;
  toast.error((err as Error)?.message ?? "Erro inesperado.");
}

export function useBuscarCCCC106Senior() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      modelo_id: string;
      anomes: number;
      codemp?: number;
      codfil?: number;
    }) =>
      api.get<SeniorCCCC106Response>("/api/contabil/cccc106/senior", {
        modelo_id: params.modelo_id,
        codemp: params.codemp ?? CODEMP,
        codfil: params.codfil ?? CODFIL,
        anomes: params.anomes,
      }),
    onSuccess: (data, vars) => {
      toast.success(
        `CCCC106 do Senior carregado (${data.gravados ?? data.linhas?.length ?? 0} linhas).`,
      );
      qc.invalidateQueries({
        queryKey: ["contabil", "cccc106", "conciliacao", vars.modelo_id, vars.anomes],
      });
    },
    onError: handleError,
  });
}

export function useImportarCCCC106Manual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportarCCCC106Payload) =>
      api.post<{ gravados?: number }>("/api/contabil/cccc106/importar", payload),
    onSuccess: (data, vars) => {
      toast.success(
        `Importação concluída (${data?.gravados ?? vars.linhas.length} linhas).`,
      );
      qc.invalidateQueries({
        queryKey: ["contabil", "cccc106", "conciliacao", vars.modelo_id, vars.anomes],
      });
    },
    onError: handleError,
  });
}

export function useConciliacaoCCCC106(
  params: { modelo_id?: string; anomes?: number; codemp?: number; codfil?: number },
  enabled = true,
) {
  const { modelo_id, anomes } = params;
  const modoBalanco = "CCCC106_E640LCT_ACUMULADO";
  return useQuery({
    queryKey: ["contabil", "cccc106", "conciliacao", modelo_id, anomes, modoBalanco],
    queryFn: () =>
      api.get<ConciliacaoResponse>("/api/contabil/cccc106/conciliacao", {
        modelo_id: modelo_id!,
        codemp: params.codemp ?? CODEMP,
        codfil: params.codfil ?? CODFIL,
        anomes: anomes!,
        modo_balanco: modoBalanco,
      }),
    enabled: enabled && !!modelo_id && !!anomes,
    retry: (count, e) => {
      const err = e as ApiError;
      if (err?.status === 404) return false;
      return count < 1;
    },
    staleTime: 10_000,
  });
}

// ============================================================
// Conciliação combinada: SISTEMA = CCCC106_E640LCT_ACUMULADO para
// linhas normais; MENSAL_E650SAL para linhas especiais (98, 99,
// 999, VINCULAR). No modo acumulado esses totalizadores são apenas
// fechamento técnico, não o oficial do Balanço.
// ============================================================
const CODIGOS_ESPECIAIS = new Set(["1", "2", "98", "99", "999", "VINCULAR"]);

function isEspecial(linha: { codigo?: string | null; natureza?: string | null }): boolean {
  const cod = String(linha.codigo ?? "").trim().toUpperCase();
  if (CODIGOS_ESPECIAIS.has(cod)) return true;
  if (String(linha.natureza ?? "").toUpperCase() === "VINCULAR") return true;
  return false;
}

function normCodigo(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

function normCtared(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

interface CacheIndex {
  porChave: Map<string, ComparativoLinhaV2>;
  porCodigo: Map<string, ComparativoLinhaV2[]>;
  linhas: ComparativoLinhaV2[];
}

function buildIndex(linhas: ComparativoLinhaV2[]): CacheIndex {
  const porChave = new Map<string, ComparativoLinhaV2>();
  const porCodigo = new Map<string, ComparativoLinhaV2[]>();
  for (const l of linhas) {
    const cod = normCodigo(l.codigo);
    if (!cod) continue;
    const ct = normCtared((l as { ctared?: unknown }).ctared);
    const chave = ct > 0 ? `${cod}|${ct}` : `${cod}|GRUPO`;
    if (!porChave.has(chave)) porChave.set(chave, l);
    const arr = porCodigo.get(cod) ?? [];
    arr.push(l);
    porCodigo.set(cod, arr);
  }
  return { porChave, porCodigo, linhas };
}

function findLinhaCache(
  index: CacheIndex,
  codigo: string,
  ctared: number | null | undefined,
): ComparativoLinhaV2 | undefined {
  const cod = normCodigo(codigo);
  const ct = normCtared(ctared);
  const chave = ct > 0 ? `${cod}|${ct}` : `${cod}|GRUPO`;
  const direct = index.porChave.get(chave);
  if (direct) return direct;
  // Sintética sem match exato: só aceita se houver uma única linha com aquele código.
  if (ct === 0) {
    const lista = index.porCodigo.get(cod);
    if (lista && lista.length === 1) return lista[0];
  }
  if (cod === "VINCULAR") {
    return index.linhas.find((l) => String(l.natureza ?? "").toUpperCase() === "VINCULAR");
  }
  if (cod === "999") {
    return index.linhas.find(
      (l) => String(l.descricao ?? "").trim().toUpperCase() === "TOTAL GERAL",
    );
  }
  return undefined;
}


function computeStatus(
  valorCccc106: number | null | undefined,
  valorApi: number | null | undefined,
): { status: ConciliacaoStatus; diferenca: number | null } {
  if (valorCccc106 == null && valorApi == null) {
    return { status: "SEM_CCCC106", diferenca: null };
  }
  if (valorApi == null) return { status: "SEM_API", diferenca: null };
  if (valorCccc106 == null) return { status: "SEM_CCCC106", diferenca: null };
  const dif = Number(valorCccc106) - Number(valorApi);
  return {
    status: Math.abs(dif) <= 0.05 ? "OK" : "DIVERGENTE",
    diferenca: dif,
  };
}

export function mergeSistemaCache(
  base: ConciliacaoResponse | undefined,
  mensal: ComparativoResponseV2 | undefined,
  acumulado: ComparativoResponseV2 | undefined,
  anomes: number,
): {
  response: ConciliacaoResponse | undefined;
  mensalDisponivel: boolean;
  acumuladoDisponivel: boolean;
  algumEspecialSemCache: boolean;
  algumNormalSemCache: boolean;
} {
  if (!base) {
    return {
      response: base,
      mensalDisponivel: false,
      acumuladoDisponivel: false,
      algumEspecialSemCache: false,
      algumNormalSemCache: false,
    };
  }
  const linhasMensal = mensal?.linhas ?? [];
  const linhasAcum = acumulado?.linhas ?? [];
  const mensalDisponivel = linhasMensal.length > 0;
  const acumuladoDisponivel = linhasAcum.length > 0;
  const idxMensal = buildIndex(linhasMensal);
  const idxAcum = buildIndex(linhasAcum);

  const key = String(anomes);

  let algumEspecialSemCache = false;
  let algumNormalSemCache = false;

  const linhas = base.linhas.map((l): ConciliacaoLinha => {
    if (isEspecial(l)) {
      if (!mensalDisponivel) {
        algumEspecialSemCache = true;
        return {
          ...l,
          valor_api: null,
          diferenca: null,
          status: "SEM_API",
          fonte_sistema: "MENSAL_E650SAL",
          chave_match: "CODIGO",
        };
      }
      const m = findLinhaCache(idxMensal, l.codigo, l.ctared);
      const v = m?.realizado?.[key];
      const valorMensal = v == null ? null : Number(v);
      if (valorMensal == null) algumEspecialSemCache = true;
      const { status, diferenca } = computeStatus(l.valor_cccc106 ?? null, valorMensal);
      return {
        ...l,
        valor_api: valorMensal,
        diferenca,
        status,
        fonte_sistema: "MENSAL_E650SAL",
        chave_match: "CODIGO",
      };
    }
    // Linha normal: SISTEMA vem do cache acumulado, nunca de vínculos.
    if (!acumuladoDisponivel) {
      algumNormalSemCache = true;
      return {
        ...l,
        valor_api: null,
        diferenca: null,
        status: "SEM_API",
        fonte_sistema: "CCCC106_E640LCT_ACUMULADO",
      };
    }
    const a = findLinhaCache(idxAcum, l.codigo, l.ctared);
    const va = a?.realizado?.[key];
    const valorAcum = va == null ? null : Number(va);
    if (valorAcum == null) algumNormalSemCache = true;
    const { status, diferenca } = computeStatus(l.valor_cccc106 ?? null, valorAcum);
    return {
      ...l,
      valor_api: valorAcum,
      diferenca,
      status,
      fonte_sistema: "CCCC106_E640LCT_ACUMULADO",
      chave_match: l.chave_match ?? "CODIGO",
    };
  });

  return {
    response: { ...base, linhas },
    mensalDisponivel,
    acumuladoDisponivel,
    algumEspecialSemCache,
    algumNormalSemCache,
  };
}

// Alias legado.
export const mergeSistemaEspeciais = mergeSistemaCache;

export function useConciliacaoCCCC106Combinada(
  params: { modelo_id?: string; anomes?: number; codemp?: number; codfil?: number },
  enabled = true,
) {
  const conciliacao = useConciliacaoCCCC106(params, enabled);

  const mensal = useResultadoCache(
    params.modelo_id ?? "",
    {
      anomes_ini: params.anomes ?? 0,
      anomes_fim: params.anomes ?? 0,
      codfil: params.codfil ?? CODFIL,
      modo_balanco: "MENSAL_E650SAL",
    },
    enabled && !!params.modelo_id && !!params.anomes,
  );

  const acumulado = useResultadoCache(
    params.modelo_id ?? "",
    {
      anomes_ini: params.anomes ?? 0,
      anomes_fim: params.anomes ?? 0,
      codfil: params.codfil ?? CODFIL,
      modo_balanco: "CCCC106_E640LCT_ACUMULADO",
    },
    enabled && !!params.modelo_id && !!params.anomes,
  );

  const merged = useMemo(
    () =>
      mergeSistemaCache(
        conciliacao.data,
        mensal.data,
        acumulado.data,
        params.anomes ?? 0,
      ),
    [conciliacao.data, mensal.data, acumulado.data, params.anomes],
  );

  return {
    ...conciliacao,
    data: merged.response,
    mensalQuery: mensal,
    acumuladoQuery: acumulado,
    mensalDisponivel: merged.mensalDisponivel,
    acumuladoDisponivel: merged.acumuladoDisponivel,
    algumEspecialSemCache: merged.algumEspecialSemCache,
    algumNormalSemCache: merged.algumNormalSemCache,
  };
}
