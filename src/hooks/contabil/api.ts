import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError, fixMojibake } from "@/lib/contabilApi";
import * as store from "@/lib/contabilStore";
import { CODEMP, CODFIL } from "@/lib/contabilConfig";
import type {
  CentroCusto,
  ComparativoLinha,
  ComparativoResponse,
  ComparativoResponseV2,
  ContaVinculada,
  DrillLancamento,
  ExecucaoCache,
  LinhaModelo,
  Modelo,
  ModeloDetalhe,
  OrcamentoItem,
  PeriodoStatus,
  PlanoContasResponse,
  TipoModelo,
} from "@/types/contabil";


function handleError(e: unknown) {
  const err = e as ApiError | Error;
  toast.error((err as Error)?.message ?? "Erro inesperado.");
}

export function isValidId(id?: string | null): id is string {
  return !!id && id !== "undefined" && id !== "null";
}

function requireId(modeloId?: string | null) {
  if (!isValidId(modeloId)) {
    throw new Error("Selecione ou crie um modelo antes de continuar.");
  }
}

// ============================================================
// HEALTH
// ============================================================
export function useHealth() {
  return useQuery({
    queryKey: ["contabil", "health"],
    queryFn: () =>
      api.get<{
        ok: boolean;
        erp?: { banco?: string };
        supabase_configurado?: boolean;
      }>("/api/contabil/health"),
    refetchInterval: 60_000,
    retry: 0,
    staleTime: 30_000,
  });
}

// ============================================================
// Plano de contas, centros de custo
// ============================================================
export function usePlanoContas(
  tipo: TipoModelo,
  opts?: { busca?: string; somente_ativas?: boolean; somente_analiticas?: boolean },
) {
  return useQuery({
    queryKey: ["contabil", "plano-contas", tipo, opts],
    queryFn: () =>
      api.get<PlanoContasResponse>("/api/contabil/plano-contas", {
        codemp: CODEMP,
        tipo,
        busca: opts?.busca,
        somente_ativas: opts?.somente_ativas,
        somente_analiticas: opts?.somente_analiticas,
      }),
    staleTime: 30_000,
  });
}

export function useCentrosCusto() {
  return useQuery({
    queryKey: ["contabil", "centros-custo"],
    queryFn: () =>
      api.get<{ dados: CentroCusto[] } | CentroCusto[]>(
        "/api/contabil/centros-custo",
        { codemp: CODEMP },
      ),
    staleTime: 5 * 60_000,
    select: (d) => (Array.isArray(d) ? d : d.dados),
  });
}

export function useEstruturaPadrao(tipo: TipoModelo) {
  return useQuery({
    queryKey: ["contabil", "estrutura-padrao", tipo],
    queryFn: () =>
      api.get<Array<Record<string, unknown>> | { dados: Array<Record<string, unknown>> }>(
        "/api/contabil/estrutura-padrao",
        { tipo_modelo: tipo },
      ),
    staleTime: 5 * 60_000,
    enabled: !!tipo,
    retry: 0,
    select: (d) => (Array.isArray(d) ? d : (d?.dados ?? [])),
  });
}

// ============================================================
// Modelos
// ============================================================
export function useModelos(filters?: {
  tipo_modelo?: TipoModelo | "TODOS";
  ativo?: "true" | "false" | "todos";
}) {
  return useQuery({
    queryKey: ["contabil", "modelos", "v2", filters],
    queryFn: () =>
      store.listModelos({
        tipo_modelo:
          filters?.tipo_modelo && filters.tipo_modelo !== "TODOS"
            ? filters.tipo_modelo
            : undefined,
        ativo:
          filters?.ativo === "true"
            ? true
            : filters?.ativo === "false"
              ? false
              : undefined,
      }),
  });
}

export function useModelo(
  modeloId: string | undefined,
  options?: Partial<UseQueryOptions<ModeloDetalhe>>,
) {
  return useQuery<ModeloDetalhe>({
    queryKey: ["contabil", "modelo", "v2", modeloId],
    queryFn: () => store.getModeloDetalhe(modeloId!),
    enabled: isValidId(modeloId),
    ...options,
  });
}

export function useCreateModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      nome: string;
      tipo_modelo: TipoModelo;
      descricao?: string;
      ativo: boolean;
    }) => store.createModelo(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelos"] });
      toast.success("Modelo criado.");
    },
    onError: handleError,
  });
}

export function useUpdateModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Modelo> & { id: string }) =>
      store.updateModelo(id, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelos"] });
      qc.invalidateQueries({ queryKey: ["contabil", "modelo", v.id] });
      toast.success("Modelo atualizado.");
    },
    onError: handleError,
  });
}

export function useDeleteModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => store.deleteModelo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelos"] });
      toast.success("Modelo excluído.");
    },
    onError: handleError,
  });
}

// ============================================================
// Linhas
// ============================================================
export function useCreateLinha(modeloId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<LinhaModelo>) => { requireId(modeloId); return store.createLinha(modeloId, body); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelo", modeloId] });
      toast.success("Linha criada.");
    },
    onError: handleError,
  });
}

export function useUpdateLinha(modeloId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<LinhaModelo> & { id: string }) => {
      requireId(modeloId);
      return store.updateLinha(modeloId, id, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelo", modeloId] });
    },
    onError: handleError,
  });
}

export function useDeleteLinha(modeloId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => { requireId(modeloId); return store.deleteLinha(modeloId, id); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelo", modeloId] });
      toast.success("Linha removida.");
    },
    onError: handleError,
  });
}

export function useReordenarLinhas(modeloId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      updates: Array<{ id: string; linha_pai_id: string | null; ordem: number }>,
    ) => { requireId(modeloId); return store.reordenarLinhas(modeloId, updates); },
    onMutate: async (updates) => {
      const key = ["contabil", "modelo", modeloId];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ModeloDetalhe>(key);
      if (prev) {
        const map = new Map(updates.map((u) => [u.id, u]));
        const next: ModeloDetalhe = {
          ...prev,
          linhas: prev.linhas.map((l) => {
            const u = map.get(l.id);
            return u ? { ...l, linha_pai_id: u.linha_pai_id, ordem: u.ordem } : l;
          }),
        };
        qc.setQueryData(key, next);
      }
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["contabil", "modelo", modeloId], ctx.prev);
      handleError(e);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelo", modeloId] });
    },
  });
}

// ============================================================
// Contas vinculadas
// ============================================================
export function useVincularConta(modeloId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      linhaId,
      conta,
    }: {
      linhaId: string;
      conta: Omit<ContaVinculada, "id" | "linha_id">;
    }) => { requireId(modeloId); return store.vincularConta(modeloId, linhaId, conta); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelo", modeloId] });
    },
    onError: (e: unknown) => {
      const err = e as { status?: number; message?: string };
      if (err.status === 409) toast.warning("Esta conta já está vinculada neste modelo.");
      else handleError(e);
    },
  });
}

export function useRemoverConta(modeloId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ linhaId, contaId }: { linhaId: string; contaId: string }) => {
      requireId(modeloId);
      return store.removerConta(modeloId, linhaId, contaId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelo", modeloId] });
      toast.success("Conta desvinculada.");
    },
    onError: handleError,
  });
}

// ============================================================
// Drill por linha do modelo
// ============================================================
export function useDrillLinha(
  modeloId: string,
  args: { linhaId: string; anomes: number; codccu?: string; codfil?: number } | null,
) {
  return useQuery<{ dados: DrillLancamento[] } | DrillLancamento[]>({
    queryKey: ["contabil", "drill-linha", "v2", modeloId, args],
    queryFn: () =>
      api.get<{ dados: DrillLancamento[] } | DrillLancamento[]>(
        `/api/contabil/modelos/${modeloId}/linhas/${args!.linhaId}/drill`,
        {
          codemp: CODEMP,
          codfil: args?.codfil ?? CODFIL,
          anomes: args!.anomes,
          codccu: args?.codccu,
        },
      ),
    enabled: !!args && isValidId(modeloId),
  });
}

// ============================================================
// (removido) useComparativo — endpoint /comparativo não é mais
// utilizado. A tela de Visualização usa exclusivamente
// /resultado-cache (fonte oficial: E650SAL.SALMES para Balanço).
// ============================================================



export function normalizeComparativo(raw: unknown, modeloId: string): ComparativoResponseV2 {
  const data = (raw && typeof raw === "object" && "dados" in (raw as any))
    ? (raw as any).dados
    : raw;
  if (!data || typeof data !== "object") {
    return { modelo_id: modeloId, colunas: [], linhas: [] };
  }
  const d = data as any;

  const toNumberOrNull = (value: any): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  // Mapeia 1 linha (V2 ou formato novo), aceitando valores em
  // `linha.valores[anomes].{realizado,...}` ou em `linha.realizado[anomes]` direto.
  // Preserva todos os campos virtuais (codigo_pai, linha_virtual, tipo_registro,
  // origem_linha, nivel_visual, conta_contabil, codigo_exibicao etc.) e sintetiza
  // `linha_id` a partir do `codigo` quando ausente — essencial para que as linhas
  // virtuais `VINCULAR.*` (que não trazem linha_id físico) possam ser indexadas e
  // ligadas em árvore por `codigo_pai`.
  const mapLinha = (linha: any, colunasBase: string[]) => {
    const realizado: Record<string, number | null> = {};
    const orcado: Record<string, number | null> = {};
    const variacao: Record<string, number | null> = {};
    const variacao_percentual: Record<string, number | null> = {};

    const valoresMap = linha?.valores && typeof linha.valores === "object" ? linha.valores : null;
    const realDict = linha?.realizado && typeof linha.realizado === "object" && !Array.isArray(linha.realizado) ? linha.realizado : null;
    const orcDict = linha?.orcado && typeof linha.orcado === "object" && !Array.isArray(linha.orcado) ? linha.orcado : null;
    const varDict = linha?.variacao && typeof linha.variacao === "object" && !Array.isArray(linha.variacao) ? linha.variacao : null;
    const varPctDict =
      (linha?.variacao_percentual && typeof linha.variacao_percentual === "object" && !Array.isArray(linha.variacao_percentual))
        ? linha.variacao_percentual
        : null;

    for (const anomes of colunasBase) {
      const valorMes = valoresMap
        ? (valoresMap[anomes] ?? valoresMap[Number(anomes)] ?? {})
        : {};
      realizado[anomes] = toNumberOrNull(
        valorMes.realizado ?? realDict?.[anomes] ?? realDict?.[Number(anomes)],
      );
      orcado[anomes] = toNumberOrNull(
        valorMes.orcado ?? orcDict?.[anomes] ?? orcDict?.[Number(anomes)],
      );
      variacao[anomes] = toNumberOrNull(
        valorMes.variacao ?? varDict?.[anomes] ?? varDict?.[Number(anomes)],
      );
      variacao_percentual[anomes] = toNumberOrNull(
        valorMes.percentual_variacao ??
          valorMes.variacao_percentual ??
          varPctDict?.[anomes] ??
          varPctDict?.[Number(anomes)],
      );
    }

    const total = linha?.total ?? {};
    realizado.TOTAL_ANO = toNumberOrNull(total.realizado ?? realDict?.TOTAL_ANO);
    orcado.TOTAL_ANO = toNumberOrNull(total.orcado ?? orcDict?.TOTAL_ANO);
    variacao.TOTAL_ANO = toNumberOrNull(total.variacao ?? varDict?.TOTAL_ANO);
    variacao_percentual.TOTAL_ANO = toNumberOrNull(
      total.percentual_variacao ?? total.variacao_percentual ?? varPctDict?.TOTAL_ANO,
    );

    const codigo = fixMojibake(linha.codigo ?? "");
    const linhaId =
      linha.linha_id ?? linha.id ?? (codigo ? `cod:${codigo}` : null);

    return {
      id: linha.id ?? linhaId,
      linha_id: linhaId,
      linha_pai_id: linha.linha_pai_id ?? null,
      ordem: linha.ordem ?? 0,
      codigo,
      descricao: fixMojibake(linha.descricao ?? ""),
      tipo_linha: linha.tipo_linha ?? "ANALITICA",
      natureza: linha.natureza ?? null,
      exibir: linha.exibir ?? true,
      negrito: linha.negrito ?? false,
      realizado,
      orcado,
      variacao,
      variacao_percentual,
      origem_valor: linha.origem_valor ?? null,
      tipo_registro: linha.tipo_registro ?? undefined,
      origem_linha: linha.origem_linha ?? null,
      nivel_visual: linha.nivel_visual ?? null,
      codigo_exibicao: linha.codigo_exibicao ? fixMojibake(String(linha.codigo_exibicao)) : null,
      conta_reduzida: linha.conta_reduzida ?? null,
      conta_contabil: linha.conta_contabil ?? null,
      descricao_conta: fixMojibake(linha.descricao_conta ?? ""),
      valor_acumulado_linha: toNumberOrNull(linha.valor_acumulado_linha),
      codigo_pai: linha.codigo_pai ?? null,
      linha_virtual: linha.linha_virtual ?? null,
      contas_vinculadas: (linha.contas_vinculadas ?? []).map((c: any) => ({
        ...c,
        descta: fixMojibake(c?.descta ?? ""),
      })),
      // Drill Senior — repassa como veio, sem inferência.
      drillavel: typeof linha.drillavel === "boolean" ? linha.drillavel : undefined,
      drills: Array.isArray(linha.drills) ? linha.drills : undefined,
      drills_menu: Array.isArray(linha.drills_menu) ? linha.drills_menu : undefined,
      codigo_linha: linha.codigo_linha ?? null,
    };
  };


  // Formato novo do endpoint /resultado-cache OU "Already V2" — ambos têm
  // colunas/periodos + linhas. Normalizamos sempre para garantir que linhas
  // virtuais (codigo_pai, linha_virtual, codigo_exibicao, conta_contabil,
  // tipo_registro, origem_linha, nivel_visual) sejam preservadas e que o
  // linha_id seja estável (mesmo quando a API só envia `codigo`).
  if (Array.isArray(d?.linhas) && (Array.isArray(d?.periodos) || Array.isArray(d?.colunas))) {
    const colunasBase: string[] = Array.isArray(d.periodos)
      ? d.periodos.map((p: any) => String(p))
      : (d.colunas as any[]).map(String).filter((c: string) => c !== "TOTAL_ANO");
    const colunas = [...colunasBase, "TOTAL_ANO"];
    const linhas = d.linhas.map((l: any) => mapLinha(l, colunasBase));

    return {
      modelo_id: d.modelo?.id ?? d.modelo_id ?? modeloId,
      colunas,
      periodos: colunasBase,
      linhas,
      metodo_calculo_linhas: d.metodo_calculo_linhas ?? undefined,
      fonte: d.fonte ?? null,
      fonte_saldo: d.fonte_saldo ?? d.fonteSaldo ?? null,
      origem: d.origem ?? d.origin ?? null,
      aplicar_referencia_senior: d.aplicar_referencia_senior ?? null,
      referencia_senior_aplicada: d.referencia_senior_aplicada ?? null,
      referencia_senior_origem: d.referencia_senior_origem ?? null,
      qtd_referencias_aplicadas:
        d.qtd_referencias_aplicadas ?? d.qtdReferenciasAplicadas ?? null,
    } as ComparativoResponseV2;
  }




  // Legacy: meses[] + linhas[].meses[anomes].{realizado, orcado, variacao, variacao_pct}
  if (Array.isArray(d.meses)) {

    const colunas = [...d.meses.map((m: number) => String(m)), "TOTAL_ANO"];
    const linhas = (d.linhas ?? []).map((l: ComparativoLinha) => {
      const realizado: Record<string, number | null> = {};
      const orcado: Record<string, number | null> = {};
      const variacao: Record<string, number | null> = {};
      const variacao_percentual: Record<string, number | null> = {};
      for (const m of d.meses as number[]) {
        const key = String(m);
        const cel = l.meses?.[key];
        realizado[key] = cel?.realizado ?? null;
        orcado[key] = cel?.orcado ?? null;
        variacao[key] = cel?.variacao ?? null;
        variacao_percentual[key] = cel?.variacao_pct ?? null;
      }
      realizado.TOTAL_ANO = l.total?.realizado ?? null;
      orcado.TOTAL_ANO = l.total?.orcado ?? null;
      variacao.TOTAL_ANO = l.total?.variacao ?? null;
      variacao_percentual.TOTAL_ANO = l.total?.variacao_pct ?? null;
      return {
        linha_id: l.linha_id,
        codigo: l.codigo,
        descricao: l.descricao,
        tipo_linha: l.tipo_linha,
        natureza: l.natureza,
        negrito: l.negrito,
        exibir: l.exibir,
        linha_pai_id: l.linha_pai_id,
        realizado,
        orcado,
        variacao,
        variacao_percentual,
      };
    });
    return { modelo_id: d.modelo_id ?? modeloId, colunas, periodos: d.meses.map((m: number) => String(m)), linhas };
  }
  return { modelo_id: modeloId, colunas: [], linhas: [] };
}

// ============================================================
// Orçamento
// ============================================================
export function useOrcamento(modeloId: string, anomes_ini: number, anomes_fim: number) {
  return useQuery<OrcamentoItem[]>({
    queryKey: ["contabil", "orcamento", modeloId, anomes_ini, anomes_fim],
    queryFn: () => store.listOrcamento(modeloId, anomes_ini, anomes_fim),
    enabled: isValidId(modeloId),
  });
}

export function useSalvarOrcamento(modeloId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: OrcamentoItem) => {
      if (!isValidId(item.modelo_id)) {
        throw new Error("Selecione ou crie um modelo antes de continuar.");
      }
      return store.upsertOrcamento(item);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contabil", "orcamento", modeloId] });
    },
    onError: handleError,
  });
}

// ============================================================
// Cache: sincronizar saldos / recalcular / resultado
// ============================================================
const CACHE_TIMEOUT_MS = 120_000;

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms = CACHE_TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fn(ctrl.signal);
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError" || ctrl.signal.aborted) {
      throw new Error("Tempo excedido (120s). Verifique se a API está ativa e tente novamente.");
    }
    throw e;
  } finally {
    clearTimeout(to);
  }
}

export interface CacheFiltros {
  anomes_ini: number;
  anomes_fim: number;
  codccu?: string;
  codfil?: number | null;
  data_ini?: string;
  data_fim?: string;
  modo_balanco?: import("@/types/contabil").ModoBalanco;
  data_corte?: string | null;
  aplicar_referencia_senior?: boolean;
  expandir_resultado_exercicio?: boolean;
  tipo_modelo?: "DRE" | "BALANCO";
  consolidado?: boolean;
  /** Fonte de saldo (E650SAL, E640LCT). Padrão: E650SAL. */
  fonte_saldo?: string;
}


async function postWithSignal<T>(path: string, body: unknown, signal: AbortSignal): Promise<T> {
  const { apiRequest } = await import("@/lib/contabilApi");
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

// Hooks legados (sincronizar-saldos / recalcular-cache / atualizar-cache) foram
// removidos. Todo o fluxo de escrita passa exclusivamente por
// POST /api/contabil/modelos/{id}/materializar-resultado (useMaterializarResultado).

// ============================================================
// Cache: status dos períodos e histórico de execuções
// ============================================================
export function usePeriodosStatus(params: {
  enabled?: boolean;
  codemp?: number;
  codfil?: number | null;
  anomes_ini: number;
  anomes_fim: number;
  modo_balanco?: import("@/types/contabil").ModoBalanco;
}) {
  const codemp = params.codemp ?? CODEMP;
  const codfil = params.codfil ?? CODFIL;
  return useQuery<PeriodoStatus[]>({
    queryKey: [
      "contabil",
      "cache",
      "periodos-status",
      { codemp, codfil, anomes_ini: params.anomes_ini, anomes_fim: params.anomes_fim, modo_balanco: params.modo_balanco ?? null },
    ],
    queryFn: async () => {
      const raw = await api.get<any>("/api/contabil/cache/periodos-status", {
        codemp,
        codfil,
        anomes_ini: params.anomes_ini,
        anomes_fim: params.anomes_fim,
        modo_balanco: params.modo_balanco,
      });
      const arr: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.dados)
          ? raw.dados
          : Array.isArray(raw?.periodos)
            ? raw.periodos
            : Array.isArray(raw?.data)
              ? raw.data
              : [];
      return arr.map((p): PeriodoStatus => {
        const tgRaw = p?.total_geral ?? p?.totalGeral ?? p?.TOTAL_GERAL;
        const tg = tgRaw == null || tgRaw === "" ? null : Number(tgRaw);
        return {
          anomes: Number(p?.anomes ?? p?.ANOMES ?? 0),
          status: String(p?.status ?? p?.STATUS ?? "SEM_CACHE").toUpperCase(),
          fechamento_ok:
            p?.fechamento_ok ?? p?.fechamentoOk ?? p?.FECHAMENTO_OK ?? p?.fecha ?? null,
          ultima_execucao:
            p?.ultima_execucao ??
            p?.ultimaExecucao ??
            p?.finalizado_em ??
            p?.atualizado_em ??
            p?.data_hora ??
            null,
          mensagem: p?.mensagem ?? p?.erro ?? null,
          execucao_id: p?.execucao_id ?? p?.execucaoId ?? null,
          total_geral: tg != null && Number.isFinite(tg) ? tg : null,
        };
      });
    },
    enabled:
      (params.enabled ?? true) &&
      Number.isFinite(params.anomes_ini) &&
      Number.isFinite(params.anomes_fim),
    retry: 0,
    staleTime: 10_000,
  });
}

export function useExecucoesCache(params: {
  enabled?: boolean;
  codemp?: number;
  codfil?: number | null;
  modelo_id?: string;
  limit?: number;
}) {
  const codemp = params.codemp ?? CODEMP;
  return useQuery<ExecucaoCache[]>({
    queryKey: [
      "contabil",
      "cache",
      "execucoes",
      { codemp, codfil: params.codfil ?? null, modelo_id: params.modelo_id ?? null, limit: params.limit ?? 50 },
    ],
    queryFn: async () => {
      const raw = await api.get<any>("/api/contabil/cache/execucoes", {
        codemp,
        codfil: params.codfil ?? undefined,
        modelo_id: params.modelo_id,
        limit: params.limit ?? 50,
      });
      const arr: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.dados)
          ? raw.dados
          : Array.isArray(raw?.execucoes)
            ? raw.execucoes
            : Array.isArray(raw?.data)
              ? raw.data
              : [];
      return arr.map((e): ExecucaoCache => ({
        execucao_id: e?.execucao_id ?? e?.execucaoId ?? e?.id,
        data_hora: e?.data_hora ?? e?.dataHora ?? e?.created_at ?? e?.criado_em,
        modelo_id: e?.modelo_id ?? e?.modeloId,
        anomes_ini: e?.anomes_ini ?? e?.anomesIni,
        anomes_fim: e?.anomes_fim ?? e?.anomesFim,
        status: e?.status,
        registros_lidos: Number(e?.registros_lidos ?? e?.registrosLidos ?? 0) || 0,
        registros_gravados: Number(e?.registros_gravados ?? e?.registrosGravados ?? 0) || 0,
        tempo_ms: Number(e?.tempo_ms ?? e?.tempoMs ?? 0) || 0,
        erro: e?.erro ?? e?.mensagem_erro ?? null,
        raw: e,
      }));
    },
    enabled: params.enabled ?? true,
    retry: 0,
    staleTime: 10_000,
  });
}



export function useResultadoCache(
  modeloId: string,
  filtros: CacheFiltros,
  enabled = true,
) {
  return useQuery<unknown, Error, ComparativoResponseV2>({
    queryKey: ["contabil", "resultado-cache", "v3-drills", modeloId, filtros],
    queryFn: () =>
      api.get<unknown>(`/api/contabil/modelos/${modeloId}/resultado-cache`, {
        codemp: CODEMP,
        codfil: filtros.codfil ?? CODFIL,
        anomes_ini: filtros.anomes_ini,
        anomes_fim: filtros.anomes_fim,
        codccu: filtros.codccu,
        modo_balanco: filtros.modo_balanco,
        data_corte: filtros.data_corte ?? undefined,
        aplicar_referencia_senior: filtros.aplicar_referencia_senior ? true : undefined,
        expandir_resultado_exercicio: filtros.expandir_resultado_exercicio ? true : undefined,
        // Regra Senior: se não há codfil selecionado, força consolidado=true.
        consolidado:
          filtros.consolidado === true
            ? true
            : filtros.codfil == null
              ? true
              : undefined,
        // Padrão Senior: pede o menu de drills (REABRIR/CONSULTA) por linha.
        incluir_drills: true,
      }),

    enabled: enabled && isValidId(modeloId),
    retry: 0,
    staleTime: 10_000,
    placeholderData: (prev: unknown) => prev,
    select: (raw) => normalizeComparativo(raw, modeloId),
  });
}


// ============================================================
// Diagnóstico CTARED 0 (lançamentos sem conta contábil)
// ============================================================
export interface DiagnosticoCtaredZeroItem {
  ANOMES: number;
  CODEMP: number;
  CODFIL: number;
  NUMLOT?: number | string;
  NUMLCT?: number | string;
  DATLCT?: string;
  CTADEB?: number | string;
  CTACRE?: number | string;
  VLRLCT?: number;
  VALOR_CTARED_ZERO?: number;
  CPLLCT?: string;
  CTARED_CONTRAPARTIDA?: number | string;
  CLACTA_CONTRAPARTIDA?: string;
  DESCTA_CONTRAPARTIDA?: string;
}

export interface DiagnosticoCtaredZeroResponse {
  total: number;
  total_valor_ctared_zero: number;
  lancamentos: DiagnosticoCtaredZeroItem[];
}

export function useDiagnosticoCtaredZero(params: {
  enabled?: boolean;
  codemp?: number;
  codfil?: number;
  anomes_ini: number;
  anomes_fim: number;
}) {
  const codemp = params.codemp ?? CODEMP;
  const codfil = params.codfil ?? CODFIL;
  return useQuery<DiagnosticoCtaredZeroResponse>({
    queryKey: [
      "contabil",
      "diagnostico-ctared-zero",
      codemp,
      codfil,
      params.anomes_ini,
      params.anomes_fim,
    ],
    queryFn: async () => {
      const raw = await api.get<any>("/api/contabil/diagnostico/ctared-zero", {
        codemp,
        codfil,
        anomes_ini: params.anomes_ini,
        anomes_fim: params.anomes_fim,
      });
      const data = raw?.data ?? raw ?? {};
      const lancamentos: DiagnosticoCtaredZeroItem[] = Array.isArray(data?.dados)
        ? data.dados
        : Array.isArray(data?.lancamentos)
          ? data.lancamentos
          : Array.isArray(data)
            ? data
            : [];
      const total = Number(data?.total ?? lancamentos.length ?? 0);
      const total_valor = Number(
        data?.total_valor_ctared_zero ??
          lancamentos.reduce(
            (acc, it) => acc + Number(it?.VALOR_CTARED_ZERO ?? it?.VLRLCT ?? 0),
            0,
          ),
      );
      return { total, total_valor_ctared_zero: total_valor, lancamentos };
    },
    enabled:
      (params.enabled ?? true) &&
      Number.isFinite(params.anomes_ini) &&
      Number.isFinite(params.anomes_fim),
    retry: 0,
    staleTime: 30_000,
  });
}


// ============================================================
// Diagnóstico: Resultado do Exercício (linha VINCULAR do Balanço)
// ============================================================
export interface ResultadoExercicioContaOficial {
  codemp?: number;
  ctared?: number | string;
  clacta?: string;
  descta?: string;
}

export interface ResultadoExercicioHierarquiaItem {
  codigo: string;
  descricao: string;
}

export interface ResultadoExercicioMovimentoTransferencia {
  data?: string;
  valor?: number;
  descricao?: string;
}

export interface ResultadoExercicioDiagnostico {
  conta_oficial?: ResultadoExercicioContaOficial;
  hierarquia: ResultadoExercicioHierarquiaItem[];
  ativo: number | null;
  passivo_mais_pl: number | null;
  diferenca: number | null;
  resultado_exibido: number | null;
  fechamento: number | null;
  conta_zerada?: boolean;
  movimento_transferencia?: ResultadoExercicioMovimentoTransferencia | null;
  raw?: unknown;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function useResultadoExercicioDiagnostico(
  modeloId: string,
  params: {
    enabled?: boolean;
    codemp?: number;
    codfil?: number;
    anomes_ini: number;
    anomes_fim: number;
  },
) {
  const codemp = params.codemp ?? CODEMP;
  const codfil = params.codfil ?? CODFIL;
  return useQuery<ResultadoExercicioDiagnostico>({
    queryKey: [
      "contabil",
      "resultado-exercicio-diagnostico",
      modeloId,
      codemp,
      codfil,
      params.anomes_ini,
      params.anomes_fim,
    ],
    queryFn: async () => {
      const raw = await api.get<any>(
        `/api/contabil/modelos/${modeloId}/resultado-exercicio-diagnostico`,
        {
          codemp,
          codfil,
          anomes_ini: params.anomes_ini,
          anomes_fim: params.anomes_fim,
        },
      );
      const data = raw?.data ?? raw?.dados ?? raw ?? {};
      const conta = data?.conta_oficial ?? data?.conta ?? undefined;
      const hierarquiaRaw: any[] = Array.isArray(data?.hierarquia)
        ? data.hierarquia
        : [];
      const hierarquia = hierarquiaRaw.map((h: any) => ({
        codigo: String(h?.codigo ?? h?.clacta ?? ""),
        descricao: String(h?.descricao ?? h?.descta ?? ""),
      }));
      const ativo = num(data?.ativo ?? data?.total_ativo);
      const passivo_mais_pl = num(
        data?.passivo_mais_pl ?? data?.passivo_pl ?? data?.total_passivo_pl,
      );
      const diferenca = num(data?.diferenca);
      const resultado_exibido = num(
        data?.resultado_exibido ?? data?.resultado ?? data?.resultado_exercicio,
      );
      const fechamento = num(data?.fechamento ?? data?.fechamento_balanco);
      const mov = data?.movimento_transferencia ?? data?.transferencia ?? null;
      return {
        conta_oficial: conta
          ? {
              codemp: conta.codemp,
              ctared: conta.ctared,
              clacta: conta.clacta,
              descta: conta.descta,
            }
          : undefined,
        hierarquia,
        ativo,
        passivo_mais_pl,
        diferenca,
        resultado_exibido,
        fechamento,
        conta_zerada: data?.conta_zerada,
        movimento_transferencia: mov
          ? {
              data: mov.data ?? mov.datlct ?? mov.DATLCT,
              valor: num(mov.valor ?? mov.vlrlct ?? mov.VLRLCT) ?? undefined,
              descricao: mov.descricao ?? mov.historico,
            }
          : null,
        raw: data,
      };
    },
    enabled:
      (params.enabled ?? true) &&
      isValidId(modeloId) &&
      Number.isFinite(params.anomes_ini) &&
      Number.isFinite(params.anomes_fim),
    retry: 0,
    staleTime: 30_000,
  });
}

// ============================================================
// Composição da linha VINCULAR (Balanço → DRE)
// ============================================================
export type TipoRegistroComposicao =
  | "GRUPO"
  | "SUBTOTAL"
  | "TOTAL"
  | "CONTA_CONTABIL"
  | "AJUSTE";

export interface ComposicaoVincularLinha {
  tipo_registro: TipoRegistroComposicao;
  codigo_linha?: string | null;
  descricao_linha?: string | null;
  ctared?: number | null;
  clacta?: string | null;
  descta?: string | null;
  valor_acumulado_linha?: number | null;
  valor_conta?: number | null;
  ordem?: number | null;
  linha_pai_codigo?: string | null;
  [k: string]: unknown;
}

export interface ComposicaoVincularResponse {
  modelo_id?: string;
  anomes?: number;
  linhas: ComposicaoVincularLinha[];
  [k: string]: unknown;
}

export function useComposicaoVincular(
  modeloBalancoId: string,
  params: { codemp?: number; codfil?: number; anomes: number | null },
  enabled = true,
) {
  return useQuery<ComposicaoVincularResponse, Error>({
    queryKey: [
      "contabil",
      "composicao-vincular",
      modeloBalancoId,
      params.codemp ?? CODEMP,
      params.codfil ?? CODFIL,
      params.anomes,
    ],
    queryFn: () =>
      api.get<ComposicaoVincularResponse>(
        `/api/contabil/modelos/${modeloBalancoId}/linhas/VINCULAR/composicao`,
        {
          codemp: params.codemp ?? CODEMP,
          codfil: params.codfil ?? CODFIL,
          anomes: params.anomes ?? undefined,
        },
      ),
    enabled:
      enabled &&
      isValidId(modeloBalancoId) &&
      params.anomes != null &&
      Number.isFinite(Number(params.anomes)),
    retry: 0,
    staleTime: 10_000,
  });
}

// ============================================================
// Resultado pronto (snapshot Supabase) + materialização assíncrona
// ============================================================
import type {
  ComparativoResponseV2 as _CRV2,
  JobStatusResponse,
  ResultadoProntoResponse,
} from "@/types/contabil";

export interface ResultadoProntoMeta {
  status: ResultadoProntoResponse["status"];
  atualizado_em?: string | null;
  ultima_atualizacao?: string | null;
  origem?: string | null;
  fonte?: string | null;
  fonte_saldo?: string | null;
  fonte_oficial?: boolean | null;
  modo_balanco?: string | null;
  job_id?: string | null;
  aplicar_referencia_senior?: boolean | null;
  referencia_senior_aplicada?: boolean | null;
  referencia_senior_origem?: string | null;
  qtd_referencias_aplicadas?: number | null;
}


export interface UseResultadoProntoResult {
  data: _CRV2 | undefined;
  meta: ResultadoProntoMeta | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useResultadoPronto(
  modeloId: string,
  filtros: CacheFiltros,
  enabled = true,
): UseResultadoProntoResult {
  const query = useQuery<
    unknown,
    Error,
    { meta: ResultadoProntoMeta; payload: _CRV2 | undefined }
  >({
    queryKey: ["contabil", "resultado-pronto", "v2", modeloId, filtros],
    queryFn: () => {
      return api.get<unknown>(`/api/contabil/modelos/${modeloId}/resultado-pronto`, {
        codemp: CODEMP,
        codfil: filtros.codfil ?? CODFIL,
        anomes_ini: filtros.anomes_ini,
        anomes_fim: filtros.anomes_fim,
        codccu: filtros.codccu,
        tipo_modelo: filtros.tipo_modelo,
        modo_balanco: filtros.modo_balanco,
        data_corte: filtros.data_corte ?? undefined,
        consolidado:
          filtros.consolidado === undefined ? undefined : filtros.consolidado,
        aplicar_referencia_senior:
          filtros.aplicar_referencia_senior === undefined
            ? undefined
            : filtros.aplicar_referencia_senior,
        expandir_resultado_exercicio:
          filtros.expandir_resultado_exercicio === undefined
            ? undefined
            : filtros.expandir_resultado_exercicio,
        fonte_saldo: filtros.fonte_saldo ?? "E650SAL",
      });
    },

    enabled: enabled && isValidId(modeloId),
    retry: 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    placeholderData: (prev: unknown) => prev,
    select: (raw: any) => {
      const r = (raw && typeof raw === "object" && "dados" in raw ? raw.dados : raw) ?? {};
      const status = String(r.status ?? "SEM_CACHE").toUpperCase();
      const p = r.payload ?? {};
      const payloadNormalizado =
        status === "CONCLUIDO" && r.payload
          ? normalizeComparativo(r.payload, modeloId)
          : undefined;
      const aplicarRefSenior =
        r.aplicar_referencia_senior ?? p.aplicar_referencia_senior ?? payloadNormalizado?.aplicar_referencia_senior ?? null;
      const refAplicada =
        r.referencia_senior_aplicada ?? p.referencia_senior_aplicada ?? payloadNormalizado?.referencia_senior_aplicada ?? null;
      const refOrigem =
        r.referencia_senior_origem ?? p.referencia_senior_origem ?? payloadNormalizado?.referencia_senior_origem ?? null;
      const qtdRef =
        r.qtd_referencias_aplicadas ??
        r.qtdReferenciasAplicadas ??
        p.qtd_referencias_aplicadas ??
        p.qtdReferenciasAplicadas ??
        payloadNormalizado?.qtd_referencias_aplicadas ??
        null;
      const atualizado_em = r.atualizado_em ?? r.atualizadoEm ?? r.updated_at ?? r.ultima_atualizacao ?? null;
      const meta: ResultadoProntoMeta = {
        status,
        atualizado_em,
        ultima_atualizacao: r.ultima_atualizacao ?? atualizado_em,
        origem: r.origem ?? r.origin ?? p.origem ?? p.origin ?? payloadNormalizado?.origem ?? null,
        fonte: r.fonte ?? p.fonte ?? payloadNormalizado?.fonte ?? null,
        fonte_saldo:
          r.fonte_saldo ?? r.fonteSaldo ?? p.fonte_saldo ?? p.fonteSaldo ?? payloadNormalizado?.fonte_saldo ?? null,
        fonte_oficial:
          r.fonte_oficial ?? r.fonteOficial ?? p.fonte_oficial ?? p.fonteOficial ?? null,
        modo_balanco: r.modo_balanco ?? p.modo_balanco ?? null,
        job_id: r.job_id ?? r.jobId ?? null,
        aplicar_referencia_senior: aplicarRefSenior,
        referencia_senior_aplicada: refAplicada,
        referencia_senior_origem: refOrigem,
        qtd_referencias_aplicadas:
          qtdRef == null ? null : Number(qtdRef) || 0,
      };
      return { meta, payload: payloadNormalizado };
    },

  });
  return {
    data: query.data?.payload,
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export interface MaterializarResultadoResponse {
  job_id: string;
  status?: string;
}

export function useMaterializarResultado(modeloId: string) {
  return useMutation<MaterializarResultadoResponse, Error, CacheFiltros>({
    mutationFn: (filtros) => {
      requireId(modeloId);
      return api.post<MaterializarResultadoResponse>(
        `/api/contabil/modelos/${modeloId}/materializar-resultado`,
        {
          codemp: CODEMP,
          codfil: filtros.codfil ?? CODFIL,
          anomes_ini: filtros.anomes_ini,
          anomes_fim: filtros.anomes_fim,
          tipo_modelo: filtros.tipo_modelo,
          codccu: filtros.codccu ?? null,
          modo_balanco: filtros.modo_balanco,
          data_corte: filtros.data_corte ?? null,
          consolidado: filtros.consolidado ?? false,
          aplicar_referencia_senior:
            filtros.aplicar_referencia_senior ?? false,
          expandir_resultado_exercicio:
            filtros.expandir_resultado_exercicio ?? false,
          fonte_saldo: filtros.fonte_saldo ?? "E650SAL",
          recalcular: true,
          sincronizar_erp: true,
        },
      );
    },

    onError: (e: unknown) => {
      // 503 = falta service_role no backend. Não trava a UI, apenas avisa.
      const err = e as ApiError | Error;
      const status = (err as ApiError)?.status;
      const msg = (err as Error)?.message ?? "Falha ao materializar resultado.";
      if (status === 503) {
        toast.error(
          "Serviço temporariamente indisponível (backend sem chave de serviço). Tente novamente em instantes.",
        );
      } else {
        toast.error(msg);
      }
    },
  });
}

// ============================================================
// Atualizar cache Senior (limpa cache do período e sincroniza ERP)
// ============================================================
export interface AtualizarCacheSeniorPayload {
  anomes_ini: number;
  anomes_fim: number;
  codfil?: number | null;
  tipo: "DRE" | "BALANCO";
  limpar_periodo?: boolean;
  limpar_resultado?: boolean;
  modo_balanco?: import("@/types/contabil").ModoBalanco;
  data_corte?: string | null;
  aplicar_referencia_senior?: boolean;
}

export function useAtualizarCacheSenior(modeloId: string) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, AtualizarCacheSeniorPayload & { fonte_saldo?: string }>({
    mutationFn: (p) => {
      requireId(modeloId);
      return api.post<unknown>(
        `/api/contabil/modelos/${modeloId}/atualizar-cache`,
        {
          codemp: CODEMP,
          codfil: p.codfil ?? CODFIL,
          anomes_ini: p.anomes_ini,
          anomes_fim: p.anomes_fim,
          tipo: p.tipo,
          limpar_periodo: p.limpar_periodo ?? true,
          limpar_resultado: p.limpar_resultado ?? true,
          modo_balanco: p.modo_balanco,
          data_corte: p.data_corte ?? null,
          aplicar_referencia_senior: p.aplicar_referencia_senior ?? false,
          fonte_saldo: p.fonte_saldo ?? "E650SAL",
        },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contabil", "resultado-pronto", modeloId] });
      qc.invalidateQueries({ queryKey: ["contabil", "cache"] });
    },
    onError: handleError,
  });
}

// ============================================================
// Drill por conta contábil — auditoria de lançamentos (somente leitura).
// Não usar o total do drill para recalcular saldos do Balanço.
// ============================================================
export interface DrillLancamentosParams {
  /** Modelo/linha do snapshot — permite ao backend resolver contas vinculadas/descendentes. */
  modelo_id?: string;
  linha_id?: string;
  /** Alias camelCase usado por alguns componentes. */
  modeloId?: string;
  linhaId?: string;
  codemp?: number;
  codfil?: number | null;
  /** Mês específico (competência). Use OU anomes OU anomes_ini/anomes_fim. */
  anomes?: number;
  /** Início do intervalo acumulado. Use com anomes_fim. */
  anomes_ini?: number;
  /** Fim do intervalo acumulado. Use com anomes_ini. */
  anomes_fim?: number;
  /** Conta contábil analítica (drill de conta). */
  ctared?: number | string | null | undefined;
  /** Classificação sintética (drill de grupo). */
  clacta?: string | null;
  codccu?: string | null;
  centro_custo?: string | null;
  /** Até 5000. */
  limite?: number;
}

export interface DrillLancamentosResponse {
  dados: DrillLancamento[];
  movimento_liquido?: number | null;
  qtd_total?: number | null;
  qtd_exibida?: number | null;
  truncado?: boolean | null;
  fonte?: string | null;
  // ---- Novos campos do Razão / Extrato Contábil (opcionais até backend expor) ----
  meta?: {
    modelo_id?: string;
    linha_id?: string;
    ctared?: number | null;
    clacta?: string | null;
    descricao_conta?: string | null;
    data_ini?: string | null;
    data_fim?: string | null;
  } | null;
  saldo_inicial?: number | null;
  saldo_final?: number | null;
  total_debito?: number | null;
  total_credito?: number | null;
  itens?: any[] | null;
}


export function useDrillLancamentos(
  params: DrillLancamentosParams | null,
  enabled = true,
) {
  const modeloId = params?.modelo_id ?? params?.modeloId ?? null;
  const linhaId = params?.linha_id ?? params?.linhaId ?? null;
  const codemp = params?.codemp ?? CODEMP;
  const codfil = params?.codfil ?? CODFIL;
  const ctared =
    params?.ctared == null || params.ctared === "" ? null : Number(params.ctared);
  const clacta =
    params?.clacta == null || String(params.clacta).trim() === ""
      ? null
      : String(params.clacta).trim();
  const anomes = params?.anomes;
  const anomesIni = params?.anomes_ini;
  const anomesFim = params?.anomes_fim;
  const centroCusto = params?.centro_custo ?? params?.codccu ?? null;
  const usaRange =
    anomes == null &&
    anomesIni != null &&
    anomesFim != null &&
    Number.isFinite(Number(anomesIni)) &&
    Number.isFinite(Number(anomesFim));
  const usaMes = anomes != null && Number.isFinite(Number(anomes));
  const contaOk = ctared != null && Number.isFinite(ctared);
  const grupoOk = clacta != null;
  const linhaOk = Boolean(modeloId && linhaId);
  return useQuery<DrillLancamentosResponse>({
    queryKey: [
      "contabil",
      "drill-lancamentos",
      "v2",
      {
        modelo_id: modeloId,
        linha_id: linhaId,
        codemp,
        codfil,
        anomes,
        anomes_ini: anomesIni,
        anomes_fim: anomesFim,
        ctared,
        clacta,
        codccu: centroCusto,
        centro_custo: centroCusto,
        limite: params?.limite ?? 500,
      },
    ],
    queryFn: async () => {
      const raw = await api.get<any>(`/api/contabil/drill-lancamentos`, {
        modelo_id: modeloId ?? undefined,
        linha_id: linhaId ?? undefined,
        codemp,
        codfil,
        anomes: usaMes ? anomes : undefined,
        anomes_ini: usaRange ? anomesIni : undefined,
        anomes_fim: usaRange ? anomesFim : undefined,
        ctared: contaOk ? (ctared ?? undefined) : undefined,
        clacta: grupoOk ? clacta : undefined,
        codccu: centroCusto ?? undefined,
        centro_custo: centroCusto ?? undefined,
        limite: params?.limite ?? 500,
      });
      const dados: DrillLancamento[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.dados)
          ? raw.dados
          : Array.isArray(raw?.rows)
            ? raw.rows
            : Array.isArray(raw?.lancamentos)
              ? raw.lancamentos
              : [];
      const src = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
      const itens = Array.isArray(src.itens) ? src.itens : null;
      const registros = itens && itens.length ? (itens as DrillLancamento[]) : dados;
      return {
        dados: registros,
        movimento_liquido:
          src.movimento_liquido ?? src.movimentoLiquido ?? null,
        qtd_total: src.qtd_total ?? src.qtdTotal ?? null,
        qtd_exibida: src.qtd_exibida ?? src.qtdExibida ?? registros.length,
        truncado: src.truncado ?? null,
        fonte: src.fonte ?? null,
        meta: src.meta ?? null,
        saldo_inicial:
          typeof src.saldo_inicial === "number" ? src.saldo_inicial : null,
        saldo_final:
          typeof src.saldo_final === "number" ? src.saldo_final : null,
        total_debito:
          typeof src.total_debito === "number" ? src.total_debito : null,
        total_credito:
          typeof src.total_credito === "number" ? src.total_credito : null,
        itens: registros,
      };
    },

    enabled:
      enabled &&
      !!params &&
      (usaMes || usaRange) &&
      (linhaOk || contaOk || grupoOk),
    retry: 0,
    staleTime: 30_000,
  });
}

export function useJobStatus(jobId: string | null | undefined, enabled = true) {
  return useQuery<JobStatusResponse>({
    queryKey: ["contabil", "job", jobId],
    queryFn: async () => {
      const raw = await api.get<any>(`/api/contabil/jobs/${jobId}`);
      const d = raw?.dados ?? raw ?? {};
      const processados = Number(d.processados ?? d.processed ?? 0) || 0;
      const total = Number(d.total ?? d.total_itens ?? 0) || 0;
      const pctRaw = d.percentual ?? d.percent ?? d.progresso ?? null;
      const percentual =
        pctRaw == null
          ? total > 0
            ? Math.min(100, Math.round((processados / total) * 100))
            : null
          : Number(pctRaw);
      return {
        job_id: String(d.job_id ?? d.jobId ?? jobId),
        status: String(d.status ?? "PENDENTE").toUpperCase(),
        processados,
        total,
        percentual: Number.isFinite(percentual as number) ? percentual : null,
        etapa: d.etapa ?? d.step ?? null,
        mensagem: d.mensagem ?? d.message ?? null,
        erro: d.erro ?? d.error ?? null,
      } as JobStatusResponse;
    },
    enabled: enabled && !!jobId,
    retry: 0,
    refetchInterval: (q) => {
      const s = String(q.state.data?.status ?? "").toUpperCase();
      if (s === "CONCLUIDO" || s === "ERRO") return false;
      return 2000;
    },
  });
}



