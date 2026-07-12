import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_BASE_URL, CODEMP } from "@/lib/contabilConfig";
import type { Modelo } from "@/types/contabil";

export interface CriarBalancoSeniorInput {
  nome: string;
  descricao?: string;
  nivel_max?: number;
  modo?: "RESUMIDO" | "COMPLETO";
}

export interface CriarBalancoSeniorResumo {
  linhas_criadas: number;
  contas_vinculadas: number;
}

export interface CriarBalancoSeniorResult {
  modelo: Modelo;
  resumo: CriarBalancoSeniorResumo;
}

interface ApiResponse {
  ok?: boolean;
  modelo?: Modelo;
  resumo?: Partial<CriarBalancoSeniorResumo>;
  detail?: string;
  message?: string;
  error?: string;
}

const TIMEOUT_MS = 60_000;

export function useCriarBalancoPadraoSenior() {
  const qc = useQueryClient();
  return useMutation<CriarBalancoSeniorResult, Error, CriarBalancoSeniorInput>({
    mutationFn: async (input) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/contabil/modelos/criar-balanco-padrao-senior`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              codemp: CODEMP,
              nome: input.nome,
              descricao: input.descricao ?? "",
              classes: "1,2",
              nivel_max: input.nivel_max ?? 4,
              somente_ativas: true,
              modo: input.modo ?? "RESUMIDO",
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
          throw new Error(
            data?.detail ??
              data?.message ??
              data?.error ??
              `Erro ${res.status} ao criar Balanço Padrão Senior.`,
          );
        }
        if (!data || data.ok === false) {
          throw new Error(
            data?.detail ?? "Falha ao criar Balanço Padrão Senior.",
          );
        }
        const modelo = data.modelo;
        if (!modelo?.id) {
          throw new Error("Resposta inválida da API: modelo sem id.");
        }
        const resumo: CriarBalancoSeniorResumo = {
          linhas_criadas: Number(data.resumo?.linhas_criadas ?? 0),
          contas_vinculadas: Number(data.resumo?.contas_vinculadas ?? 0),
        };
        return { modelo, resumo };
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") {
          throw new Error(
            "A criação demorou mais que o esperado. Verifique se a API está ativa e tente novamente.",
          );
        }
        throw e;
      } finally {
        clearTimeout(timer);
      }
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelos"] });
      qc.invalidateQueries({ queryKey: ["contabil", "modelo", r.modelo.id] });
      qc.invalidateQueries({ queryKey: ["linhas", r.modelo.id] });
      qc.invalidateQueries({ queryKey: ["contas-vinculadas", r.modelo.id] });
      toast.success("Balanço Padrão Senior criado com sucesso.", {
        description: `Linhas criadas: ${r.resumo.linhas_criadas} · Contas vinculadas: ${r.resumo.contas_vinculadas}`,
      });
    },
    onError: (e) =>
      toast.error(e.message ?? "Erro ao criar Balanço Padrão Senior."),
  });
}

