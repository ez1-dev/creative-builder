import { supabase } from '@/integrations/supabase/client';

export type FrequenciaAgendamento = 'intervalo_minutos' | 'diario' | 'semanal';
export type JanelaTipo = 'mes_atual' | 'ultimos_n_meses' | 'mes_anterior';

export type EtlAgendamento = {
  id: string;
  tarefa_id: string;
  nome_tarefa: string;
  ativo: boolean;
  frequencia: FrequenciaAgendamento;
  intervalo_minutos: number | null;
  hora: number | null;
  minuto: number | null;
  dias_semana: number[];
  janela_tipo: JanelaTipo;
  janela_n_meses: number;
  parametros_extras: Record<string, any>;
  proxima_execucao_em: string | null;
  ultima_execucao_em: string | null;
  ultimo_status: string | null;
  ultima_mensagem: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type EtlAgendamentoInput = Omit<
  EtlAgendamento,
  'id' | 'criado_em' | 'atualizado_em' | 'criado_por' | 'nome_tarefa' |
  'proxima_execucao_em' | 'ultima_execucao_em' | 'ultimo_status' | 'ultima_mensagem'
> & { nome_tarefa?: string };

export async function listarAgendamentos(): Promise<EtlAgendamento[]> {
  const { data, error } = await supabase
    .from('etl_agendamentos' as any)
    .select('*')
    .order('nome_tarefa');
  if (error) throw error;
  return (data ?? []) as unknown as EtlAgendamento[];
}

export async function criarAgendamento(input: EtlAgendamentoInput): Promise<EtlAgendamento> {
  const { data, error } = await supabase
    .from('etl_agendamentos' as any)
    .insert(input as any)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as EtlAgendamento;
}

export async function atualizarAgendamento(
  id: string,
  patch: Partial<EtlAgendamentoInput> & { ativo?: boolean },
): Promise<EtlAgendamento> {
  // Quando muda regra de frequência, força recálculo da próxima execução
  const recalcular =
    patch.frequencia !== undefined ||
    patch.intervalo_minutos !== undefined ||
    patch.hora !== undefined ||
    patch.minuto !== undefined ||
    patch.dias_semana !== undefined ||
    patch.ativo !== undefined;

  const finalPatch: any = { ...patch };
  if (recalcular) finalPatch.proxima_execucao_em = null;

  const { data, error } = await supabase
    .from('etl_agendamentos' as any)
    .update(finalPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as EtlAgendamento;
}

export async function excluirAgendamento(id: string): Promise<void> {
  const { error } = await supabase.from('etl_agendamentos' as any).delete().eq('id', id);
  if (error) throw error;
}

export async function dispararTickAgendador(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('etl-agendamentos-tick', {
    body: {},
  });
  if (error) throw error;
  return data;
}

// Helpers de UI
export function descreverFrequencia(a: Pick<EtlAgendamento, 'frequencia' | 'intervalo_minutos' | 'hora' | 'minuto' | 'dias_semana'>): string {
  const hh = String(a.hora ?? 0).padStart(2, '0');
  const mm = String(a.minuto ?? 0).padStart(2, '0');
  if (a.frequencia === 'intervalo_minutos') {
    const n = a.intervalo_minutos ?? 0;
    if (n >= 60 && n % 60 === 0) return `A cada ${n / 60} h`;
    return `A cada ${n} min`;
  }
  if (a.frequencia === 'diario') return `Diariamente às ${hh}:${mm}`;
  if (a.frequencia === 'semanal') {
    const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dias = (a.dias_semana ?? []).slice().sort().map((d) => nomes[d]).join('/');
    return `${dias || '—'} às ${hh}:${mm}`;
  }
  return '—';
}

export function descreverJanela(tipo: JanelaTipo, n: number): string {
  if (tipo === 'mes_atual') return 'Mês atual';
  if (tipo === 'mes_anterior') return 'Mês anterior';
  return `Últimos ${n} meses`;
}

export function previewAnomes(tipo: JanelaTipo, n: number): { ini: number; fim: number } {
  const hoje = new Date();
  const anomes = (d: Date) => d.getFullYear() * 100 + (d.getMonth() + 1);
  if (tipo === 'mes_anterior') {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    return { ini: anomes(d), fim: anomes(d) };
  }
  if (tipo === 'ultimos_n_meses') {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - Math.max(n, 1) + 1, 1);
    return { ini: anomes(d), fim: anomes(hoje) };
  }
  const v = anomes(hoje);
  return { ini: v, fim: v };
}
