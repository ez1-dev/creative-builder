import { supabase } from '@/integrations/supabase/client';

export type StatusProgramacao = 'PROGRAMADO' | 'EXECUTANDO' | 'CONCLUIDO' | 'CANCELADO' | string;
export type StatusGargalo = 'OK' | 'ATENCAO' | 'GARGALO' | 'SEM_PARAMETRO' | string;

export interface ProgramacaoFiltros {
  codemp?: number;
  data_ini?: string;
  data_fim?: string;
  situacoes?: string; // 'A,L'
  unidade_negocio?: string;
  tipo_recurso?: string;
  codcre?: string;
  status_programacao?: string;
  lote_programacao?: string;
}

export interface FilaOpRow {
  unidade_negocio: string;
  codcre: string;
  descre: string;
  codori: string;
  numorp: string | number;
  codpro: string;
  descricao_produto: string;
  codopr: string;
  descricao_operacao: string;
  quantidade_prevista: number;
  tempo_previsto_min: number;
  tempo_previsto_horas: number;
  prioridade: number;
  data_geracao_op: string | null;
}
export interface FilaOpsResponse {
  dados: FilaOpRow[];
  total_registros?: number;
}

export interface GerarProgramacaoPayload {
  data_ini?: string;
  data_fim?: string;
  data_inicio_programacao?: string;
  situacoes?: string;
  unidade_negocio?: string;
  codcre?: string;
  permitir_quebra_operacao?: boolean;
  limpar_anterior?: boolean;
}
export interface GerarProgramacaoResponse {
  lote_programacao: string;
  qtd_operacoes_fila: number;
  qtd_linhas_programadas: number;
  qtd_sem_capacidade: number;
  qtd_sem_saldo: number;
  recursos_sem_capacidade: { codcre: string; descre: string }[];
}

export interface AgendaRow {
  data_programada: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fim: string;
  codcre: string;
  descre: string;
  codori: string;
  numorp: string | number;
  codpro: string;
  codopr: string;
  descricao_operacao?: string;
  tempo_alocado_min: number;
  segmento: number | string;
  status_programacao: StatusProgramacao;
  lote_programacao?: string;
  unidade_negocio?: string;
  tipo_recurso?: string;
}
export interface AgendaResponse {
  dados: AgendaRow[];
  total_registros?: number;
}

export interface GargaloDiaRow {
  data: string;
  dia_semana: string;
  unidade_negocio: string;
  codcre: string;
  descre: string;
  carga_programada_horas: number;
  capacidade_disponivel_horas: number;
  ocupacao_perc: number;
  status: StatusGargalo;
}
export interface GargalosResponse {
  dados: GargaloDiaRow[];
  total_registros?: number;
}

export interface CapacidadeRow {
  codemp: number;
  codcre: string;
  descre?: string;
  minutos_dia: number;
  qtde_recursos: number;
  eficiencia_perc: number;
  hora_inicio: string;
  considerar_sabado: boolean;
  considerar_domingo: boolean;
  ativo: boolean;
  obs?: string;
}
export interface CapacidadesResponse {
  dados: CapacidadeRow[];
}

const DOW_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function diaSemana(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return DOW_PT[d.getUTCDay()];
}

export const programacaoApi = {
  async fila(f: ProgramacaoFiltros): Promise<FilaOpsResponse> {
    const situacoes = (f.situacoes ?? 'A,L').split(',').map((s) => s.trim()).filter(Boolean);
    let q = supabase.from('bi_ops_fila').select('*').in('situacao', situacoes);
    if (f.codemp != null) q = q.eq('codemp', f.codemp);
    if (f.unidade_negocio) q = q.eq('unidade_negocio', f.unidade_negocio);
    if (f.tipo_recurso) q = q.eq('tipo_recurso', f.tipo_recurso);
    if (f.codcre) q = q.eq('codcre', f.codcre);
    const { data, error } = await q.order('prioridade', { ascending: true }).limit(5000);
    if (error) throw error;
    const dados: FilaOpRow[] = (data ?? []).map((r: any) => ({
      unidade_negocio: r.unidade_negocio ?? '',
      codcre: r.codcre,
      descre: r.descre ?? '',
      codori: r.codori ?? '',
      numorp: r.numorp,
      codpro: r.codpro ?? '',
      descricao_produto: r.descricao_produto ?? '',
      codopr: r.codopr ?? '',
      descricao_operacao: r.descricao_operacao ?? '',
      quantidade_prevista: Number(r.quantidade_prevista ?? 0),
      tempo_previsto_min: Number(r.tempo_previsto_min ?? 0),
      tempo_previsto_horas: Number(r.tempo_previsto_min ?? 0) / 60,
      prioridade: Number(r.prioridade ?? 5),
      data_geracao_op: r.data_geracao_op,
    }));
    return { dados, total_registros: dados.length };
  },

  async gerar(p: GerarProgramacaoPayload): Promise<GerarProgramacaoResponse> {
    const { data, error } = await supabase.functions.invoke('programacao-gerar', { body: p });
    if (error) throw error;
    return data as GerarProgramacaoResponse;
  },

  async syncFila(
    p: { codemp?: number; situacoes?: string; unidade_negocio?: string; codcre?: string; limite?: number } = {},
  ): Promise<{ lidas: number; inseridas: number; removidas: number; duracao_ms: number; url_chamada?: string }> {
    const { data, error } = await supabase.functions.invoke('programacao-sync-fila', { body: p });
    if (error) throw error;
    if (data && data.ok === false) {
      const err: any = new Error(data.message || 'Falha ao sincronizar fila');
      err.code = data.code;
      err.detalhe = data.detalhe;
      err.url_chamada = data.url_chamada;
      throw err;
    }
    return data as { lidas: number; inseridas: number; removidas: number; duracao_ms: number; url_chamada?: string };
  },

  async agenda(f: ProgramacaoFiltros): Promise<AgendaResponse> {
    let q = supabase.from('programacao_agenda').select('*');
    if (f.codemp != null) q = q.eq('codemp', f.codemp);
    if (f.data_ini) q = q.gte('data_programada', f.data_ini);
    if (f.data_fim) q = q.lte('data_programada', f.data_fim);
    if (f.unidade_negocio) q = q.eq('unidade_negocio', f.unidade_negocio);
    if (f.tipo_recurso) q = q.eq('tipo_recurso', f.tipo_recurso);
    if (f.codcre) q = q.eq('codcre', f.codcre);
    if (f.status_programacao) q = q.eq('status_programacao', f.status_programacao);
    if (f.lote_programacao) q = q.eq('lote_programacao', f.lote_programacao);
    const { data, error } = await q
      .order('data_programada', { ascending: true })
      .order('hora_inicio', { ascending: true })
      .limit(5000);
    if (error) throw error;
    const dados: AgendaRow[] = (data ?? []).map((r: any) => ({
      data_programada: r.data_programada,
      dia_semana: diaSemana(r.data_programada),
      hora_inicio: r.hora_inicio,
      hora_fim: r.hora_fim,
      codcre: r.codcre,
      descre: r.descre ?? '',
      codori: r.codori ?? '',
      numorp: r.numorp,
      codpro: r.codpro ?? '',
      codopr: r.codopr ?? '',
      descricao_operacao: r.descricao_operacao ?? '',
      tempo_alocado_min: Number(r.tempo_alocado_min ?? 0),
      segmento: r.segmento,
      status_programacao: r.status_programacao,
      lote_programacao: r.lote_programacao,
      unidade_negocio: r.unidade_negocio ?? '',
      tipo_recurso: r.tipo_recurso ?? '',
    }));
    return { dados, total_registros: dados.length };
  },

  async gargalos(f: ProgramacaoFiltros): Promise<GargalosResponse> {
    const { data, error } = await supabase.rpc('get_programacao_gargalos', {
      p_data_ini: f.data_ini ?? null,
      p_data_fim: f.data_fim ?? null,
      p_codemp: f.codemp ?? null,
      p_codcre: f.codcre ?? null,
      p_unidade_negocio: f.unidade_negocio ?? null,
    });
    if (error) throw error;
    const dados: GargaloDiaRow[] = (data ?? []).map((r: any) => ({
      data: r.data,
      dia_semana: r.dia_semana,
      unidade_negocio: r.unidade_negocio ?? '',
      codcre: r.codcre,
      descre: r.descre ?? '',
      carga_programada_horas: Number(r.carga_programada_horas ?? 0),
      capacidade_disponivel_horas: Number(r.capacidade_disponivel_horas ?? 0),
      ocupacao_perc: Number(r.ocupacao_perc ?? 0),
      status: r.status,
    }));
    return { dados, total_registros: dados.length };
  },

  async capacidades(codemp?: number): Promise<CapacidadesResponse> {
    let q = supabase.from('programacao_capacidades').select('*');
    if (codemp != null) q = q.eq('codemp', codemp);
    const { data, error } = await q.order('codcre', { ascending: true });
    if (error) throw error;
    const dados: CapacidadeRow[] = (data ?? []).map((r: any) => ({
      codemp: r.codemp,
      codcre: r.codcre,
      descre: r.descre ?? undefined,
      minutos_dia: Number(r.minutos_dia ?? 0),
      qtde_recursos: Number(r.qtde_recursos ?? 1),
      eficiencia_perc: Number(r.eficiencia_perc ?? 100),
      hora_inicio: r.hora_inicio ?? '08:00',
      considerar_sabado: !!r.considerar_sabado,
      considerar_domingo: !!r.considerar_domingo,
      ativo: !!r.ativo,
      obs: r.obs ?? undefined,
    }));
    return { dados };
  },

  async salvarCapacidades(rows: CapacidadeRow[]): Promise<{ ok: boolean; salvos: number }> {
    if (rows.length === 0) return { ok: true, salvos: 0 };
    const payload = rows.map((r) => ({
      codemp: r.codemp,
      codcre: r.codcre,
      descre: r.descre ?? null,
      minutos_dia: r.minutos_dia,
      qtde_recursos: r.qtde_recursos,
      eficiencia_perc: r.eficiencia_perc,
      hora_inicio: r.hora_inicio,
      considerar_sabado: r.considerar_sabado,
      considerar_domingo: r.considerar_domingo,
      ativo: r.ativo,
      obs: r.obs ?? null,
    }));
    const { error } = await supabase
      .from('programacao_capacidades')
      .upsert(payload, { onConflict: 'codemp,codcre' });
    if (error) throw error;
    return { ok: true, salvos: rows.length };
  },
};
