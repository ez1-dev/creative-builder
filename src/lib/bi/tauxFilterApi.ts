import { getTauxData } from '@/lib/bi/tauxApi';

export interface TauxOption {
  value: string;
  label: string;
  raw: Record<string, unknown>;
}

function pickLabel(row: Record<string, unknown>): string {
  const preferred = ['nome', 'descricao', 'razao_social', 'nome_fantasia', 'label', 'titulo'];
  for (const k of preferred) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  for (const [, v] of Object.entries(row)) {
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

function pickValue(row: Record<string, unknown>): string {
  const preferred = ['codigo', 'cod', 'id', 'chave'];
  for (const k of preferred) {
    if (row[k] != null) return String(row[k]);
  }
  for (const [k, v] of Object.entries(row)) {
    if (/_id$|^id$|codigo|chave/i.test(k) && v != null) return String(v);
  }
  const first = Object.values(row)[0];
  return first != null ? String(first) : '';
}

async function fetchOptions(nome: string, q = '', limit = 50): Promise<TauxOption[]> {
  const resp = await getTauxData(nome, { q, limit, offset: 0 });
  return resp.data.map((row) => ({
    value: pickValue(row),
    label: pickLabel(row) || pickValue(row),
    raw: row,
  }));
}

export const tauxFilters = {
  clientes: (q = '', limit = 50) => fetchOptions('TAUX_CLIENTE', q, limit),
  produtos: (q = '', limit = 50) => fetchOptions('TAUX_PRODUTO', q, limit),
  representantes: (q = '', limit = 50) => fetchOptions('TAUX_REPRESENTANTE', q, limit),
  familias: (q = '', limit = 50) => fetchOptions('TAUX_FAMILIA_PRODUTO', q, limit),
  filiais: (q = '', limit = 50) => fetchOptions('TAUX_FILIAL', q, limit),
  centroCustos: (q = '', limit = 50) => fetchOptions('TAUX_CENTRO_CUSTOS', q, limit),
  fornecedores: (q = '', limit = 50) => fetchOptions('TAUX_FORNECEDOR', q, limit),
  empresas: (q = '', limit = 50) => fetchOptions('TAUX_EMPRESA', q, limit),
};

export { fetchOptions as fetchTauxOptions };
