import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/contabilApi";
import * as store from "@/lib/contabilStore";
import { normalizarItem } from "@/lib/estruturasPadrao";
import type { Modelo } from "@/types/contabil";

export interface CriarDREPadraoInput {
  nome: string;
  descricao?: string;
}

export interface CriarDREPadraoResult {
  modelo: Modelo;
  total: number;
  falhas: number;
}

async function viaEndpointDedicado(input: CriarDREPadraoInput): Promise<Modelo | null> {
  try {
    const raw = await api.post<any>("/api/contabil/modelos/criar-padrao", {
      nome: input.nome,
      descricao: input.descricao ?? null,
      tipo_modelo: "DRE",
    });
    const m = (raw?.dados ?? raw?.modelo ?? raw) as Modelo;
    return m?.id ? m : null;
  } catch (e) {
    const err = e as ApiError;
    if (err?.status === 404 || err?.status === 405 || err?.status === 501) {
      return null; // fallback
    }
    throw e;
  }
}

async function viaFallback(input: CriarDREPadraoInput): Promise<CriarDREPadraoResult> {
  const modelo = await store.createModelo({
    nome: input.nome,
    descricao: input.descricao,
    tipo_modelo: "DRE",
    ativo: true,
  });

  const raw = await api.get<unknown>("/api/contabil/estrutura-padrao", {
    tipo_modelo: "DRE",
  });
  const lista = Array.isArray(raw)
    ? raw
    : ((raw as { dados?: unknown[] })?.dados ?? []);
  const itens = (lista as Array<Record<string, unknown>>).map(normalizarItem);

  let falhas = 0;
  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    const ordem = item.ordem_sugerida ?? (i + 1) * 10;
    try {
      await store.createLinha(modelo.id, {
        linha_pai_id: null,
        ordem,
        codigo: item.codigo,
        descricao: item.descricao,
        tipo_linha: item.tipo_linha,
        natureza: item.natureza,
        operador: item.operador,
        sinal: item.sinal,
        negrito: item.negrito,
        exibir: item.exibir,
      });
    } catch {
      falhas++;
    }
  }

  return { modelo, total: itens.length, falhas };
}

export function useCriarDREPadrao() {
  const qc = useQueryClient();
  return useMutation<CriarDREPadraoResult, Error, CriarDREPadraoInput>({
    mutationFn: async (input) => {
      const direto = await viaEndpointDedicado(input);
      if (direto) {
        return { modelo: direto, total: 0, falhas: 0 };
      }
      return viaFallback(input);
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelos"] });
      qc.invalidateQueries({ queryKey: ["contabil", "modelo", r.modelo.id] });
      if (r.falhas > 0) {
        toast.warning(
          `DRE Padrão criada com ${r.total - r.falhas} de ${r.total} linhas. Revise a estrutura.`,
        );
      } else if (r.total > 0) {
        toast.success(`DRE Padrão criada com ${r.total} linhas.`);
      } else {
        toast.success("DRE Padrão criada.");
      }
    },
    onError: (e) => toast.error(e.message ?? "Erro ao criar DRE Padrão."),
  });
}
