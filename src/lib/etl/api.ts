import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';

export type EtlTarefa = {
  id: string;
  grupo: string;
  nome_tarefa: string;
  descricao: string | null;
  ativa: boolean;
  ordem: number;
  status_atual: string;
  ultima_execucao_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type EtlAcao = {
  id: string;
  tarefa_id: string;
  ordem: number;
  id_acao: string;
  nome_acao: string | null;
  tipo_execucao: string;
  tipo_comando: string;
  endpoint_api: string | null;
  tabela_destino: string | null;
  estrategia_carga: string;
  caso_erro: string;
  ativa: boolean;
  timeout_segundos: number;
  parametros_padrao: Record<string, any>;
  sql_template: string | null;
  sql_versao: number;
  sql_atualizado_em: string | null;
  sql_atualizado_por: string | null;
};

export type EtlAcaoSqlVersao = {
  id: string;
  acao_id: string;
  versao: number;
  sql_template: string | null;
  comentario: string | null;
  criado_por: string | null;
  criado_em: string;
};

export type EtlExecucao = {
  id: string;
  tarefa_id: string | null;
  nome_tarefa: string;
  status: string;
  acionado_por: string | null;
  parametros: Record<string, any>;
  iniciado_em: string | null;
  finalizado_em: string | null;
  total_linhas: number;
  mensagem: string | null;
  erro: string | null;
  criado_em: string;
};

export type EtlAcaoExecucao = {
  id: string;
  execucao_id: string;
  acao_id: string | null;
  id_acao: string;
  ordem: number;
  status: string;
  iniciado_em: string | null;
  finalizado_em: string | null;
  total_linhas: number;
  mensagem: string | null;
  erro: string | null;
};

export type EtlLog = {
  id: string;
  execucao_id: string | null;
  acao_execucao_id: string | null;
  nivel: string;
  origem: string | null;
  mensagem: string;
  detalhe: Record<string, any>;
  criado_em: string;
};

export type ExecucaoParams = {
  anomes_ini: number;
  anomes_fim: number;
  acionado_por?: string;
  /** Parâmetros extras para placeholders além de ANOMES_*. */
  parametros?: Record<string, string | number>;
};

export type TestarSqlPayload = {
  /** SQL atual do editor (opcional — se omitido, FastAPI usa o salvo no Cloud). */
  sql_template?: string;
  parametros: Record<string, string | number>;
  limite?: number;
};

export type TestarSqlResponse = {
  colunas: { nome: string; tipo?: string }[];
  linhas: Record<string, any>[];
  qtd_linhas: number;
  tempo_ms: number;
  truncado?: boolean;
};

export type LogsResponse = {
  execucao: EtlExecucao;
  acoes: EtlAcaoExecucao[];
  logs: EtlLog[];
};

// ---------- GETs (Cloud direto) ----------
export async function listarTarefas(): Promise<EtlTarefa[]> {
  const { data, error } = await supabase
    .from('etl_tarefas')
    .select('*')
    .order('grupo')
    .order('ordem');
  if (error) throw error;
  return (data ?? []) as EtlTarefa[];
}

export async function detalheTarefa(nome: string): Promise<EtlTarefa | null> {
  const { data, error } = await supabase
    .from('etl_tarefas')
    .select('*')
    .eq('nome_tarefa', nome)
    .maybeSingle();
  if (error) throw error;
  return (data as EtlTarefa) ?? null;
}

export async function acoesTarefa(tarefaId: string): Promise<EtlAcao[]> {
  const { data, error } = await supabase
    .from('etl_acoes')
    .select('*')
    .eq('tarefa_id', tarefaId)
    .order('ordem');
  if (error) throw error;
  return (data ?? []) as EtlAcao[];
}

export async function ultimasExecucoes(nomeTarefa: string, limit = 20): Promise<EtlExecucao[]> {
  const { data, error } = await supabase
    .from('etl_execucoes')
    .select('*')
    .eq('nome_tarefa', nomeTarefa)
    .order('criado_em', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as EtlExecucao[];
}

export async function logsExecucao(execucaoId: string): Promise<LogsResponse> {
  // Tenta FastAPI primeiro (formato consolidado); fallback para leitura direta no Cloud.
  try {
    return await api.get<LogsResponse>(`/api/etl/execucoes/${execucaoId}/logs`);
  } catch {
    const [{ data: execucao }, { data: acoes }, { data: logs }] = await Promise.all([
      supabase.from('etl_execucoes').select('*').eq('id', execucaoId).maybeSingle(),
      supabase.from('etl_acao_execucoes').select('*').eq('execucao_id', execucaoId).order('ordem'),
      supabase.from('etl_logs').select('*').eq('execucao_id', execucaoId).order('criado_em'),
    ]);
    return {
      execucao: execucao as EtlExecucao,
      acoes: (acoes ?? []) as EtlAcaoExecucao[],
      logs: (logs ?? []) as EtlLog[],
    };
  }
}

// ---------- POSTs (FastAPI) ----------
export async function executarTarefa(nomeTarefa: string, payload: ExecucaoParams) {
  return api.post<{ execucao_id: string; status: string; mensagem?: string }>(
    `/api/etl/tarefas/${nomeTarefa}/executar`,
    payload,
  );
}

export async function executarAcao(idAcao: string, payload: ExecucaoParams) {
  return api.post<{ execucao_id: string; status: string; mensagem?: string }>(
    `/api/etl/acoes/${idAcao}/executar`,
    payload,
  );
}

/**
 * Preview efêmero — executa o SQL contra o ERP via FastAPI sem persistir nada.
 * Aceita o sql_template atual do editor (antes de salvar).
 */
export async function testarSqlAcao(
  idAcao: string,
  payload: TestarSqlPayload,
): Promise<TestarSqlResponse> {
  return api.post<TestarSqlResponse>(`/api/etl/acoes/${idAcao}/testar-sql`, payload);
}

// ---------- SQL versionado (Cloud) ----------
export async function listarVersoesSql(acaoId: string): Promise<EtlAcaoSqlVersao[]> {
  const { data, error } = await supabase
    .from('etl_acao_sql_versoes')
    .select('*')
    .eq('acao_id', acaoId)
    .order('versao', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EtlAcaoSqlVersao[];
}

export async function atualizarSqlAcao(
  acaoId: string,
  sqlTemplate: string,
  comentario: string,
): Promise<EtlAcao> {
  // Grava comentário num GUC para o trigger consumir; a sessão expira no fim da request.
  try {
    await (supabase.rpc as any)('set_config', {
      setting_name: 'app.sql_comentario',
      new_value: comentario ?? '',
      is_local: true,
    });
  } catch {
    /* set_config indisponível — segue sem comentário */
  }


  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id ?? null;

  const { data, error } = await supabase
    .from('etl_acoes')
    .update({
      sql_template: sqlTemplate,
      sql_atualizado_por: userId,
    } as any)
    .eq('id', acaoId)
    .select('*')
    .single();
  if (error) throw error;
  return data as EtlAcao;
}

export async function restaurarVersaoSql(
  acaoId: string,
  versao: number,
): Promise<EtlAcao> {
  const { data: v, error: e1 } = await supabase
    .from('etl_acao_sql_versoes')
    .select('sql_template')
    .eq('acao_id', acaoId)
    .eq('versao', versao)
    .maybeSingle();
  if (e1) throw e1;
  if (!v) throw new Error(`Versão v${versao} não encontrada`);
  return atualizarSqlAcao(acaoId, (v as any).sql_template ?? '', `Restauração da v${versao}`);
}

