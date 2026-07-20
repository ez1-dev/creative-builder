import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_BASE_URL, CODEMP } from "@/lib/contabilConfig";

export interface VincularContasBalancoInput {
  nivel_max?: number;
}

export interface VincularContasBalancoResumo {
  linhas_criadas: number;
  contas_vinculadas: number;
  contas_lidas_senior?: number;
  contas_ja_existentes?: number;
  linhas_reordenadas?: number;
}

interface ApiResponse {
  ok?: boolean;
  resumo?: Partial<VincularContasBalancoResumo>;
  linhas_criadas?: number;
  contas_vinculadas?: number;
  contas_lidas_senior?: number;
  contas_ja_existentes?: number;
  linhas_reordenadas?: number;
  detail?: string;
  message?: string;
  error?: string;
}

const TIMEOUT_MS = 60_000;

/**
 * Solicita à API que vincule automaticamente as contas analíticas do plano
 * Senior (E045PLA) a um modelo de Balanço existente — sem recriar o modelo.
 * O Lovable apenas dispara a chamada e mostra o resumo; a API faz todo o
 * trabalho de criar as folhas analíticas e amarrar as contas.
 */
export function useVincularContasBalancoSenior(modeloId: string) {
  const qc = useQueryClient();
  return useMutation<VincularContasBalancoResumo, Error, VincularContasBalancoInput | void>({
    mutationFn: async (input?: VincularContasBalancoInput) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/contabil/modelos/${modeloId}/vincular-contas-senior`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              codemp: CODEMP,
              classes: "1,2",
              nivel_max: input?.nivel_max ?? 9,
              somente_ativas: true,
              somente_analiticas: true,
              criar_linhas_analiticas: true,
            }),
          },
        );
        let data: ApiResponse | null = null;
        try {
          data = (await res.json()) as ApiResponse;
        } catch {
          /* ignore */
        }
        if (!res.ok) {
          const baseMsg =
            data?.detail ??
            data?.message ??
            data?.error ??
            `Erro ${res.status} ao vincular contas ao Balanço.`;
          if (res.status === 404) {
            throw new Error(
              "Endpoint /vincular-contas-senior não disponível na API. Solicite ao backend a publicação desse endpoint ou recrie o modelo em modo COMPLETO.",
            );
          }
          throw new Error(baseMsg);
        }
        if (!data || data.ok === false) {
          throw new Error(data?.detail ?? "Falha ao vincular contas ao Balanço.");
        }
        return {
          linhas_criadas: Number(
            data.resumo?.linhas_criadas ?? data.linhas_criadas ?? 0,
          ),
          contas_vinculadas: Number(
            data.resumo?.contas_vinculadas ?? data.contas_vinculadas ?? 0,
          ),
        };
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") {
          throw new Error(
            "A vinculação demorou mais que o esperado. Verifique se a API está ativa e tente novamente.",
          );
        }
        throw e;
      } finally {
        clearTimeout(timer);
      }
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelo", modeloId] });
      qc.invalidateQueries({ queryKey: ["linhas", modeloId] });
      qc.invalidateQueries({ queryKey: ["contas-vinculadas", modeloId] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "contabil" && q.queryKey[1] === "resultado-cache" && q.queryKey.includes(modeloId) });
      qc.invalidateQueries({ queryKey: ["contabil", "resultado-pronto", modeloId] });
      toast.success(
        `Contas vinculadas com sucesso. Linhas criadas: ${r.linhas_criadas}. Contas vinculadas: ${r.contas_vinculadas}.`,
      );
    },
    onError: (e) =>
      toast.error(e.message ?? "Erro ao vincular contas ao Balanço."),
  });
}
