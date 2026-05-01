import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Rule } from '@/lib/seniorRules';

export interface WhitelistItem {
  id: string;
  usuario: string;
  motivo: string | null;
}

export interface RuleRow extends Rule {
  id: string;
  nome: string;
  descricao: string | null;
}

export function useSeniorDisconnectRules() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, { data: w }] = await Promise.all([
      supabase
        .from('senior_disconnect_rules')
        .select('id,rule_key,nome,descricao,enabled,params')
        .order('rule_key'),
      supabase
        .from('senior_disconnect_whitelist')
        .select('id,usuario,motivo')
        .order('usuario'),
    ]);
    setRules(((r ?? []) as any[]).map((x) => ({
      id: x.id,
      rule_key: x.rule_key,
      nome: x.nome,
      descricao: x.descricao,
      enabled: !!x.enabled,
      params: (x.params ?? {}) as Record<string, any>,
    })));
    setWhitelist((w ?? []) as WhitelistItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const whitelistUpper = whitelist.map((w) => w.usuario.toUpperCase());
  return { rules, whitelist, whitelistUpper, loading, reload };
}
