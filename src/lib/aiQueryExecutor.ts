import { api } from './api';

export interface QueryErpArgs {
  module: string;
  filters?: Record<string, any>;
  order_by?: string;
  order_dir?: 'asc' | 'desc';
  top_n?: number;
  fields?: string[];
}

interface ModuleConfig {
  endpoint: string;
  defaultOrderBy: string;
  defaultFields: string[];
  permissionPath: string;
  // Filters that backend always accepts
  baseParams?: Record<string, any>;
}

const MODULE_MAP: Record<string, ModuleConfig> = {
  estoque: {
    endpoint: '/api/estoque',
    defaultOrderBy: 'saldo',
    defaultFields: ['codpro', 'despro', 'saldo', 'coddep', 'codfam'],
    permissionPath: '/estoque',
    baseParams: { somente_com_estoque: true },
  },
  'painel-compras': {
    endpoint: '/api/painel-compras',
    defaultOrderBy: 'valor_liquido_total',
    defaultFields: ['numero_oc', 'fornecedor', 'codigo_item', 'descricao_item', 'valor_liquido_total', 'data_emissao'],
    permissionPath: '/painel-compras',
  },
  'compras-produto': {
    endpoint: '/api/compras-produto',
    defaultOrderBy: 'quantidade',
    defaultFields: ['codpro', 'despro', 'fornecedor', 'quantidade', 'valor_unitario', 'data_emissao'],
    permissionPath: '/compras-produto',
  },
  'contas-pagar': {
    endpoint: '/api/contas-pagar',
    defaultOrderBy: 'valor_aberto',
    defaultFields: ['numero_titulo', 'fornecedor', 'valor_original', 'valor_aberto', 'data_vencimento'],
    permissionPath: '/contas-pagar',
  },
  'contas-receber': {
    endpoint: '/api/contas-receber',
    defaultOrderBy: 'valor_aberto',
    defaultFields: ['numero_titulo', 'cliente', 'valor_original', 'valor_aberto', 'data_vencimento'],
    permissionPath: '/contas-receber',
  },
  'notas-recebimento': {
    endpoint: '/api/notas-recebimento',
    defaultOrderBy: 'valor_liquido_total',
    defaultFields: ['numero_nf', 'fornecedor', 'codigo_item', 'descricao_item', 'valor_liquido_total', 'data_emissao'],
    permissionPath: '/notas-recebimento',
  },
  'engenharia-producao': {
    endpoint: '/api/engenharia-producao',
    defaultOrderBy: 'data_entrega',
    defaultFields: ['numero_projeto', 'numero_desenho', 'numero_op', 'status_producao', 'data_entrega'],
    permissionPath: '/engenharia-producao',
  },
};

export function getModuleConfig(module: string): ModuleConfig | null {
  return MODULE_MAP[module] || null;
}

export function rankRecords<T extends Record<string, any>>(
  records: T[],
  orderBy: string,
  dir: 'asc' | 'desc',
  topN: number,
  fields: string[]
): Partial<T>[] {
  const sign = dir === 'asc' ? 1 : -1;
  const sorted = [...records].sort((a, b) => {
    const av = a?.[orderBy];
    const bv = b?.[orderBy];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;
    const as = String(av);
    const bs = String(bv);
    // try numeric
    const an = parseFloat(as.replace(/\./g, '').replace(',', '.'));
    const bn = parseFloat(bs.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sign;
    return as.localeCompare(bs) * sign;
  });
  const limited = sorted.slice(0, Math.max(1, Math.min(topN, 50)));
  if (!fields?.length) return limited;
  return limited.map((r) => {
    const out: Record<string, any> = {};
    for (const f of fields) out[f] = r[f];
    return out;
  });
}

export interface QueryErpResult {
  ok: boolean;
  module?: string;
  endpoint?: string;
  total_returned?: number;
  total_in_dataset?: number;
  order_by?: string;
  order_dir?: 'asc' | 'desc';
  top_n?: number;
  records?: any[];
  error?: string;
}

export async function executeQueryErpData(
  args: QueryErpArgs,
  canViewPath: (path: string) => boolean,
  hasPermissions: boolean
): Promise<QueryErpResult> {
  const cfg = getModuleConfig(args.module);
  if (!cfg) {
    return { ok: false, error: `Módulo desconhecido: ${args.module}` };
  }
  if (hasPermissions && !canViewPath(cfg.permissionPath)) {
    return { ok: false, error: `Sem permissão para consultar o módulo ${args.module}.` };
  }

  const orderBy = args.order_by || cfg.defaultOrderBy;
  const orderDir = args.order_dir === 'asc' ? 'asc' : 'desc';
  const topN = Math.max(1, Math.min(Number(args.top_n) || 10, 50));
  const fields = args.fields?.length ? args.fields : cfg.defaultFields;

  const params: Record<string, any> = {
    ...(cfg.baseParams || {}),
    ...(args.filters || {}),
    pagina: 1,
    tamanho_pagina: 200,
  };

  try {
    const resp = await api.get<any>(cfg.endpoint, params);
    const records: any[] = Array.isArray(resp?.dados)
      ? resp.dados
      : Array.isArray(resp)
        ? resp
        : [];

    const ranked = rankRecords(records, orderBy, orderDir, topN, fields);

    return {
      ok: true,
      module: args.module,
      endpoint: cfg.endpoint,
      total_returned: ranked.length,
      total_in_dataset: resp?.total_registros ?? records.length,
      order_by: orderBy,
      order_dir: orderDir,
      top_n: topN,
      records: ranked,
    };
  } catch (e: any) {
    const status = e?.statusCode;
    if (status === 401) {
      return {
        ok: false,
        error: 'Conexão com o ERP indisponível ou sessão expirada. Verifique nas Configurações.',
      };
    }
    return {
      ok: false,
      error: e?.message || 'Falha ao consultar o ERP.',
    };
  }
}
