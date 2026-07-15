import { supabase } from "@/integrations/supabase/client";

// ============ Tipos ============

export type EscopoSnapshot = "oficial" | "pessoal";

export interface DreLinhaEditavel {
  id?: string;
  ordem: number;
  codigo_linha: string;
  descricao: string;
  nivel: number;
  linha_pai_codigo: string | null;
  tipo_linha: "ANALITICA" | "SUBTOTAL" | "TOTAL" | "FORMULA" | "GRUPO";
  formula: string | null;
  ativo: boolean;
  flag_soma: boolean;
  flag_inverte_sinal: boolean;
  flag_exibe_dre: boolean;
  flag_permite_drill: boolean;
  flag_negrito: boolean;
  flag_totalizadora: boolean;
}

export interface BalancoLinhaEditavel {
  id?: string;
  ordem: number;
  mascara: string;
  descricao: string;
  nivel: number;
  sinal: number;
  totalizadora: boolean;
  ativo: boolean;
}

export interface DreSnapshot {
  id: string;
  modelo_id: string;
  nome: string;
  descricao: string | null;
  escopo: EscopoSnapshot;
  owner_id: string | null;
  criado_por: string | null;
  versao_origem: number | null;
  created_at: string;
}

export interface BalancoSnapshot {
  id: string;
  nome: string;
  descricao: string | null;
  escopo: EscopoSnapshot;
  owner_id: string | null;
  criado_por: string | null;
  created_at: string;
}

// ============ DRE — Oficial ============

export async function carregarDreOficial(modeloId: string): Promise<DreLinhaEditavel[]> {
  const { data, error } = await supabase
    .from("bi_dre_estrutura_v2")
    .select("*")
    .eq("modelo_id", modeloId)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []) as any as DreLinhaEditavel[];
}

// ============ DRE — Rascunho ============

export async function carregarDreRascunho(modeloId: string): Promise<{ linhas: DreLinhaEditavel[]; base_versao: number | null } | null> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("bi_dre_estrutura_rascunho")
    .select("linhas, base_versao")
    .eq("user_id", uid)
    .eq("modelo_id", modeloId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { linhas: (data.linhas as any) ?? [], base_versao: (data as any).base_versao ?? null };
}

export async function salvarDreRascunho(modeloId: string, linhas: DreLinhaEditavel[], baseVersao: number | null): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase
    .from("bi_dre_estrutura_rascunho")
    .upsert(
      { user_id: uid, modelo_id: modeloId, linhas: linhas as any, base_versao: baseVersao },
      { onConflict: "user_id,modelo_id" },
    );
  if (error) throw error;
}

export async function descartarDreRascunho(modeloId: string): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return;
  await supabase.from("bi_dre_estrutura_rascunho").delete().eq("user_id", uid).eq("modelo_id", modeloId);
}

export async function publicarDreRascunho(modeloId: string, baseVersao: number | null): Promise<string> {
  const { data, error } = await supabase.rpc("dre_publicar_rascunho", {
    _modelo_id: modeloId,
    _base_versao: baseVersao ?? undefined,
  } as any);
  if (error) throw error;
  return data as string;
}

// ============ DRE — Snapshots ============

export async function listarDreSnapshots(modeloId: string): Promise<DreSnapshot[]> {
  const { data, error } = await supabase
    .from("bi_dre_snapshots")
    .select("id, modelo_id, nome, descricao, escopo, owner_id, criado_por, versao_origem, created_at")
    .eq("modelo_id", modeloId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any as DreSnapshot[];
}

export async function salvarDreSnapshot(params: {
  modeloId: string;
  nome: string;
  descricao?: string;
  escopo: EscopoSnapshot;
  linhas: DreLinhaEditavel[];
  depara?: unknown;
  versaoOrigem?: number | null;
}): Promise<string> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("bi_dre_snapshots")
    .insert({
      modelo_id: params.modeloId,
      nome: params.nome,
      descricao: params.descricao ?? null,
      escopo: params.escopo,
      owner_id: params.escopo === "pessoal" ? uid : null,
      linhas: params.linhas as any,
      depara: (params.depara ?? {}) as any,
      versao_origem: params.versaoOrigem ?? null,
      criado_por: uid,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as any).id;
}

export async function restaurarDreSnapshot(snapshotId: string, destino: "rascunho" | "oficial"): Promise<void> {
  const { error } = await supabase.rpc("dre_restaurar_snapshot", {
    _snapshot_id: snapshotId,
    _destino: destino,
  } as any);
  if (error) throw error;
}

export async function excluirDreSnapshot(id: string): Promise<void> {
  const { error } = await supabase.from("bi_dre_snapshots").delete().eq("id", id);
  if (error) throw error;
}

// ============ Balanço — análogo ============

export async function carregarBalancoOficial(): Promise<BalancoLinhaEditavel[]> {
  const { data, error } = await supabase
    .from("bi_dre_estrutura")
    .select("*")
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []) as any as BalancoLinhaEditavel[];
}

export async function carregarBalancoRascunho(): Promise<BalancoLinhaEditavel[] | null> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("bi_balanco_estrutura_rascunho")
    .select("linhas")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return data ? ((data.linhas as any) ?? []) : null;
}

export async function salvarBalancoRascunho(linhas: BalancoLinhaEditavel[]): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase
    .from("bi_balanco_estrutura_rascunho")
    .upsert({ user_id: uid, linhas: linhas as any }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function descartarBalancoRascunho(): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return;
  await supabase.from("bi_balanco_estrutura_rascunho").delete().eq("user_id", uid);
}

export async function publicarBalancoRascunho(): Promise<string> {
  const { data, error } = await supabase.rpc("balanco_publicar_rascunho" as any);
  if (error) throw error;
  return data as string;
}

export async function listarBalancoSnapshots(): Promise<BalancoSnapshot[]> {
  const { data, error } = await supabase
    .from("bi_balanco_snapshots")
    .select("id, nome, descricao, escopo, owner_id, criado_por, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any as BalancoSnapshot[];
}

export async function salvarBalancoSnapshot(params: {
  nome: string;
  descricao?: string;
  escopo: EscopoSnapshot;
  linhas: BalancoLinhaEditavel[];
}): Promise<string> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("bi_balanco_snapshots")
    .insert({
      nome: params.nome,
      descricao: params.descricao ?? null,
      escopo: params.escopo,
      owner_id: params.escopo === "pessoal" ? uid : null,
      linhas: params.linhas as any,
      criado_por: uid,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as any).id;
}

export async function restaurarBalancoSnapshot(snapshotId: string, destino: "rascunho" | "oficial"): Promise<void> {
  const { error } = await supabase.rpc("balanco_restaurar_snapshot" as any, {
    _snapshot_id: snapshotId,
    _destino: destino,
  });
  if (error) throw error;
}

export async function excluirBalancoSnapshot(id: string): Promise<void> {
  const { error } = await supabase.from("bi_balanco_snapshots").delete().eq("id", id);
  if (error) throw error;
}

// ============ Permissões ============

export async function podeEditarDreOficial(): Promise<boolean> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return false;
  const { data } = await supabase.rpc("can_edit_dre_oficial" as any, { _uid: uid });
  return !!data;
}

export async function podeEditarBalancoOficial(): Promise<boolean> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return false;
  const { data } = await supabase.rpc("can_edit_balanco_oficial" as any, { _uid: uid });
  return !!data;
}
