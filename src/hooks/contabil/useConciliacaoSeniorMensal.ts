import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/contabilApi";
import { CODEMP, CODFIL } from "@/lib/contabilConfig";

export interface LinhaConciliacaoSeniorMensal {
  codigo: string;
  descricao: string;
  conta_contabil?: string | number | null;
  ordem?: number | null;
  valor_sistema_e650sal?: number | null;
  valor_senior?: number | null;
  diferenca?: number | null;
}

export interface ConciliacaoSeniorMensalResponse {
  modelo_id: string;
  codemp: number;
  codfil: number;
  anomes: number;
  linhas: LinhaConciliacaoSeniorMensal[];
}

export function useConciliacaoSeniorMensal(
  params: { modelo_id?: string; anomes?: number; codemp?: number; codfil?: number },
  enabled = true,
) {
  const { modelo_id, anomes } = params;
  const codemp = params.codemp ?? CODEMP;
  const codfil = params.codfil ?? CODFIL;
  return useQuery({
    queryKey: [
      "contabil",
      "conciliacao-senior-mensal",
      modelo_id,
      codemp,
      codfil,
      anomes,
    ],
    queryFn: async (): Promise<ConciliacaoSeniorMensalResponse> => {
      const raw = await api.get<
        | ConciliacaoSeniorMensalResponse
        | { linhas?: LinhaConciliacaoSeniorMensal[] }
        | LinhaConciliacaoSeniorMensal[]
      >(
        `/api/contabil/modelos/${modelo_id}/conciliacao-senior-mensal`,
        { codemp, codfil, anomes },
      );
      const linhas: LinhaConciliacaoSeniorMensal[] = Array.isArray(raw)
        ? raw
        : ((raw as { linhas?: LinhaConciliacaoSeniorMensal[] }).linhas ?? []);
      return {
        modelo_id: modelo_id!,
        codemp,
        codfil,
        anomes: anomes!,
        linhas,
      };
    },
    enabled: enabled && !!modelo_id && !!anomes,
    retry: (count, e) => {
      const err = e as ApiError;
      if (err?.status === 404) return false;
      return count < 1;
    },
    staleTime: 10_000,
  });
}
