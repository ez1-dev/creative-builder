import { supabase } from '@/integrations/supabase/client';

/**
 * Garante que o dashboard informado tenha pelo menos um bloco e retorna o id.
 * Usado pelos hooks de layout para preencher `block_id` ao inserir widgets,
 * já que a coluna passou a ser obrigatória.
 *
 * Estratégia:
 *  1. Tenta selecionar o bloco de menor `ordem` direto da tabela.
 *  2. Se não houver nenhum, chama a RPC `ensure_default_block` que cria o
 *     "Bloco Principal" via SECURITY DEFINER (contorna RLS de inserção).
 */
export async function ensureDefaultBlockId(dashboardId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('dashboard_blocks')
    .select('id')
    .eq('dashboard_id', dashboardId)
    .order('ordem', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await (supabase.rpc as any)('ensure_default_block', { _dashboard_id: dashboardId });
  if (error) throw error;
  return data as string;
}
