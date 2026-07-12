/**
 * Hook para aplicar mascaramento no cliente sobre dados de queries.
 * Uso: const rows = useMaskedData(data, 'comercial');
 */
import { useMemo } from 'react';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { applyMask } from '@/lib/demo/applyMask';
import type { SchemaKey } from '@/lib/demo/maskingSchema';

export function useMaskedData<T = any>(data: T, schemaKey: SchemaKey): T {
  const { active, presentationActive, maskName, maskDoc, maskCurrency, maskUnidade, applyText } = useDemoMode();
  return useMemo(() => {
    if (!active && !presentationActive) return data;
    return applyMask(data, schemaKey, { active, presentationActive, maskName, maskDoc, maskCurrency, maskUnidade, applyText });
  }, [data, schemaKey, active, presentationActive, maskName, maskDoc, maskCurrency, maskUnidade, applyText]);
}
