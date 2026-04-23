import { api } from './api';

export interface ClientFilterCond {
  gte?: number | string;
  lte?: number | string;
  gt?: number | string;
  lt?: number | string;
  eq?: number | string | boolean;
  contains?: string;
}

export type AggregateOp = 'count' | 'count_distinct' | 'sum' | 'avg';

export interface QueryErpArgs {
  module: string;
  filters?: Record<string, any>;
  client_filters?: Record<string, ClientFilterCond>;
  order_by?: string;
  order_dir?: 'asc' | 'desc';
  top_n?: number;
  fields?: string[];
  aggregate?: AggregateOp;
  distinct_field?: string;
  sum_field?: string;
  scope?: 'page' | 'global';
}

interface CountUnit {
  field: string;
  label: string;
}

interface ModuleConfig {
  endpoint: string;
  defaultOrderBy: string;
  defaultFields: string[];
  permissionPath: string;
  baseParams?: Record<string, any>;
  description: string;
  availableFilters: string[];
  example?: string;
  countUnit?: CountUnit;
  /**
   * Mapeia nomes "humanos" que a IA pode pedir → nome real do campo no payload do backend.
   * Aplicado a: distinct_field, sum_field, order_by, fields, e chaves de client_filters.
   * Ex.: { fornecedor: 'fantasia_fornecedor', valor_liquido_total: 'valor_liquido' }
   */
  fieldAliases?: Record<string, string>;
}

const MODULE_MAP: Record<string, ModuleConfig> = {
  estoque: {
    endpoint: '/api/estoque',
    defaultOrderBy: 'saldo',
    defaultFields: ['codpro', 'despro', 'saldo', 'coddep', 'codfam'],
    permissionPath: '/estoque',
    baseParams: { somente_com_estoque: true },
    description: 'Consulta de saldos em estoque por produto/depósito.',
    availableFilters: ['codpro', 'despro', 'codfam', 'codori', 'coddep', 'somente_com_estoque'],
    example: '"qual produto tem mais estoque?" → order_by:"saldo", top_n:10',
    countUnit: { field: 'codpro', label: 'produtos' },
  },
  'painel-compras': {
    endpoint: '/api/painel-compras',
    defaultOrderBy: 'valor_liquido',
    defaultFields: ['numero_oc', 'fantasia_fornecedor', 'codigo_item', 'descricao_item', 'valor_liquido', 'data_emissao', 'data_entrega', 'dias_atraso'],
    permissionPath: '/painel-compras',
    description: 'Ordens de compra (OCs) com valores e fornecedores. ATENÇÃO: 1 OC = N linhas (uma por item). Campo de fornecedor é fantasia_fornecedor.',
    availableFilters: ['codigo_item', 'descricao_item', 'fornecedor', 'numero_oc', 'numero_projeto', 'centro_custo', 'somente_pendentes', 'data_emissao_ini', 'data_emissao_fim', 'situacao_oc', 'tipo_item'],
    example: '"quantas OCs em aberto?" → aggregate:"count_distinct", distinct_field:"numero_oc", filters:{somente_pendentes:true}',
    countUnit: { field: 'numero_oc', label: 'OCs' },
    fieldAliases: {
      fornecedor: 'fantasia_fornecedor',
      nome_fornecedor: 'fantasia_fornecedor',
      valor_liquido_total: 'valor_liquido',
      valor: 'valor_liquido',
      atraso: 'dias_atraso',
    },
  },
  'compras-produto': {
    endpoint: '/api/compras-produto',
    defaultOrderBy: 'quantidade',
    defaultFields: ['codpro', 'despro', 'fornecedor', 'quantidade', 'valor_unitario', 'data_emissao'],
    permissionPath: '/compras-produto',
    description: 'Compras e custos históricos por produto.',
    availableFilters: ['codpro', 'despro', 'codfam', 'codori', 'codder', 'somente_com_oc_aberta'],
    countUnit: { field: 'codpro', label: 'produtos' },
  },
  'contas-pagar': {
    endpoint: '/api/contas-pagar',
    defaultOrderBy: 'valor_aberto',
    defaultFields: ['tipo_titulo', 'numero_titulo', 'parcela', 'fornecedor', 'valor_original', 'valor_aberto', 'data_vencimento', 'status_titulo'],
    permissionPath: '/contas-pagar',
    description: 'Títulos a pagar. ATENÇÃO: numero_titulo é busca por SUBSTRING — sozinho NUNCA identifica um título único (ex: "1669" casa também 11669, 21669, 116691...). Para abrir 1 título específico, use cerca de filtros: valor_min≈valor_max (valor exato) + data_vencimento_ini=data_vencimento_fim (vencimento exato) + somente_em_aberto:true quando o contexto for "em aberto".',
    availableFilters: ['fornecedor', 'numero_titulo', 'data_vencimento_ini', 'data_vencimento_fim', 'somente_em_aberto', 'somente_vencidos', 'tipo_titulo', 'valor_min', 'valor_max'],
    example: '"abrir o título de R$ 485.481,43 com vencimento 20/04/2026" → filters:{valor_min:485481.43, valor_max:485481.44, data_vencimento_ini:"2026-04-20", data_vencimento_fim:"2026-04-20", somente_em_aberto:true}',
    countUnit: { field: 'numero_titulo', label: 'títulos' },
  },
  'contas-receber': {
    endpoint: '/api/contas-receber',
    defaultOrderBy: 'valor_aberto',
    defaultFields: ['tipo_titulo', 'numero_titulo', 'parcela', 'cliente', 'valor_original', 'valor_aberto', 'data_vencimento', 'status_titulo'],
    permissionPath: '/contas-receber',
    description: 'Títulos a receber. ATENÇÃO: numero_titulo é busca por SUBSTRING — sozinho NUNCA identifica um título único. Para abrir 1 título específico, use cerca de filtros: valor_min≈valor_max + data_vencimento_ini=data_vencimento_fim + somente_em_aberto:true quando o contexto for "em aberto".',
    availableFilters: ['cliente', 'numero_titulo', 'data_vencimento_ini', 'data_vencimento_fim', 'somente_em_aberto', 'somente_vencidos', 'tipo_titulo', 'valor_min', 'valor_max'],
    example: '"abrir o título de R$ 12.000 com vencimento 15/05/2026" → filters:{valor_min:12000, valor_max:12000.01, data_vencimento_ini:"2026-05-15", data_vencimento_fim:"2026-05-15", somente_em_aberto:true}',
    countUnit: { field: 'numero_titulo', label: 'títulos' },
  },
  'notas-recebimento': {
    endpoint: '/api/notas-recebimento',
    defaultOrderBy: 'valor_liquido_total',
    defaultFields: ['numero_nf', 'fornecedor', 'codigo_item', 'descricao_item', 'valor_liquido_total', 'data_emissao'],
    permissionPath: '/notas-recebimento',
    description: 'Notas fiscais de entrada (recebimento).',
    availableFilters: ['fornecedor', 'numero_nf', 'codigo_item', 'data_emissao_ini', 'data_emissao_fim'],
    countUnit: { field: 'numero_nf', label: 'NFs' },
  },
  'engenharia-producao': {
    endpoint: '/api/producao/engenharia-x-producao',
    defaultOrderBy: 'data_entrega',
    defaultFields: ['numero_projeto', 'numero_desenho', 'numero_op', 'status_producao', 'kg_patio', 'data_entrega'],
    permissionPath: '/engenharia-producao',
    description: 'Cruzamento Engenharia x Produção por projeto/desenho/OP.',
    availableFilters: ['numero_projeto', 'numero_desenho', 'revisao', 'numero_op', 'origem', 'familia', 'data_entrega_ini', 'data_entrega_fim', 'status_producao', 'unidade_negocio'],
    countUnit: { field: 'numero_op', label: 'OPs' },
  },
  'apontamento-genius': {
    endpoint: '/api/auditoria-apontamento-genius',
    defaultOrderBy: 'tempo_total_horas',
    defaultFields: ['numero_op', 'operador', 'descricao_op', 'tempo_total_horas', 'data_apontamento'],
    permissionPath: '/auditoria-apontamento-genius',
    description: 'Apontamento de horas em ordens de produção da unidade GENIUS.',
    availableFilters: ['numero_op', 'operador', 'data_inicio', 'data_fim'],
    example: '"OPs Genius acima de 8 horas" → client_filters:{tempo_total_horas:{gte:8}}, order_by:"tempo_total_horas"',
    countUnit: { field: 'numero_op', label: 'OPs' },
  },
  'producao-saldo-patio': {
    endpoint: '/api/producao/saldo-patio',
    defaultOrderBy: 'kg_patio',
    defaultFields: ['numero_projeto', 'descricao', 'kg_patio', 'dias_em_patio', 'cliente'],
    permissionPath: '/saldo-patio',
    description: 'Peças produzidas aguardando expedição (saldo em pátio).',
    availableFilters: ['numero_projeto', 'cliente', 'data_ini', 'data_fim'],
    example: '"projetos parados há mais de 30 dias no pátio" → client_filters:{dias_em_patio:{gte:30}}',
    countUnit: { field: 'numero_projeto', label: 'projetos' },
  },
  'producao-expedido-obra': {
    endpoint: '/api/producao/expedido-obra',
    defaultOrderBy: 'kg_expedido',
    defaultFields: ['numero_projeto', 'cliente', 'kg_expedido', 'data_expedicao'],
    permissionPath: '/expedido-obra',
    description: 'Itens expedidos para obra por projeto.',
    availableFilters: ['numero_projeto', 'cliente', 'data_ini', 'data_fim'],
    countUnit: { field: 'numero_projeto', label: 'projetos' },
  },
  'producao-nao-carregados': {
    endpoint: '/api/producao/nao-carregados',
    defaultOrderBy: 'quantidade',
    defaultFields: ['numero_projeto', 'numero_desenho', 'codigo_peca', 'quantidade', 'cliente'],
    permissionPath: '/producao-nao-carregados',
    description: 'Itens produzidos ainda não carregados/expedidos.',
    availableFilters: ['numero_projeto', 'numero_desenho', 'cliente', 'cidade', 'codigo_barras'],
    countUnit: { field: 'numero_projeto', label: 'projetos' },
  },
  'producao-lead-time': {
    endpoint: '/api/producao/lead-time',
    defaultOrderBy: 'lead_time_dias',
    defaultFields: ['numero_op', 'numero_projeto', 'lead_time_dias', 'data_inicio', 'data_fim', 'status'],
    permissionPath: '/lead-time-producao',
    description: 'Lead time (dias) de produção por OP.',
    availableFilters: ['numero_op', 'numero_projeto', 'data_ini', 'data_fim'],
    countUnit: { field: 'numero_op', label: 'OPs' },
  },
  'producao-produzido-periodo': {
    endpoint: '/api/producao/produzido-periodo',
    defaultOrderBy: 'kg_produzido',
    defaultFields: ['data', 'kg_produzido', 'qtd_ops', 'unidade_negocio'],
    permissionPath: '/produzido-periodo',
    description: 'Produção total por período (kg, qtd OPs).',
    availableFilters: ['data_ini', 'data_fim', 'unidade_negocio'],
  },
  'auditoria-tributaria': {
    endpoint: '/api/auditoria-tributaria',
    defaultOrderBy: 'divergencia_valor',
    defaultFields: ['numero_nf', 'fornecedor', 'divergencia_valor', 'data_emissao', 'tipo_divergencia'],
    permissionPath: '/auditoria-tributaria',
    description: 'Auditoria de notas fiscais com divergências tributárias.',
    availableFilters: ['fornecedor', 'numero_nf', 'data_ini', 'data_fim', 'somente_com_divergencia'],
    countUnit: { field: 'numero_nf', label: 'NFs' },
  },
  'conciliacao-edocs': {
    endpoint: '/api/notas-edocs-conciliacao',
    defaultOrderBy: 'data_emissao',
    defaultFields: ['chave_nfe', 'fornecedor', 'numero_nf', 'situacao', 'divergencias', 'data_emissao'],
    permissionPath: '/conciliacao-edocs',
    description: 'Conciliação de NF-e (eDocs) com divergências de situação/valor.',
    availableFilters: ['fornecedor', 'numero_nf', 'data_emissao_ini', 'data_emissao_fim', 'somente_divergencia'],
    countUnit: { field: 'chave_nfe', label: 'NF-e' },
  },
  'numero-serie': {
    endpoint: '/api/numero-serie',
    defaultOrderBy: 'numero_serie',
    defaultFields: ['numero_serie', 'numero_op', 'numero_pedido', 'codigo_item', 'status'],
    permissionPath: '/numero-serie',
    description: 'Reserva e consulta de números de série (GS).',
    availableFilters: ['numero_op', 'numero_pedido', 'codigo_item', 'numero_serie'],
    countUnit: { field: 'numero_serie', label: 'números de série' },
  },
  bom: {
    endpoint: '/api/bom',
    defaultOrderBy: 'nivel',
    defaultFields: ['codigo_modelo', 'codigo_componente', 'descricao_componente', 'quantidade', 'nivel'],
    permissionPath: '/bom',
    description: 'Estrutura de produto (BOM). USE FILTROS RESTRITIVOS — pode ter milhares de linhas.',
    availableFilters: ['codigo_modelo', 'codigo_componente'],
    countUnit: { field: 'codigo_componente', label: 'componentes' },
  },
  'onde-usa': {
    endpoint: '/api/onde-usa',
    defaultOrderBy: 'quantidade_usada',
    defaultFields: ['codigo_componente', 'codigo_pai', 'descricao_pai', 'quantidade_usada'],
    permissionPath: '/onde-usa',
    description: 'Onde determinado componente é utilizado.',
    availableFilters: ['codcmp', 'dercmp', 'codmod'],
    countUnit: { field: 'codigo_pai', label: 'modelos' },
  },
  'estoque-min-max': {
    endpoint: '/api/estoque-min-max',
    defaultOrderBy: 'saldo_atual',
    defaultFields: ['codpro', 'despro', 'saldo_atual', 'estoque_minimo', 'estoque_maximo'],
    permissionPath: '/estoque-min-max',
    description: 'Estoque vs limites mín/máx por produto.',
    availableFilters: ['codpro', 'despro', 'codfam'],
    example: '"produtos abaixo do mínimo" → client_filters:{saldo_atual:{lte:0}} (ou comparar com estoque_minimo no resultado)',
    countUnit: { field: 'codpro', label: 'produtos' },
  },
  'sugestao-min-max': {
    endpoint: '/api/sugestao-min-max',
    defaultOrderBy: 'sugestao_compra',
    defaultFields: ['codpro', 'despro', 'sugestao_compra', 'prioridade', 'estoque_minimo'],
    permissionPath: '/sugestao-min-max',
    description: 'Sugestão de compra para reposição mín/máx.',
    availableFilters: ['codpro', 'codfam', 'prioridade'],
    countUnit: { field: 'codpro', label: 'produtos' },
  },
};

export const SUPPORTED_MODULES = Object.keys(MODULE_MAP);

export function getModuleConfig(module: string): ModuleConfig | null {
  return MODULE_MAP[module] || null;
}

export function buildModulesCatalog(): string {
  const lines: string[] = ['MÓDULOS DISPONÍVEIS PARA query_erp_data (use o nome exato em "module"):'];
  for (const [key, cfg] of Object.entries(MODULE_MAP)) {
    lines.push(`- ${key}: ${cfg.description}`);
    lines.push(`  campos principais: ${cfg.defaultFields.join(', ')}`);
    lines.push(`  filtros: ${cfg.availableFilters.join(', ')}`);
    lines.push(`  ordenação padrão: ${cfg.defaultOrderBy}`);
    if (cfg.countUnit) lines.push(`  unidade de contagem: ${cfg.countUnit.field} (${cfg.countUnit.label})`);
    if (cfg.example) lines.push(`  ex: ${cfg.example}`);
  }
  lines.push('');
  lines.push('Use "client_filters" {campo:{gte|lte|gt|lt|eq|contains}} quando o backend não tiver o filtro nativo.');
  lines.push('Para CONTAGENS use aggregate:"count_distinct" + distinct_field (use o campo de "unidade de contagem" do módulo). Para SOMAS use aggregate:"sum" + sum_field.');
  return lines.join('\n');
}

function resolveField(cfg: ModuleConfig, name: string | undefined): string | undefined {
  if (!name) return name;
  return cfg.fieldAliases?.[name] || name;
}

function resolveClientFilters(
  cfg: ModuleConfig,
  cf?: Record<string, ClientFilterCond>
): Record<string, ClientFilterCond> | undefined {
  if (!cf) return cf;
  const out: Record<string, ClientFilterCond> = {};
  for (const [k, v] of Object.entries(cf)) {
    out[resolveField(cfg, k)!] = v;
  }
  return out;
}

function applyClientFilters(records: any[], cf?: Record<string, ClientFilterCond>): any[] {
  if (!cf) return records;
  return records.filter((r) => {
    for (const [field, cond] of Object.entries(cf)) {
      const raw = r?.[field];
      const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/\./g, '').replace(',', '.'));
      if (cond.gte != null) {
        const target = typeof cond.gte === 'number' ? cond.gte : parseFloat(String(cond.gte));
        if (isNaN(num) || num < target) return false;
      }
      if (cond.lte != null) {
        const target = typeof cond.lte === 'number' ? cond.lte : parseFloat(String(cond.lte));
        if (isNaN(num) || num > target) return false;
      }
      if (cond.gt != null) {
        const target = typeof cond.gt === 'number' ? cond.gt : parseFloat(String(cond.gt));
        if (isNaN(num) || num <= target) return false;
      }
      if (cond.lt != null) {
        const target = typeof cond.lt === 'number' ? cond.lt : parseFloat(String(cond.lt));
        if (isNaN(num) || num >= target) return false;
      }
      if (cond.eq != null) {
        if (raw !== cond.eq && String(raw) !== String(cond.eq)) return false;
      }
      if (cond.contains != null) {
        if (!String(raw ?? '').toLowerCase().includes(String(cond.contains).toLowerCase())) return false;
      }
    }
    return true;
  });
}

export function rankRecords(
  records: any[],
  orderBy: string,
  dir: 'asc' | 'desc',
  topN: number,
  fields: string[]
): Record<string, any>[] {
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

function toNumber(raw: any): number {
  if (typeof raw === 'number') return raw;
  if (raw == null) return NaN;
  return parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
}

export interface QueryErpResult {
  ok: boolean;
  module?: string;
  endpoint?: string;
  scope?: 'page' | 'global';
  total_returned?: number;
  total_in_dataset?: number;
  total_after_client_filters?: number;
  order_by?: string;
  order_dir?: 'asc' | 'desc';
  top_n?: number;
  records?: any[];
  // Aggregate results
  aggregate?: AggregateOp;
  field?: string;
  value?: number;
  total_lines_scanned?: number;
  partial?: boolean;
  error?: string;
}

const MAX_AGG_PAGES = 5;
const AGG_PAGE_SIZE = 200;

async function executeAggregate(
  cfg: ModuleConfig,
  args: QueryErpArgs,
  baseParams: Record<string, any>
): Promise<QueryErpResult> {
  const op = args.aggregate as AggregateOp;
  const hasClientFilters = !!(args.client_filters && Object.keys(args.client_filters).length);

  // Fast path: simple count without client filters → 1 request, read total_registros
  if (op === 'count' && !hasClientFilters) {
    const params = { ...baseParams, pagina: 1, tamanho_pagina: 1 };
    const resp = await api.get<any>(cfg.endpoint, params);
    const total = resp?.total_registros ?? (Array.isArray(resp?.dados) ? resp.dados.length : Array.isArray(resp) ? resp.length : 0);
    return {
      ok: true,
      module: args.module,
      endpoint: cfg.endpoint,
      scope: args.scope || 'global',
      aggregate: 'count',
      value: total,
      total_lines_scanned: total,
    };
  }

  // Otherwise paginate up to MAX_AGG_PAGES
  const all: any[] = [];
  let totalRegistros = 0;
  for (let page = 1; page <= MAX_AGG_PAGES; page++) {
    const params = { ...baseParams, pagina: page, tamanho_pagina: AGG_PAGE_SIZE };
    const resp = await api.get<any>(cfg.endpoint, params);
    const rows: any[] = Array.isArray(resp?.dados) ? resp.dados : Array.isArray(resp) ? resp : [];
    if (page === 1) totalRegistros = resp?.total_registros ?? rows.length;
    all.push(...rows);
    if (rows.length < AGG_PAGE_SIZE) break;
  }

  const resolvedCf = resolveClientFilters(cfg, args.client_filters);
  const filtered = applyClientFilters(all, resolvedCf);
  const partial = totalRegistros > all.length;

  let value = 0;
  let field: string | undefined;

  if (op === 'count') {
    value = hasClientFilters ? filtered.length : totalRegistros;
  } else if (op === 'count_distinct') {
    field = resolveField(cfg, args.distinct_field) || cfg.countUnit?.field;
    if (!field) {
      return { ok: false, error: 'count_distinct requer distinct_field (ou countUnit no módulo).' };
    }
    const set = new Set<string>();
    for (const r of filtered) {
      const v = r?.[field];
      if (v != null && v !== '') set.add(String(v));
    }
    value = set.size;
  } else if (op === 'sum' || op === 'avg') {
    field = resolveField(cfg, args.sum_field);
    if (!field) {
      return { ok: false, error: `${op} requer sum_field.` };
    }
    let sum = 0;
    let n = 0;
    for (const r of filtered) {
      const num = toNumber(r?.[field]);
      if (!isNaN(num)) {
        sum += num;
        n++;
      }
    }
    value = op === 'sum' ? sum : n > 0 ? sum / n : 0;
  } else {
    return { ok: false, error: `Operação aggregate inválida: ${op}` };
  }

  return {
    ok: true,
    module: args.module,
    endpoint: cfg.endpoint,
    scope: args.scope || 'global',
    aggregate: op,
    field,
    value,
    total_lines_scanned: all.length,
    total_in_dataset: totalRegistros,
    total_after_client_filters: filtered.length,
    partial,
  };
}

export async function executeQueryErpData(
  args: QueryErpArgs,
  canViewPath: (path: string) => boolean,
  hasPermissions: boolean
): Promise<QueryErpResult> {
  const cfg = getModuleConfig(args.module);
  if (!cfg) {
    return { ok: false, error: `Módulo desconhecido: ${args.module}. Disponíveis: ${SUPPORTED_MODULES.join(', ')}` };
  }
  if (hasPermissions && !canViewPath(cfg.permissionPath)) {
    return { ok: false, error: `Sem permissão para consultar o módulo ${args.module}.` };
  }

  const scope: 'page' | 'global' = args.scope === 'page' ? 'page' : 'global';

  // For global scope, do NOT inherit page filters — only baseParams + explicit args.filters
  const params: Record<string, any> = {
    ...(cfg.baseParams || {}),
    ...(args.filters || {}),
  };

  try {
    // Aggregate path
    if (args.aggregate) {
      return await executeAggregate(cfg, { ...args, scope }, params);
    }

    // Regular top-N path
    const orderBy = resolveField(cfg, args.order_by) || cfg.defaultOrderBy;
    const orderDir = args.order_dir === 'asc' ? 'asc' : 'desc';
    const topN = Math.max(1, Math.min(Number(args.top_n) || 10, 50));
    const requestedFields = args.fields?.length ? args.fields : cfg.defaultFields;
    const fields = requestedFields.map((f) => resolveField(cfg, f) || f);

    const resp = await api.get<any>(cfg.endpoint, { ...params, pagina: 1, tamanho_pagina: 200 });
    const allRecords: any[] = Array.isArray(resp?.dados)
      ? resp.dados
      : Array.isArray(resp)
        ? resp
        : [];

    const filtered = applyClientFilters(allRecords, resolveClientFilters(cfg, args.client_filters));
    const ranked = rankRecords(filtered, orderBy, orderDir, topN, fields);

    return {
      ok: true,
      module: args.module,
      endpoint: cfg.endpoint,
      scope,
      total_returned: ranked.length,
      total_in_dataset: resp?.total_registros ?? allRecords.length,
      total_after_client_filters: filtered.length,
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
