/**
 * Utilitários de mascaramento para o Modo Demonstração.
 * Use-os ao redor de campos sensíveis para permitir apresentar a aplicação
 * a investidores sem expor nomes/valores/documentos reais.
 */
import { useDemoMode, type MaskDocKind, type MaskNameKind } from '@/contexts/DemoModeContext';

export function DemoText({ kind, children }: { kind: MaskNameKind; children: string | null | undefined }) {
  const { maskName, applyText } = useDemoMode();
  return <>{applyText(maskName(kind, children ?? ''))}</>;
}

export function DemoDoc({ kind, children }: { kind: MaskDocKind; children: string | null | undefined }) {
  const { maskDoc } = useDemoMode();
  return <>{maskDoc(kind, children ?? '')}</>;
}

export function DemoMoney({ value, format }: { value: number | null | undefined; format?: (v: number) => string }) {
  const { maskCurrency, active, prefs } = useDemoMode();
  const v = maskCurrency(value);
  if (active && prefs.mask_values.mode === 'hide') return <>R$ ●●●</>;
  if (v == null || Number.isNaN(v)) return <>—</>;
  const fmt = format ?? ((n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  return <>{fmt(v)}</>;
}

export function DemoUnidade({ children }: { children: string | null | undefined }) {
  const { maskUnidade } = useDemoMode();
  return <>{maskUnidade(children ?? '')}</>;
}
