import { supabase } from '@/integrations/supabase/client';
import type { ParametroRecurso, ParametroRecursoPayload } from './cargaApi';

const TABLE = 'producao_recurso_unidade' as const;

function mapError(e: any): Error {
  const msg = e?.message || String(e);
  if (/row-level security|permission denied|RLS/i.test(msg)) {
    return new Error('Apenas administradores podem alterar parâmetros de recursos.');
  }
  return new Error(msg || 'Erro ao acessar parâmetros de recursos');
}

export const parametrosRecursosCloud = {
  async listar(): Promise<ParametroRecurso[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('codemp', { ascending: true })
      .order('codcre', { ascending: true });
    if (error) throw mapError(error);
    return (data ?? []) as ParametroRecurso[];
  },

  async criar(payload: ParametroRecursoPayload): Promise<ParametroRecurso> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select('*')
      .single();
    if (error) throw mapError(error);
    return data as ParametroRecurso;
  },

  async atualizar(id: number, payload: ParametroRecursoPayload): Promise<ParametroRecurso> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw mapError(error);
    return data as ParametroRecurso;
  },

  async excluir(id: number): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw mapError(error);
  },
};
