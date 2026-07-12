/**
 * Modo Demonstração para investidores.
 * Permite esconder módulos, gráficos, e mascarar dados sensíveis na UI —
 * sem alterar dados reais no banco. Preferência é por usuário logado.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type MaskNameKind = 'cliente' | 'fornecedor' | 'colaborador' | 'motorista' | 'revenda';
export type MaskDocKind = 'cnpj' | 'cpf' | 'placa' | 'nota';

export interface TextReplacement { from: string; to: string; }

export interface DemoPrefs {
  enabled: boolean;
  hidden_modules: string[];
  hidden_visuals: string[];
  mask_names: Partial<Record<MaskNameKind, boolean>>;
  mask_values: { mode: 'keep' | 'scale' | 'hide'; factor?: number };
  mask_docs: Partial<Record<MaskDocKind, boolean>>;
  text_replacements: TextReplacement[];
}

const DEFAULT_PREFS: DemoPrefs = {
  enabled: false,
  hidden_modules: [],
  hidden_visuals: [],
  mask_names: {},
  mask_values: { mode: 'keep', factor: 1 },
  mask_docs: {},
  text_replacements: [],
};

interface DemoModeContextValue {
  prefs: DemoPrefs;
  loading: boolean;
  active: boolean; // enabled && loaded
  save: (next: Partial<DemoPrefs>) => Promise<void>;
  reload: () => Promise<void>;

  isModuleHidden: (path: string) => boolean;
  isVisualHidden: (key: string) => boolean;

  maskName: (kind: MaskNameKind, value: string | null | undefined) => string;
  maskCurrency: (v: number | null | undefined) => number | null;
  maskDoc: (kind: MaskDocKind, v: string | null | undefined) => string;
  applyText: (s: string | null | undefined) => string;
}

const Ctx = createContext<DemoModeContextValue | null>(null);

// Nome fictício estável por (kind, value) — determinístico via hash simples.
const FAKE_NAMES: Record<MaskNameKind, string[]> = {
  cliente: ['Alfa', 'Beta', 'Gama', 'Delta', 'Épsilon', 'Zeta', 'Ômega', 'Sigma', 'Nova', 'Vega', 'Orion', 'Áltair', 'Íris', 'Lyra'],
  fornecedor: ['Norte', 'Sul', 'Leste', 'Oeste', 'Prime', 'Global', 'Meridian', 'Atlas', 'Zenit', 'Poente', 'Aurora'],
  colaborador: ['Ana P.', 'Bruno S.', 'Carla M.', 'Diego L.', 'Elisa R.', 'Fábio T.', 'Gabi O.', 'Hugo V.', 'Iara K.', 'João N.'],
  motorista: ['Motorista 01', 'Motorista 02', 'Motorista 03', 'Motorista 04', 'Motorista 05', 'Motorista 06'],
  revenda: ['Revenda Alfa', 'Revenda Beta', 'Revenda Gama', 'Revenda Delta', 'Revenda Ômega'],
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<DemoPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setPrefs(DEFAULT_PREFS); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('user_demo_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setPrefs({
        enabled: !!data.enabled,
        hidden_modules: (data.hidden_modules as string[]) ?? [],
        hidden_visuals: (data.hidden_visuals as string[]) ?? [],
        mask_names: (data.mask_names as any) ?? {},
        mask_values: (data.mask_values as any) ?? { mode: 'keep', factor: 1 },
        mask_docs: (data.mask_docs as any) ?? {},
        text_replacements: (data.text_replacements as any) ?? [],
      });
    } else {
      setPrefs(DEFAULT_PREFS);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (patch: Partial<DemoPrefs>) => {
    if (!user?.id) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await supabase
      .from('user_demo_preferences')
      .upsert({
        user_id: user.id,
        enabled: next.enabled,
        hidden_modules: next.hidden_modules,
        hidden_visuals: next.hidden_visuals,
        mask_names: next.mask_names as any,
        mask_values: next.mask_values as any,
        mask_docs: next.mask_docs as any,
        text_replacements: next.text_replacements as any,
      });
  }, [prefs, user?.id]);

  const active = prefs.enabled && !loading;

  const hiddenModulesSet = useMemo(() => new Set(prefs.hidden_modules), [prefs.hidden_modules]);
  const hiddenVisualsSet = useMemo(() => new Set(prefs.hidden_visuals), [prefs.hidden_visuals]);

  const isModuleHidden = useCallback((path: string) => active && hiddenModulesSet.has(path), [active, hiddenModulesSet]);
  const isVisualHidden = useCallback((key: string) => active && hiddenVisualsSet.has(key), [active, hiddenVisualsSet]);

  const maskName = useCallback((kind: MaskNameKind, value: string | null | undefined): string => {
    if (!active || !prefs.mask_names[kind] || !value) return value ?? '';
    const pool = FAKE_NAMES[kind];
    const pick = pool[hashStr(String(value)) % pool.length];
    const suffix = String(hashStr(String(value)) % 99 + 1).padStart(2, '0');
    return `${pick} ${suffix}`;
  }, [active, prefs.mask_names]);

  const maskCurrency = useCallback((v: number | null | undefined): number | null => {
    if (v == null || !active) return v ?? null;
    const m = prefs.mask_values;
    if (m.mode === 'scale') return v * (m.factor ?? 1);
    if (m.mode === 'hide') return NaN;
    return v;
  }, [active, prefs.mask_values]);

  const maskDoc = useCallback((kind: MaskDocKind, v: string | null | undefined): string => {
    if (!active || !prefs.mask_docs[kind] || !v) return v ?? '';
    return v.replace(/[A-Za-z0-9]/g, '•');
  }, [active, prefs.mask_docs]);

  const applyText = useCallback((s: string | null | undefined): string => {
    if (!s) return s ?? '';
    if (!active || !prefs.text_replacements?.length) return s;
    let out = s;
    for (const r of prefs.text_replacements) {
      if (!r.from) continue;
      out = out.split(r.from).join(r.to);
    }
    return out;
  }, [active, prefs.text_replacements]);

  const value = useMemo<DemoModeContextValue>(() => ({
    prefs, loading, active, save, reload: load,
    isModuleHidden, isVisualHidden,
    maskName, maskCurrency, maskDoc, applyText,
  }), [prefs, loading, active, save, load, isModuleHidden, isVisualHidden, maskName, maskCurrency, maskDoc, applyText]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoMode(): DemoModeContextValue {
  const v = useContext(Ctx);
  if (!v) {
    // fallback seguro fora do provider
    return {
      prefs: DEFAULT_PREFS, loading: false, active: false,
      save: async () => {}, reload: async () => {},
      isModuleHidden: () => false, isVisualHidden: () => false,
      maskName: (_k, v) => v ?? '',
      maskCurrency: (v) => v ?? null,
      maskDoc: (_k, v) => v ?? '',
      applyText: (s) => s ?? '',
    };
  }
  return v;
}
