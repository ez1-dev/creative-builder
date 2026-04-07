import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ComboboxOption } from '@/components/erp/ComboboxFilter';

interface UseErpOptionsResult {
  familias: ComboboxOption[];
  origens: ComboboxOption[];
  loading: boolean;
}

export function useErpOptions(erpReady: boolean): UseErpOptionsResult {
  const [familias, setFamilias] = useState<ComboboxOption[]>([]);
  const [origens, setOrigens] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!erpReady) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get<any[]>('/api/familias').catch(() => []),
      api.get<any[]>('/api/origens').catch(() => []),
    ]).then(([fams, oris]) => {
      if (cancelled) return;
      setFamilias(
        (fams || []).map((f: any) => ({
          value: f.codigo || f.codfam || String(f),
          label: f.descricao || f.desfam || f.codigo || String(f),
        }))
      );
      setOrigens(
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

  return { familias, origens, loading };
}
