import { api } from '@/lib/api';

export interface CadastroOption {
  codigo: string;
  descricao: string;
  label: string;
  fantasia?: string;
}

interface CacheEntry { ts: number; data: CadastroOption[]; }
const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function getCached(key: string): CadastroOption[] | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > TTL_MS) { cache.delete(key); return null; }
  return e.data;
}
function setCached(key: string, data: CadastroOption[]) {
  if (cache.size > 200) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { ts: Date.now(), data });
}

function normalize(item: any, defaults?: { descKey?: string; codeKey?: string }): CadastroOption | null {
  const codigo = item?.codigo ?? item?.[defaults?.codeKey ?? ''] ?? null;
  const descricao = item?.descricao ?? item?.[defaults?.descKey ?? ''] ?? '';
  if (codigo == null || codigo === '') return null;
  const code = String(codigo).trim();
  const desc = String(descricao ?? '').trim();
  const label = item?.label ?? (desc ? `${code} - ${desc}` : code);
  return { codigo: code, descricao: desc, label: String(label), fantasia: item?.fantasia };
}

async function fetchList(endpoint: string, q: string, defaults?: { descKey?: string; codeKey?: string }): Promise<CadastroOption[]> {
  const key = `${endpoint}|${q.trim().toLowerCase()}`;
  const cached = getCached(key);
  if (cached) return cached;
  try {
    const res = await api.get<any>(endpoint, q ? { q } : undefined);
    const list: any[] = Array.isArray(res) ? res : res?.dados || res?.data || res?.itens || [];
    const opts: CadastroOption[] = [];
    const seen = new Set<string>();
    for (const it of list) {
      const opt = normalize(it, defaults);
      if (opt && !seen.has(opt.codigo)) { seen.add(opt.codigo); opts.push(opt); }
    }
    setCached(key, opts);
    return opts;
  } catch {
    return [];
  }
}

export const fetchFornecedoresCadastro = (q: string) =>
  fetchList('/api/cadastros/fornecedores', q, { codeKey: 'CodFor', descKey: 'NomFor' });

export const fetchCentrosCusto = (q: string) =>
  fetchList('/api/cadastros/centros-custo', q, { codeKey: 'CodCcu', descKey: 'DesCcu' });

export const fetchDepositos = (q: string) =>
  fetchList('/api/cadastros/depositos', q, { codeKey: 'CodDep', descKey: 'DesDep' });

export const fetchTransacoesCompras = (q: string) =>
  fetchList('/api/cadastros/transacoes-compras', q, { codeKey: 'CodTns', descKey: 'DesTns' });
