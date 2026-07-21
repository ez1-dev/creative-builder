import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/contabilApi";
import { CODEMP } from "@/lib/contabilConfig";

// ============================================================
// Tipos
// ============================================================
export interface ModeloOficialInfo {
  id: string;
  nome: string;
  tipo_modelo: string;
  ativo: boolean;
  qtd_linhas?: number;
  qtd_contas_vinculadas?: number;
}

export type ContabilPendenciaCodigo =
  | "NAO_DEFINIDO"
  | "MODELO_INEXISTENTE"
  | "MODELO_INATIVO"
  | "MODELO_SEM_VINCULOS"
  | (string & {});

export interface ContabilPendencia {
  codigo: ContabilPendenciaCodigo;
  tipo?: "DRE" | "BALANCO" | string;
  mensagem?: string;
}

export interface ContabilConfiguracaoResponse {
  codemp: number;
  dre_modelo_padrao_id: string | null;
  balanco_modelo_padrao_id: string | null;
  dre_modelo_padrao?: ModeloOficialInfo | null;
  balanco_modelo_padrao?: ModeloOficialInfo | null;
  modelos_disponiveis?: ModeloOficialInfo[];
  pendencias?: ContabilPendencia[];
  /** Marcador quando o backend indicou que a config ainda não foi criada (204/pré-migration). */
  vazia?: boolean;
}

// ============================================================
// GET /api/contabil/configuracao
// ============================================================
async function fetchConfiguracao(codemp: number): Promise<ContabilConfiguracaoResponse> {
  try {
    const raw = await api.get<any>("/api/contabil/configuracao", { codemp });
    const src = raw?.data ?? raw ?? {};
    return {
      codemp: Number(src?.codemp ?? codemp) || codemp,
      dre_modelo_padrao_id: src?.dre_modelo_padrao_id ?? null,
      balanco_modelo_padrao_id: src?.balanco_modelo_padrao_id ?? null,
      dre_modelo_padrao: src?.dre_modelo_padrao ?? null,
      balanco_modelo_padrao: src?.balanco_modelo_padrao ?? null,
      modelos_disponiveis: Array.isArray(src?.modelos_disponiveis) ? src.modelos_disponiveis : [],
      pendencias: Array.isArray(src?.pendencias) ? src.pendencias : [],
    };
  } catch (e) {
    const err = e as ApiError;
    // Compat: endpoint ainda não publicado → estado vazio (não quebra).
    if (err?.status === 404) {
      return {
        codemp,
        dre_modelo_padrao_id: null,
        balanco_modelo_padrao_id: null,
        modelos_disponiveis: [],
        pendencias: [
          { codigo: "NAO_DEFINIDO", tipo: "DRE" },
          { codigo: "NAO_DEFINIDO", tipo: "BALANCO" },
        ],
        vazia: true,
      };
    }
    throw err;
  }
}

export function useContabilConfiguracao(codemp: number = CODEMP) {
  return useQuery({
    queryKey: ["contabil-configuracao", codemp],
    queryFn: () => fetchConfiguracao(codemp),
    enabled: Boolean(codemp),
    staleTime: 60_000,
    retry: 0,
  });
}

// ============================================================
// Helpers
// ============================================================
export function resolverPendencia(
  cfg: ContabilConfiguracaoResponse | undefined,
  tipo: "DRE" | "BALANCO",
): ContabilPendencia | null {
  if (!cfg) return null;
  const arr = cfg.pendencias ?? [];
  // Match por tipo, se o backend enviar; caso contrário, inferir pela ausência do id.
  const porTipo = arr.find(
    (p) => String(p.tipo ?? "").toUpperCase() === tipo,
  );
  if (porTipo) return porTipo;
  const id = tipo === "DRE" ? cfg.dre_modelo_padrao_id : cfg.balanco_modelo_padrao_id;
  if (!id) return { codigo: "NAO_DEFINIDO", tipo };
  return null;
}

export function modelosPorTipo(
  cfg: ContabilConfiguracaoResponse | undefined,
  tipo: "DRE" | "BALANCO",
): ModeloOficialInfo[] {
  const lista = cfg?.modelos_disponiveis ?? [];
  const alvos = tipo === "DRE" ? ["DRE"] : ["BALANCO", "BALANÇO"];
  return lista.filter((m) =>
    alvos.includes(String(m.tipo_modelo ?? "").toUpperCase()),
  );
}

// ============================================================
// PUT /api/contabil/configuracao
// ============================================================
export interface AtualizarConfiguracaoInput {
  codemp?: number;
  dre_modelo_padrao_id?: string | null;
  balanco_modelo_padrao_id?: string | null;
}

export function useAtualizarContabilConfiguracao(codemp: number = CODEMP) {
  const qc = useQueryClient();
  return useMutation<ContabilConfiguracaoResponse, Error, AtualizarConfiguracaoInput>({
    mutationFn: async (input) => {
      const payload = { codemp, ...input };
      try {
        return await api.put<ContabilConfiguracaoResponse>(
          "/api/contabil/configuracao",
          payload,
        );
      } catch (e) {
        const err = e as ApiError;
        const detail =
          (err?.data as any)?.detail ??
          (err?.data as any)?.message ??
          err?.message ??
          "Não foi possível salvar a configuração.";
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contabil-configuracao", codemp] });
      qc.invalidateQueries({ queryKey: ["dre-matriz"] });
      qc.invalidateQueries({ queryKey: ["balanco-resultado"] });
      qc.invalidateQueries({ queryKey: ["contabil-modelos"] });
      qc.invalidateQueries({ queryKey: ["contabil", "resultado-pronto"] });
      qc.invalidateQueries({ queryKey: ["contabil", "modelos"] });
      toast.success("Configuração contábil atualizada com sucesso.");
    },
    onError: (e) => toast.error(e.message),
  });
}
