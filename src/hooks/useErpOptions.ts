import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { ComboboxOption } from '@/components/erp/ComboboxFilter';

interface FieldMapping {
  familiaKey?: string;
  origemKey?: string;
  familiaLabelKey?: string;
  origemLabelKey?: string;
}

interface UseErpOptionsResult {
  familias: ComboboxOption[];
  origens: ComboboxOption[];
  loading: boolean;
}

const DEFAULT_MAPPING: FieldMapping = {
  familiaKey: 'familia',
  origemKey: 'origem',
};

function extractUnique(data: any[], valueKey: string, labelKey?: string): ComboboxOption[] {
  const seen = new Set<string>();
  const options: ComboboxOption[] = [];
  for (const item of data) {
    const val = item[valueKey];
    if (val != null && val !== '' && !seen.has(String(val))) {
      seen.add(String(val));
      const label = labelKey && item[labelKey] ? `${val} - ${item[labelKey]}` : String(val);
      options.push({ value: String(val), label });
    }
  }
  return options.sort((a, b) => a.value.localeCompare(b.value));
}

function mergeOptions(apiOpts: ComboboxOption[], dataOpts: ComboboxOption[]): ComboboxOption[] {
  const map = new Map<string, ComboboxOption>();
  for (const o of apiOpts) map.set(o.value, o);
  for (const o of dataOpts) {
    if (!map.has(o.value)) map.set(o.value, o);
  }
  return Array.from(map.values()).sort((a, b) => a.value.localeCompare(b.value));
}

export function useErpOptions(
  erpReady: boolean,
  tableData?: any[],
  mapping?: FieldMapping
): UseErpOptionsResult {
  const [apiFamilias, setApiFamilias] = useState<ComboboxOption[]>([]);
  const [apiOrigens, setApiOrigens] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);

  const m = mapping || DEFAULT_MAPPING;

  useEffect(() => {
    if (!erpReady) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get<any[]>('/api/familias').catch(() => []),
      api.get<any[]>('/api/origens').catch(() => []),
    ]).then(([fams, oris]) => {
      if (cancelled) return;
      setApiFamilias(
        (fams || []).map((f: any) => ({
          value: f.codigo || f.codfam || String(f),
          label: f.descricao || f.desfam || f.codigo || String(f),
        }))
      );
      setApiOrigens(
        (oris || []).map((o: any) => ({
          value: o.codigo || o.codori || String(o),
          label: o.descricao || o.desori || o.codigo || String(o),
        }))
      );
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [erpReady]);

  const dataFamilias = useMemo(
    () => tableData && m.familiaKey ? extractUnique(tableData, m.familiaKey, m.familiaLabelKey) : [],
    [tableData, m.familiaKey, m.familiaLabelKey]
  );

  const dataOrigens = useMemo(
    () => tableData && m.origemKey ? extractUnique(tableData, m.origemKey, m.origemLabelKey) : [],
    [tableData, m.origemKey, m.origemLabelKey]
  );

  const familias = useMemo(() => mergeOptions(apiFamilias, dataFamilias), [apiFamilias, dataFamilias]);
  const origens = useMemo(() => mergeOptions(apiOrigens, dataOrigens), [apiOrigens, dataOrigens]);

  return { familias, origens, loading };
}
