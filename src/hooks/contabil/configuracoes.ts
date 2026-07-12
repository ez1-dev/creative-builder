import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/contabilApi";
import { CODEMP, CODFIL } from "@/lib/contabilConfig";

// ============================================================
// Snapshots (listagem global de materializações)
// ============================================================
export interface SnapshotItem {
  modelo_id: string;
  modelo_nome?: string | null;
  tipo_modelo?: "DRE" | "BALANCO" | string | null;
  codemp?: number | null;
  codfil?: number | null;
  anomes_ini?: number | null;
  anomes_fim?: number | null;
  status?: string | null;
  atualizado_em?: string | null;
  origem?: string | null;
}

export function useSnapshotsList(params?: {
  codemp?: number;
  codfil?: number | null;
  tipo_modelo?: "DRE" | "BALANCO";
}) {
  const codemp = params?.codemp ?? CODEMP;
  return useQuery<{ items: SnapshotItem[]; unavailable: boolean }>({
    queryKey: ["contabil", "configuracoes", "snapshots", codemp, params?.codfil ?? null, params?.tipo_modelo ?? null],
    queryFn: async () => {
      try {
        const raw = await api.get<any>("/api/contabil/snapshots", {
          codemp,
          codfil: params?.codfil ?? undefined,
          tipo_modelo: params?.tipo_modelo,
        });
        const arr: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.dados)
            ? raw.dados
            : Array.isArray(raw?.items)
              ? raw.items
              : [];
        return {
          unavailable: false,
          items: arr.map((s): SnapshotItem => ({
            modelo_id: String(s?.modelo_id ?? s?.modeloId ?? ""),
            modelo_nome: s?.modelo_nome ?? s?.nome ?? null,
            tipo_modelo: s?.tipo_modelo ?? s?.tipo ?? null,
            codemp: s?.codemp ?? null,
            codfil: s?.codfil ?? null,
            anomes_ini: s?.anomes_ini ?? null,
            anomes_fim: s?.anomes_fim ?? null,
            status: s?.status ?? null,
            atualizado_em: s?.atualizado_em ?? s?.updated_at ?? null,
            origem: s?.origem ?? null,
          })),
        };
      } catch (e) {
        if ((e as ApiError)?.status === 404) {
          return { unavailable: true, items: [] };
        }
        throw e;
      }
    },
    retry: 0,
    staleTime: 15_000,
  });
}

export function useLimparSnapshot(modeloId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.del<{ ok?: boolean }>(`/api/contabil/modelos/${modeloId}/snapshot`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contabil", "resultado-pronto", modeloId] });
      qc.invalidateQueries({ queryKey: ["contabil", "configuracoes", "snapshots"] });
      toast.success("Snapshot removido.");
    },
    onError: (e: Error) => toast.error(e.message ?? "Falha ao remover snapshot."),
  });
}

// ============================================================
// Vínculos de conta
// ============================================================
export function useClonarVinculosOficial(modeloId: string) {
  const qc = useQueryClient();
  return useMutation<{ vinculos_clonados?: number }, Error, void>({
    mutationFn: async () => {
      try {
        return await api.post<{ vinculos_clonados?: number }>(
          `/api/contabil/modelos/${modeloId}/clonar-vinculos-oficial`,
          { codemp: CODEMP },
        );
      } catch (e) {
        if ((e as ApiError)?.status === 404) {
          throw new Error(
            "Endpoint /clonar-vinculos-oficial não disponível na API. Solicite ao backend a publicação.",
          );
        }
        throw e;
      }
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["contabil", "modelo", modeloId] });
      qc.invalidateQueries({ queryKey: ["contabil", "resultado-pronto", modeloId] });
      toast.success(
        `Vínculos clonados${r?.vinculos_clonados != null ? `: ${r.vinculos_clonados}` : "."}`,
      );
    },
    onError: (e) => toast.error(e.message),
  });
}

export interface ValidacaoVinculos {
  contas_sem_vinculo?: number;
  contas_duplicadas?: number;
  contas_ctared_zero?: number;
  detalhes?: Array<{ codigo?: string; descricao?: string; motivo?: string }>;
}

export function useValidarVinculos(modeloId: string, enabled = false) {
  return useQuery<{ data: ValidacaoVinculos | null; unavailable: boolean }>({
    queryKey: ["contabil", "configuracoes", "validar-vinculos", modeloId],
    queryFn: async () => {
      try {
        const raw = await api.get<any>(
          `/api/contabil/modelos/${modeloId}/validar-vinculos`,
          { codemp: CODEMP },
        );
        const d = raw?.dados ?? raw ?? {};
        return {
          unavailable: false,
          data: {
            contas_sem_vinculo: Number(d.contas_sem_vinculo ?? 0) || 0,
            contas_duplicadas: Number(d.contas_duplicadas ?? 0) || 0,
            contas_ctared_zero: Number(d.contas_ctared_zero ?? 0) || 0,
            detalhes: Array.isArray(d.detalhes) ? d.detalhes : [],
          },
        };
      } catch (e) {
        if ((e as ApiError)?.status === 404) {
          return { unavailable: true, data: null };
        }
        throw e;
      }
    },
    enabled: enabled && !!modeloId,
    retry: 0,
  });
}

// ============================================================
// Referência Senior oficial
// ============================================================
export interface ReferenciaSeniorItem {
  modelo_id?: string;
  modelo_nome?: string | null;
  tipo_modelo?: string | null;
  anomes?: number;
  codigo?: string;
  descricao?: string | null;
  valor?: number | null;
  origem?: string | null;
}

export function useReferenciaSeniorList(params?: { anomes?: number; modelo_id?: string }) {
  return useQuery<{ items: ReferenciaSeniorItem[]; unavailable: boolean }>({
    queryKey: ["contabil", "configuracoes", "referencia-senior", params?.anomes ?? null, params?.modelo_id ?? null],
    queryFn: async () => {
      try {
        const raw = await api.get<any>("/api/contabil/referencia-senior", {
          codemp: CODEMP,
          anomes: params?.anomes,
          modelo_id: params?.modelo_id,
        });
        const arr: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.dados)
            ? raw.dados
            : Array.isArray(raw?.items)
              ? raw.items
              : [];
        return {
          unavailable: false,
          items: arr.map((s): ReferenciaSeniorItem => ({
            modelo_id: s?.modelo_id ?? s?.modeloId,
            modelo_nome: s?.modelo_nome ?? s?.nome ?? null,
            tipo_modelo: s?.tipo_modelo ?? null,
            anomes: Number(s?.anomes ?? 0) || undefined,
            codigo: String(s?.codigo ?? ""),
            descricao: s?.descricao ?? null,
            valor: s?.valor != null ? Number(s.valor) : null,
            origem: s?.origem ?? null,
          })),
        };
      } catch (e) {
        if ((e as ApiError)?.status === 404) return { unavailable: true, items: [] };
        throw e;
      }
    },
    retry: 0,
    staleTime: 30_000,
  });
}

export function useReplicarReferenciaSenior() {
  const qc = useQueryClient();
  return useMutation<{ modelos_atualizados?: number }, Error, { anomes?: number } | undefined>({
    mutationFn: async (input) => {
      try {
        return await api.post<{ modelos_atualizados?: number }>(
          "/api/contabil/referencia-senior/replicar",
          { codemp: CODEMP, anomes: input?.anomes },
        );
      } catch (e) {
        if ((e as ApiError)?.status === 404) {
          throw new Error("Endpoint /referencia-senior/replicar não disponível na API.");
        }
        throw e;
      }
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["contabil", "configuracoes", "referencia-senior"] });
      qc.invalidateQueries({ queryKey: ["contabil", "resultado-pronto"] });
      toast.success(
        `Referência replicada${r?.modelos_atualizados != null ? ` em ${r.modelos_atualizados} modelos.` : "."}`,
      );
    },
    onError: (e) => toast.error(e.message),
  });
}

export interface ReferenciaValidacao {
  codigo: string;
  ok: boolean;
  observacao?: string | null;
}

export function useValidarReferenciaSenior(params: { anomes?: number; enabled?: boolean }) {
  return useQuery<{ items: ReferenciaValidacao[]; unavailable: boolean }>({
    queryKey: ["contabil", "configuracoes", "validar-referencia", params?.anomes ?? null],
    queryFn: async () => {
      try {
        const raw = await api.get<any>("/api/contabil/referencia-senior/validar", {
          codemp: CODEMP,
          anomes: params?.anomes,
        });
        const arr: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.dados) ? raw.dados : [];
        return {
          unavailable: false,
          items: arr.map((it): ReferenciaValidacao => ({
            codigo: String(it?.codigo ?? ""),
            ok: !!it?.ok,
            observacao: it?.observacao ?? it?.mensagem ?? null,
          })),
        };
      } catch (e) {
        if ((e as ApiError)?.status === 404) return { unavailable: true, items: [] };
        throw e;
      }
    },
    enabled: params?.enabled ?? false,
    retry: 0,
  });
}

// ============================================================
// Agendamentos
// ============================================================
export type FrequenciaAgendamento = "MANUAL" | "HORARIA" | "DIARIA";

export interface AgendamentoItem {
  id?: string;
  modelo_id?: string | null;
  modelo_nome?: string | null;
  tipo_modelo?: "DRE" | "BALANCO" | string | null;
  frequencia: FrequenciaAgendamento;
  hora?: string | null; // HH:MM
  ativo: boolean;
  ultima_execucao?: string | null;
  proxima_execucao?: string | null;
}

export function useAgendamentos() {
  return useQuery<{ items: AgendamentoItem[]; unavailable: boolean }>({
    queryKey: ["contabil", "configuracoes", "agendamentos"],
    queryFn: async () => {
      try {
        const raw = await api.get<any>("/api/contabil/agendamentos", { codemp: CODEMP });
        const arr: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.dados)
            ? raw.dados
            : Array.isArray(raw?.items)
              ? raw.items
              : [];
        return {
          unavailable: false,
          items: arr.map((a): AgendamentoItem => ({
            id: a?.id,
            modelo_id: a?.modelo_id ?? null,
            modelo_nome: a?.modelo_nome ?? null,
            tipo_modelo: a?.tipo_modelo ?? null,
            frequencia: String(a?.frequencia ?? "MANUAL").toUpperCase() as FrequenciaAgendamento,
            hora: a?.hora ?? null,
            ativo: !!a?.ativo,
            ultima_execucao: a?.ultima_execucao ?? null,
            proxima_execucao: a?.proxima_execucao ?? null,
          })),
        };
      } catch (e) {
        if ((e as ApiError)?.status === 404) return { unavailable: true, items: [] };
        throw e;
      }
    },
    retry: 0,
  });
}

export function useSalvarAgendamento() {
  const qc = useQueryClient();
  return useMutation<AgendamentoItem, Error, AgendamentoItem>({
    mutationFn: async (item) => {
      try {
        if (item.id) {
          return await api.put<AgendamentoItem>(`/api/contabil/agendamentos/${item.id}`, item);
        }
        return await api.post<AgendamentoItem>(`/api/contabil/agendamentos`, item);
      } catch (e) {
        if ((e as ApiError)?.status === 404) {
          throw new Error("Endpoint /agendamentos não disponível na API.");
        }
        throw e;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contabil", "configuracoes", "agendamentos"] });
      toast.success("Agendamento salvo.");
    },
    onError: (e) => toast.error(e.message),
  });
}
