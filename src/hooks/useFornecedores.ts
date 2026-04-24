import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { ComboboxOption } from '@/components/erp/ComboboxFilter';

interface UseFornecedoresResult {
  fornecedores: ComboboxOption[];
  loading: boolean;
}

// Cache em módulo: uma chamada por sessão.
let cache: ComboboxOption[] | null = null;
let inFlight: Promise<ComboboxOption[]> | null = null;

function normalizeFornecedor(f: any): ComboboxOption | null {
  const codigo =
    f.codigo ?? f.codcli ?? f.codfor ?? f.cod_fornecedor ?? f.id ?? null;
  const fantasia =
    f.fantasia ?? f.nome_fantasia ?? f.apelido ?? f.fantasia_fornecedor ?? null;
  const razao =
    f.razao_social ?? f.nome ?? f.nomcli ?? f.nome_fornecedor ?? f.descricao ?? null;
  const value = String(fantasia || razao || codigo || '').trim();
  if (!value) return null;
  const labelParts: string[] = [];
  if (codigo) labelParts.push(String(codigo));
  if (fantasia) labelParts.push(String(fantasia));
  else if (razao) labelParts.push(String(razao));
  return { value, label: labelParts.join(' - ') || value };
}

function fetchFornecedores(): Promise<ComboboxOption[]> {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;
  inFlight = api
    .get<any>('/api/fornecedores')
    .then((res) => {
      const list: any[] = Array.isArray(res) ? res : res?.dados || res?.data || [];
      const seen = new Set<string>();
      const opts: ComboboxOption[] = [];
      for (const f of list) {
        const opt = normalizeFornecedor(f);
        if (opt && !seen.has(opt.value)) {
          seen.add(opt.value);
          opts.push(opt);
        }
      }
      opts.sort((a, b) => a.label.localeCompare(b.label));
      cache = opts;
      return opts;
    })
    .catch(() => {
      // Silencioso: backend pode não ter o endpoint ainda.
      return [];
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function useFornecedores(
  erpReady: boolean,
  tableData?: any[]
): UseFornecedoresResult {
  const [apiFornecedores, setApiFornecedores] = useState<ComboboxOption[]>(cache || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!erpReady || cache) return;
    let cancelled = false;
    setLoading(true);
    fetchFornecedores()
      .then((opts) => {
        if (!cancelled) setApiFornecedores(opts);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [erpReady]);

  const dataFornecedores = useMemo<ComboboxOption[]>(() => {
    if (!tableData) return [];
    const seen = new Set<string>();
    const opts: ComboboxOption[] = [];
    for (const d of tableData) {
      const name = d?.fantasia_fornecedor || d?.nome_fornecedor;
      if (name && !seen.has(name)) {
        seen.add(name);
        opts.push({ value: String(name), label: String(name) });
      }
    }
    return opts;
  }, [tableData]);

  const fornecedores = useMemo(() => {
    const map = new Map<string, ComboboxOption>();
    for (const o of apiFornecedores) map.set(o.value, o);
    for (const o of dataFornecedores) {
      if (!map.has(o.value)) map.set(o.value, o);
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [apiFornecedores, dataFornecedores]);

  return { fornecedores, loading };
}
