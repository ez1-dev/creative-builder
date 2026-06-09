/**
 * Modo de arredondamento global dos números do BI.
 *
 * Singleton em escopo de módulo: o `NumberRoundingProvider` ajusta
 * via `setNumberRoundingMode` e todos os formatadores em
 * `components/bi/utils/formatters.ts` consultam o valor atual sem precisar
 * de prop drilling ou React context em cada componente.
 *
 * Aceitamos esse acoplamento porque apenas uma página BI é renderizada
 * por vez no app — o Provider grava o modo "efetivo" (override da página
 * ou padrão global do usuário) na montagem.
 */

export type NumberRoundingMode = 'full' | 'no-decimals' | 'abbreviated' | 'millions';

let current: NumberRoundingMode = 'full';
const listeners = new Set<(m: NumberRoundingMode) => void>();

export function getNumberRoundingMode(): NumberRoundingMode {
  return current;
}

export function setNumberRoundingMode(mode: NumberRoundingMode): void {
  if (mode === current) return;
  current = mode;
  listeners.forEach((l) => l(mode));
}

export function subscribeNumberRounding(cb: (m: NumberRoundingMode) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const NUMBER_ROUNDING_LABEL: Record<NumberRoundingMode, string> = {
  'full': 'Completo',
  'no-decimals': 'Sem decimais',
  'abbreviated': 'Abreviado',
  'millions': 'Milhões (MI)',
};

export const NUMBER_ROUNDING_DESC: Record<NumberRoundingMode, string> = {
  'full': 'R$ 53.065.883,93',
  'no-decimals': 'R$ 53.065.884',
  'abbreviated': 'R$ 53,07 mi',
  'millions': 'R$ 0,378 mi',
};
