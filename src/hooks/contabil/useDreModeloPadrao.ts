import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MODELO_DRE_OFICIAL_ID } from "@/lib/contabilConfig";

/**
 * Chave em `app_settings` que guarda o UUID do modelo DRE oficial da empresa.
 * Editável em Contabilidade → Configurações. Fallback: constante MODELO_DRE_OFICIAL_ID.
 */
export const APP_SETTING_DRE_MODELO_PADRAO_KEY = "contabil_dre_modelo_padrao_id";

export interface DreModeloPadraoInfo {
  modeloId: string | null;
  origem: "app_settings" | "fallback";
}

async function fetchModeloPadrao(): Promise<DreModeloPadraoInfo> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", APP_SETTING_DRE_MODELO_PADRAO_KEY)
    .maybeSingle();
  const raw = (data as any)?.value;
  const id = typeof raw === "string" ? raw.trim() : "";
  if (id) return { modeloId: id, origem: "app_settings" };
  return { modeloId: MODELO_DRE_OFICIAL_ID || null, origem: "fallback" };
}

export function useDreModeloPadrao() {
  return useQuery({
    queryKey: ["contabil", "dre-modelo-padrao"],
    queryFn: fetchModeloPadrao,
    staleTime: 60_000,
  });
}
