/**
 * Modo Demonstração + Modo Apresentação.
 * - Modo Demonstração: preferências granulares por usuário (mascaramento seletivo).
 * - Modo Apresentação: preset 1-clique com regras fortes que sobrepõem os granulares.
 * Nenhum dos dois altera dados no banco — apenas transforma o que é exibido.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type MaskNameKind = 'cliente' | 'fornecedor' | 'colaborador' | 'motorista' | 'revenda';
export type MaskDocKind = 'cnpj' | 'cpf' | 'placa' | 'nota';

export interface TextReplacement { from: string; to: string; }

export interface PresentationSettings {
  factor: number;               // multiplicador de valores monetários (ex: 0.73)
  nameStyle: 'alfa' | 'norte';  // estilo de nomes fake
  companyName: string;          // nome exibido no header/sidebar/relatórios
  hideDocs: boolean;            // oculta CNPJ/CPF/placa
}

export const DEFAULT_PRESENTATION: PresentationSettings = {
  factor: 0.73,
  nameStyle: 'alfa',
  companyName: 'Empresa Demo S/A',
  hideDocs: true,
};

export interface DemoPrefs {
  enabled: boolean;
  hidden_modules: string[];
  hidden_visuals: string[];
  mask_names: Partial<Record<MaskNameKind, boolean>>;
  mask_values: { mode: 'keep' | 'scale' | 'hide'; factor?: number };
  mask_docs: Partial<Record<MaskDocKind, boolean>>;
  text_replacements: TextReplacement[];
  presentation_enabled: boolean;
  presentation_settings: PresentationSettings;
}

const DEFAULT_PREFS: DemoPrefs = {
  enabled: false,
  hidden_modules: [],
  hidden_visuals: [],
  mask_names: {},
  mask_values: { mode: 'keep', factor: 1 },
  mask_docs: {},
  text_replacements: [],
  presentation_enabled: false,
  presentation_settings: DEFAULT_PRESENTATION,
};

interface DemoModeContextValue {
  prefs: DemoPrefs;
  loading: boolean;
  active: boolean;              // demo granular ativo
  presentationActive: boolean;  // preset 1-clique ativo
  save: (next: Partial<DemoPrefs>) => Promise<void>;
  reload: () => Promise<void>;
  togglePresentation: (next?: boolean) => Promise<void>;
  updatePresentation: (patch: Partial<PresentationSettings>) => Promise<void>;

  isModuleHidden: (path: string) => boolean;
  isVisualHidden: (key: string) => boolean;

  maskName: (kind: MaskNameKind, value: string | null | undefined) => string;
  maskCurrency: (v: number | null | undefined) => number | null;
  maskDoc: (kind: MaskDocKind, v: string | null | undefined) => string;
  applyText: (s: string | null | undefined) => string;
}

const Ctx = createContext<DemoModeContextValue | null>(null);

// Pools de nomes por categoria. Escolha determinística via hash do valor original.
const FAKE_NAMES: Record<MaskNameKind, string[]> = {
  cliente: ['Alfa', 'Beta', 'Gama', 'Delta', 'Épsilon', 'Zeta', 'Ômega', 'Sigma', 'Nova', 'Vega', 'Orion', 'Áltair', 'Íris', 'Lyra'],
  fornecedor: ['Norte', 'Sul', 'Leste', 'Oeste', 'Prime', 'Global', 'Meridian', 'Atlas', 'Zenit', 'Poente', 'Aurora'],
  colaborador: ['Ana P.', 'Bruno S.', 'Carla M.', 'Diego L.', 'Elisa R.', 'Fábio T.', 'Gabi O.', 'Hugo V.', 'Iara K.', 'João N.'],
  motorista: ['Motorista 01', 'Motorista 02', 'Motorista 03', 'Motorista 04', 'Motorista 05', 'Motorista 06'],
  revenda: ['Revenda Alfa', 'Revenda Beta', 'Revenda Gama', 'Revenda Delta', 'Revenda Ômega'],
};

const NAME_PREFIX_BY_KIND: Record<MaskNameKind, string> = {
  cliente: 'Cliente',
  fornecedor: 'Fornecedor',
  colaborador: 'Colaborador',
  motorista: 'Motorista',
  revenda: 'Revenda',
};

function hashStr(s: string): number {
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<DemoPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  const normalizePrefs = useCallback((raw: any): DemoPrefs => ({
    enabled: !!raw?.enabled,
    hidden_modules: (raw?.hidden_modules as string[]) ?? [],
    hidden_visuals: (raw?.hidden_visuals as string[]) ?? [],
    mask_names: (raw?.mask_names as any) ?? {},
    mask_values: (raw?.mask_values as any) ?? { mode: 'keep', factor: 1 },
    mask_docs: (raw?.mask_docs as any) ?? {},
    text_replacements: (raw?.text_replacements as any) ?? [],
    presentation_enabled: !!raw?.presentation_enabled,
    presentation_settings: { ...DEFAULT_PRESENTATION, ...((raw?.presentation_settings as any) ?? {}) },
  }), []);

  const load = useCallback(async () => {
    if (!user?.id) { setPrefs(DEFAULT_PREFS); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_demo_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setPrefs(data ? normalizePrefs(data) : DEFAULT_PREFS);
    } catch (error) {
      console.warn('[DemoMode] Falha ao carregar preferências:', error);
      setPrefs(DEFAULT_PREFS);
    } finally {
      setLoading(false);
    }
  }, [normalizePrefs, user?.id]);

  useEffect(() => { load(); }, [load]);

  // Alterna classes globais no <html> para permitir hooks CSS + document.title.
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.presentation_enabled) root.classList.add('presentation-mode');
    else root.classList.remove('presentation-mode');
    if (prefs.enabled) root.classList.add('demo-mode');
    else root.classList.remove('demo-mode');
  }, [prefs.presentation_enabled, prefs.enabled]);

  const save = useCallback(async (patch: Partial<DemoPrefs>) => {
    if (!user?.id) throw new Error('Usuário não autenticado');
    const previous = prefs;
    const next = normalizePrefs({ ...prefs, ...patch });
    setPrefs(next);

    const { error } = await supabase
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
        presentation_enabled: next.presentation_enabled,
        presentation_settings: next.presentation_settings as any,
      } as any, { onConflict: 'user_id' });

    if (error) {
      setPrefs(previous);
      console.warn('[DemoMode] Falha ao salvar preferências:', error);
      throw error;
    }
  }, [normalizePrefs, prefs, user?.id]);

  const togglePresentation = useCallback(async (next?: boolean) => {
    const v = next ?? !prefs.presentation_enabled;
    await save({ presentation_enabled: v });
  }, [prefs.presentation_enabled, save]);

  const updatePresentation = useCallback(async (patch: Partial<PresentationSettings>) => {
    await save({ presentation_settings: { ...prefs.presentation_settings, ...patch } });
  }, [prefs.presentation_settings, save]);

  const active = prefs.enabled && !loading;
  const presentationActive = prefs.presentation_enabled && !loading;
  // Qualquer um dos dois modos ativa mascaramento.
  const anyActive = active || presentationActive;

  const hiddenModulesSet = useMemo(() => new Set(prefs.hidden_modules), [prefs.hidden_modules]);
  const hiddenVisualsSet = useMemo(() => new Set(prefs.hidden_visuals), [prefs.hidden_visuals]);

  const isModuleHidden = useCallback((path: string) => active && hiddenModulesSet.has(path), [active, hiddenModulesSet]);
  const isVisualHidden = useCallback((key: string) => active && hiddenVisualsSet.has(key), [active, hiddenVisualsSet]);

  const maskName = useCallback((kind: MaskNameKind, value: string | null | undefined): string => {
    if (!value) return value ?? '';
    // Presentation: mascara TODOS os kinds. Demo granular: só se marcado.
    const shouldMask = presentationActive || (active && prefs.mask_names[kind]);
    if (!shouldMask) return value;
    const style = prefs.presentation_settings.nameStyle;
    const h = hashStr(String(value));
    if (presentationActive && style === 'norte') {
      // Empresa <sufixo>
      const pool = FAKE_NAMES.fornecedor;
      return `${NAME_PREFIX_BY_KIND[kind]} ${pool[h % pool.length]}`;
    }
    const pool = FAKE_NAMES[kind];
    const pick = pool[h % pool.length];
    const suffix = String((h % 99) + 1).padStart(2, '0');
    return `${pick} ${suffix}`;
  }, [active, presentationActive, prefs.mask_names, prefs.presentation_settings.nameStyle]);

  const maskCurrency = useCallback((v: number | null | undefined): number | null => {
    if (v == null) return v ?? null;
    if (presentationActive) {
      return v * (prefs.presentation_settings.factor ?? 1);
    }
    if (!active) return v;
    const m = prefs.mask_values;
    if (m.mode === 'scale') return v * (m.factor ?? 1);
    if (m.mode === 'hide') return NaN;
    return v;
  }, [active, presentationActive, prefs.mask_values, prefs.presentation_settings.factor]);

  const maskDoc = useCallback((kind: MaskDocKind, v: string | null | undefined): string => {
    if (!v) return v ?? '';
    const shouldMask = (presentationActive && prefs.presentation_settings.hideDocs) || (active && prefs.mask_docs[kind]);
    if (!shouldMask) return v;
    return v.replace(/[A-Za-z0-9]/g, '•');
  }, [active, presentationActive, prefs.mask_docs, prefs.presentation_settings.hideDocs]);

  const applyText = useCallback((s: string | null | undefined): string => {
    if (!s) return s ?? '';
    if (!anyActive || !prefs.text_replacements?.length) return s;
    let out = s;
    for (const r of prefs.text_replacements) {
      if (!r.from) continue;
      out = out.split(r.from).join(r.to);
    }
    return out;
  }, [anyActive, prefs.text_replacements]);

  const value = useMemo<DemoModeContextValue>(() => ({
    prefs, loading, active, presentationActive,
    save, reload: load, togglePresentation, updatePresentation,
    isModuleHidden, isVisualHidden,
    maskName, maskCurrency, maskDoc, applyText,
  }), [prefs, loading, active, presentationActive, save, load, togglePresentation, updatePresentation, isModuleHidden, isVisualHidden, maskName, maskCurrency, maskDoc, applyText]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoMode(): DemoModeContextValue {
  const v = useContext(Ctx);
  if (!v) {
    return {
      prefs: DEFAULT_PREFS, loading: false, active: false, presentationActive: false,
      save: async () => {}, reload: async () => {},
      togglePresentation: async () => {}, updatePresentation: async () => {},
      isModuleHidden: () => false, isVisualHidden: () => false,
      maskName: (_k, v) => v ?? '',
      maskCurrency: (v) => v ?? null,
      maskDoc: (_k, v) => v ?? '',
      applyText: (s) => s ?? '',
    };
  }
  return v;
}

/** Hook auxiliar para trocar nome da empresa em headers/sidebar/relatórios. */
export function useBrand(defaultName: string): { name: string; presentation: boolean } {
  const { presentationActive, prefs } = useDemoMode();
  return {
    name: presentationActive ? (prefs.presentation_settings.companyName || defaultName) : defaultName,
    presentation: presentationActive,
  };
}
