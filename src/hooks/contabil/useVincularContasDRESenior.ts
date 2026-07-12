import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_BASE_URL, CODEMP } from "@/lib/contabilConfig";

export interface VincularContasDREInput {
  nivel_max?: number;
}

export interface VincularContasDREResumo {
  contas_lidas: number;
  linhas_criadas: number;
  contas_vinculadas: number;
  contas_ja_existentes: number;
  contas_ignoradas?: number;
}

interface ApiResponse {
  ok?: boolean;
  resumo?: Partial<VincularContasDREResumo>;
  contas_lidas?: number;
  linhas_criadas?: number;
  contas_vinculadas?: number;
  contas_ja_existentes?: number;
  contas_ignoradas?: number;
  detail?: string;
  message?: string;
  error?: string;
}

const TIMEOUT_MS = 60_000;

/**
 * Solicita à API que vincule automaticamente as contas analíticas do plano
 * Senior (E045PLA) a um modelo de DRE existente — endpoint específico de DRE.
 */
export function useVincularContasDRESenior(modeloId: string) {
  const qc = useQueryClient();
  return useMutation<VincularContasDREResumo, Error, VincularContasDREInput | void>({
    mutationFn: async (input) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/contabil/modelos/${modeloId}/vincular-contas-dre-senior`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              codemp: CODEMP,
              nivel_max: input?.nivel_max ?? 9,
              somente_ativas: true,
              somente_analiticas: true,
              criar_linhas_analiticas: true,
              reordenar_linhas: true,
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
            `Erro ${res.status} ao vincular contas da DRE.`;
          if (res.status === 404) {
            throw new Error(
              "Endpoint /vincular-contas-dre-senior não disponível na API. Solicite ao backend a publicação desse endpoint.",
            );
          }
          throw new Error(baseMsg);
        }
        if (!data || data.ok === false) {
          throw new Error(data?.detail ?? "Falha ao vincular contas da DRE.");
        }
        const pick = (k: keyof VincularContasDREResumo) =>
          Number((data!.resumo as any)?.[k] ?? (data as any)?.[k] ?? 0);
        return {
          contas_lidas: pick("contas_lidas"),
          linhas_criadas: pick("linhas_criadas"),
          contas_vinculadas: pick("contas_vinculadas"),
          contas_ja_existentes: pick("contas_ja_existentes"),
          contas_ignoradas: pick("contas_ignoradas"),
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
      qc.invalidateQueries({ queryKey: ["contabil", "resultado-cache", modeloId] });
      qc.invalidateQueries({ queryKey: ["contabil", "resultado-pronto", modeloId] });
      const partes = [
        `Contas lidas: ${r.contas_lidas}`,
        `Linhas criadas: ${r.linhas_criadas}`,
        `Contas vinculadas: ${r.contas_vinculadas}`,
        `Já existentes: ${r.contas_ja_existentes}`,
      ];
      if (r.contas_ignoradas && r.contas_ignoradas > 0) {
        partes.push(`Ignoradas: ${r.contas_ignoradas}`);
      }
      toast.success(`Contas da DRE vinculadas com sucesso. ${partes.join(" · ")}`);
    },
    onError: (e) => toast.error(e.message ?? "Erro ao vincular contas da DRE."),
  });
}
