import { api } from './api';

export interface ClientFilterCond {
  gte?: number | string;
  lte?: number | string;
  eq?: number | string | boolean;
  contains?: string;
}

export interface QueryErpArgs {
  module: string;
  filters?: Record<string, any>;
  client_filters?: Record<string, ClientFilterCond>;
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
  baseParams?: Record<string, any>;
  description: string;
  availableFilters: string[];
  example?: string;
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
  },
  'painel-compras': {
    endpoint: '/api/painel-compras',
    defaultOrderBy: 'valor_liquido_total',
    defaultFields: ['numero_oc', 'fornecedor', 'codigo_item', 'descricao_item', 'valor_liquido_total', 'data_emissao'],
    permissionPath: '/painel-compras',
    description: 'Ordens de compra (OCs) com valores e fornecedores.',
    availableFilters: ['codigo_item', 'descricao_item', 'fornecedor', 'numero_oc', 'numero_projeto', 'centro_custo', 'somente_pendentes', 'data_emissao_ini', 'data_emissao_fim', 'situacao_oc', 'tipo_item'],
    example: '"top 5 fornecedores em OCs abertas" → filters:{somente_pendentes:true}, order_by:"valor_liquido_total"',
  },
  'compras-produto': {
    endpoint: '/api/compras-produto',
    defaultOrderBy: 'quantidade',
    defaultFields: ['codpro', 'despro', 'fornecedor', 'quantidade', 'valor_unitario', 'data_emissao'],
    permissionPath: '/compras-produto',
    description: 'Compras e custos históricos por produto.',
    availableFilters: ['codpro', 'despro', 'codfam', 'codori', 'codder', 'somente_com_oc_aberta'],
  },
  'contas-pagar': {
    endpoint: '/api/contas-pagar',
    defaultOrderBy: 'valor_aberto',
    defaultFields: ['numero_titulo', 'fornecedor', 'valor_original', 'valor_aberto', 'data_vencimento'],
    permissionPath: '/contas-pagar',
    description: 'Títulos a pagar (contas a pagar).',
    availableFilters: ['fornecedor', 'numero_titulo', 'data_vencimento_ini', 'data_vencimento_fim', 'somente_em_aberto'],
    example: '"maior título em aberto" → order_by:"valor_aberto"',
  },
  'contas-receber': {
    endpoint: '/api/contas-receber',
    defaultOrderBy: 'valor_aberto',
    defaultFields: ['numero_titulo', 'cliente', 'valor_original', 'valor_aberto', 'data_vencimento'],
    permissionPath: '/contas-receber',
    description: 'Títulos a receber (contas a receber).',
    availableFilters: ['cliente', 'numero_titulo', 'data_vencimento_ini', 'data_vencimento_fim', 'somente_em_aberto'],
  },
  'notas-recebimento': {
    endpoint: '/api/notas-recebimento',
    defaultOrderBy: 'valor_liquido_total',
    defaultFields: ['numero_nf', 'fornecedor', 'codigo_item', 'descricao_item', 'valor_liquido_total', 'data_emissao'],
    permissionPath: '/notas-recebimento',
    description: 'Notas fiscais de entrada (recebimento).',
    availableFilters: ['fornecedor', 'numero_nf', 'codigo_item', 'data_emissao_ini', 'data_emissao_fim'],
  },
  'engenharia-producao': {
    endpoint: '/api/producao/engenharia-x-producao',
    defaultOrderBy: 'data_entrega',
    defaultFields: ['numero_projeto', 'numero_desenho', 'numero_op', 'status_producao', 'kg_patio', 'data_entrega'],
    permissionPath: '/engenharia-producao',
    description: 'Cruzamento Engenharia x Produção por projeto/desenho/OP.',
    availableFilters: ['numero_projeto', 'numero_desenho', 'revisao', 'numero_op', 'origem', 'familia', 'data_entrega_ini', 'data_entrega_fim', 'status_producao', 'unidade_negocio'],
  },
  'apontamento-genius': {
    endpoint: '/api/auditoria-apontamento-genius',
    defaultOrderBy: 'tempo_total_horas',
    defaultFields: ['numero_op', 'operador', 'descricao_op', 'tempo_total_horas', 'data_apontamento'],
    permissionPath: '/auditoria-apontamento-genius',
    description: 'Apontamento de horas em ordens de produção da unidade GENIUS.',
    availableFilters: ['numero_op', 'operador', 'data_inicio', 'data_fim'],
    example: '"OPs Genius acima de 8 horas" → client_filters:{tempo_total_horas:{gte:8}}, order_by:"tempo_total_horas"',
  },
  'producao-saldo-patio': {
    endpoint: '/api/producao/saldo-patio',
    defaultOrderBy: 'kg_patio',
    defaultFields: ['numero_projeto', 'descricao', 'kg_patio', 'dias_em_patio', 'cliente'],
    permissionPath: '/saldo-patio',
    description: 'Peças produzidas aguardando expedição (saldo em pátio).',
    availableFilters: ['numero_projeto', 'cliente', 'data_ini', 'data_fim'],
    example: '"projetos parados há mais de 30 dias no pátio" → client_filters:{dias_em_patio:{gte:30}}',
  },
  'producao-expedido-obra': {
    endpoint: '/api/producao/expedido-obra',
    defaultOrderBy: 'kg_expedido',
    defaultFields: ['numero_projeto', 'cliente', 'kg_expedido', 'data_expedicao'],
    permissionPath: '/expedido-obra',
    description: 'Itens expedidos para obra por projeto.',
    availableFilters: ['numero_projeto', 'cliente', 'data_ini', 'data_fim'],
  },
  'producao-nao-carregados': {
    endpoint: '/api/producao/nao-carregados',
    defaultOrderBy: 'quantidade',
    defaultFields: ['numero_projeto', 'numero_desenho', 'codigo_peca', 'quantidade', 'cliente'],
    permissionPath: '/producao-nao-carregados',
    description: 'Itens produzidos ainda não carregados/expedidos.',
    availableFilters: ['numero_projeto', 'numero_desenho', 'cliente', 'cidade', 'codigo_barras'],
  },
  'producao-lead-time': {
    endpoint: '/api/producao/lead-time',
    defaultOrderBy: 'lead_time_dias',
    defaultFields: ['numero_op', 'numero_projeto', 'lead_time_dias', 'data_inicio', 'data_fim', 'status'],
    permissionPath: '/lead-time-producao',
    description: 'Lead time (dias) de produção por OP.',
    availableFilters: ['numero_op', 'numero_projeto', 'data_ini', 'data_fim'],
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
  },
  'conciliacao-edocs': {
    endpoint: '/api/notas-edocs-conciliacao',
    defaultOrderBy: 'data_emissao',
    defaultFields: ['chave_nfe', 'fornecedor', 'numero_nf', 'situacao', 'divergencias', 'data_emissao'],
    permissionPath: '/conciliacao-edocs',
    description: 'Conciliação de NF-e (eDocs) com divergências de situação/valor.',
    availableFilters: ['fornecedor', 'numero_nf', 'data_emissao_ini', 'data_emissao_fim', 'somente_divergencia'],
  },
  'numero-serie': {
    endpoint: '/api/numero-serie',
    defaultOrderBy: 'numero_serie',
    defaultFields: ['numero_serie', 'numero_op', 'numero_pedido', 'codigo_item', 'status'],
    permissionPath: '/numero-serie',
    description: 'Reserva e consulta de números de série (GS).',
    availableFilters: ['numero_op', 'numero_pedido', 'codigo_item', 'numero_serie'],
  },
  bom: {
    endpoint: '/api/bom',
    defaultOrderBy: 'nivel',
    defaultFields: ['codigo_modelo', 'codigo_componente', 'descricao_componente', 'quantidade', 'nivel'],
    permissionPath: '/bom',
    description: 'Estrutura de produto (BOM). USE FILTROS RESTRITIVOS — pode ter milhares de linhas.',
    availableFilters: ['codigo_modelo', 'codigo_componente'],
  },
  'onde-usa': {
    endpoint: '/api/onde-usa',
    defaultOrderBy: 'quantidade_usada',
    defaultFields: ['codigo_componente', 'codigo_pai', 'descricao_pai', 'quantidade_usada'],
    permissionPath: '/onde-usa',
    description: 'Onde determinado componente é utilizado.',
    availableFilters: ['codcmp', 'dercmp', 'codmod'],
  },
  'estoque-min-max': {
    endpoint: '/api/estoque-min-max',
    defaultOrderBy: 'saldo_atual',
    defaultFields: ['codpro', 'despro', 'saldo_atual', 'estoque_minimo', 'estoque_maximo'],
    permissionPath: '/estoque-min-max',
    description: 'Estoque vs limites mín/máx por produto.',
    availableFilters: ['codpro', 'despro', 'codfam'],
    example: '"produtos abaixo do mínimo" → client_filters:{saldo_atual:{lte:0}} (ou comparar com estoque_minimo no resultado)',
  },
  'sugestao-min-max': {
    endpoint: '/api/sugestao-min-max',
    defaultOrderBy: 'sugestao_compra',
    defaultFields: ['codpro', 'despro', 'sugestao_compra', 'prioridade', 'estoque_minimo'],
    permissionPath: '/sugestao-min-max',
    description: 'Sugestão de compra para reposição mín/máx.',
    availableFilters: ['codpro', 'codfam', 'prioridade'],
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
    if (cfg.example) lines.push(`  ex: ${cfg.example}`);
  }
  lines.push('');
  lines.push('Use "client_filters" {campo:{gte|lte|eq|contains}} quando o backend não tiver o filtro nativo (ex: faixas de horas, dias, valores).');
  return lines.join('\n');
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

export interface QueryErpResult {
  ok: boolean;
  module?: string;
  endpoint?: string;
  total_returned?: number;
  total_in_dataset?: number;
  total_after_client_filters?: number;
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
    return { ok: false, error: `Módulo desconhecido: ${args.module}. Disponíveis: ${SUPPORTED_MODULES.join(', ')}` };
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
    const allRecords: any[] = Array.isArray(resp?.dados)
      ? resp.dados
      : Array.isArray(resp)
        ? resp
        : [];

    const filtered = applyClientFilters(allRecords, args.client_filters);
    const ranked = rankRecords(filtered, orderBy, orderDir, topN, fields);

    return {
      ok: true,
      module: args.module,
      endpoint: cfg.endpoint,
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
