import { supabase } from '@/integrations/supabase/client';
import type { ParametroRecurso } from './cargaApi';

const TABLE = 'producao_recurso_unidade' as const;

export const parametrosRecursosCloud = {
  async listar(): Promise<ParametroRecurso[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('codemp', { ascending: true })
      .order('codcre', { ascending: true });
    if (error) throw new Error(error.message || 'Erro ao carregar parâmetros de recursos');
    return (data ?? []) as ParametroRecurso[];
  },
};
