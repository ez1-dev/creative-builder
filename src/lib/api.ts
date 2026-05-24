import { logError } from './errorLogger';

let _apiBaseUrl: string | null = null;

const stripTrailingSlash = (u: string) => u.replace(/\/$/, '');

const getApiBaseUrl = () => {
  if (_apiBaseUrl) return stripTrailingSlash(_apiBaseUrl);
  const envBase =
    (import.meta as any).env?.VITE_API_BASE_URL ||
    (import.meta as any).env?.VITE_API_URL ||
    (import.meta as any).env?.VITE_ERP_API_URL;
  if (envBase) return stripTrailingSlash(envBase);
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'http://localhost:8000';
};

export const setApiBaseUrl = (url: string) => {
  _apiBaseUrl = url;
};

export const getApiUrl = getApiBaseUrl;

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('erp_token', token);
    } else {
      localStorage.removeItem('erp_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('erp_token');
    }
    return this.token;
  }

  getUser(): string | null {
    return localStorage.getItem('erp_user');
  }

  setUser(user: string | null) {
    if (user) {
      localStorage.setItem('erp_user', user);
    } else {
      localStorage.removeItem('erp_user');
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout() {
    this.token = null;
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      // fetch lança TypeError("Failed to fetch") quando: servidor offline,
      // CORS bloqueia preflight, túnel ngrok caiu, DNS falha, ou timeout de rede.
      const baseUrl = getApiBaseUrl();
      const friendly =
        `Não foi possível conectar ao servidor ERP (${endpoint}). ` +
        `Verifique se o backend FastAPI está online e se a URL configurada em Configurações está correta. ` +
        `URL atual: ${baseUrl}`;
      logError({
        module: endpoint,
        message: friendly,
        statusCode: 0,
        details: { originalError: networkErr?.message, baseUrl },
      });
      const err: any = new Error(friendly);
      err.statusCode = 0;
      err.isNetworkError = true;
      throw err;
    }

    if (response.status === 401) {
      const msg = 'Sessão da API ERP expirada. Verifique a conexão da API nas Configurações.';
      logError({ module: endpoint, message: msg, statusCode: 401 });
      const err: any = new Error(msg);
      err.statusCode = 401;
      throw err;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
      let msg: string;
      const detail = (error as any)?.detail;
      if (Array.isArray(detail)) {
        msg = detail
          .map((d: any) => {
            if (!d || typeof d !== 'object') return String(d);
            const loc = Array.isArray(d.loc) ? d.loc.filter((x: any) => x !== 'query' && x !== 'body').join('.') : '';
            return loc ? `${loc}: ${d.msg ?? 'erro'}` : String(d.msg ?? JSON.stringify(d));
          })
          .join('; ');
      } else if (typeof detail === 'string') {
        msg = detail;
      } else if (detail && typeof detail === 'object') {
        msg = JSON.stringify(detail);
      } else {
        msg = `Erro ${response.status}`;
      }
      if (response.status === 404 && endpoint.startsWith('/api/senior/')) {
        msg = 'Endpoint não encontrado na API. Verifique se o backend foi atualizado e reiniciado.';
      }
      logError({ module: endpoint, message: msg, statusCode: response.status, details: error });
      const err: any = new Error(msg);
      err.statusCode = response.status;
      err.details = error;
      throw err;
    }

    return response.json();
  }

  async login(usuario: string, senha: string) {
    const params = new URLSearchParams({ usuario, senha });
    const response = await fetch(`${getApiBaseUrl()}/login?${params}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login inválido' }));
      throw new Error(error.detail || 'Login inválido');
    }

    const data = await response.json();
    this.setToken(data.access_token);
    this.setUser(data.usuario);
    return data;
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    options?: { keepEmpty?: string[] },
  ): Promise<T> {
    const searchParams = new URLSearchParams();
    const keepEmpty = new Set(options?.keepEmpty ?? []);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        const isEmpty = value === null || value === undefined || value === '';
        if (!isEmpty) {
          searchParams.append(key, String(value));
        } else if (keepEmpty.has(key)) {
          searchParams.append(key, '');
        }
      });
    }
    const queryString = searchParams.toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, body?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  getExportUrl(endpoint: string, params?: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    const token = this.getToken();
    if (token) {
      searchParams.append('access_token', token);
    }
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    return `${getApiBaseUrl()}${endpoint}?${searchParams.toString()}`;
  }
}

export const api = new ApiClient();

export interface PaginatedResponse<T> {
  pagina: number;
  tamanho_pagina: number;
  total_registros: number;
  total_paginas: number;
  dados: T[];
}

export interface PainelComprasResponse extends PaginatedResponse<any> {
  resumo: {
    total_linhas: number;
    total_ocs: number;
    total_fornecedores: number;
    valor_liquido_total: number;
    valor_bruto_total: number;
    valor_desconto_total: number;
    valor_pendente_total: number;
    impostos_totais: number;
    saldo_pendente_total: number;
    itens_pendentes: number;
    itens_atrasados: number;
    ocs_atrasadas: number;
    maior_atraso_dias: number;
    ticket_medio_item: number;
    itens_produto: number;
    itens_servico: number;
  };
  graficos: {
    top_fornecedores: any[];
    situacoes: any[];
    tipos: any[];
    familias: any[];
    origens: any[];
    entregas_por_mes: any[];
  };
}

export interface PainelComprasDashboardResponse {
  kpis: {
    valor_comprado: number;
    valor_recebido: number;
    valor_pendente: number;
    quantidade_ocs: number;
    quantidade_itens: number;
    quantidade_fornecedores: number;
    ticket_medio_oc: number;
    percentual_recebido: number;
    valor_bruto_total?: number;
    valor_liquido_total?: number;
    itens_pendentes?: number;
    itens_atrasados?: number;
    maior_atraso_dias?: number;
    maior_fornecedor?: { codigo?: string; nome?: string; valor?: number } | null;
  };
  graficos: {
    por_mes: Array<{ mes: string; valor: number; qtd_ocs?: number; qtd_itens?: number }>;
    por_tipo_despesa: Array<{ tipo: string; valor: number; qtd_ocs?: number; qtd_itens?: number }>;
    por_centro_custo: Array<{ centro_custo: string; valor: number; qtd_ocs?: number; qtd_itens?: number }>;
    por_projeto: Array<{ numero_projeto?: string; projeto?: string; valor: number; qtd_ocs?: number; qtd_itens?: number }>;
    por_fornecedor: Array<{ fornecedor: string; valor: number; qtd_ocs?: number; qtd_itens?: number }>;
    comprado_recebido_pendente: Array<{ mes: string; comprado: number; recebido: number; pendente: number }>;
  };
  drill: any[];
}


export interface BomResponse {
  cabecalho: {
    codigo_modelo: string;
    descricao_modelo: string;
    derivacao_modelo: string;
    unidade_modelo: string;
    max_nivel: number;
  };
  total_itens: number;
  total_niveis: number;
  total_modelos_filhos: number;
  dados: any[];
}

export interface NotasRecebimentoResponse extends PaginatedResponse<any> {
  resumo?: {
    total_nfs: number;
    total_itens: number;
    total_fornecedores: number;
    valor_liquido_total: number;
    valor_bruto_total: number;
    quantidade_recebida_total: number;
  };
}

export interface NotasRecebimentoDashboardResponse {
  kpis: {
    valor_recebido: number;
    quantidade_nfs: number;
    quantidade_itens: number;
    quantidade_fornecedores: number;
    valor_medio_nf: number;
    valor_liquido_total?: number;
    valor_bruto_total?: number;
    quantidade_recebida_total?: number;
    nfs_com_oc?: number;
    nfs_sem_oc?: number;
    pct_com_oc?: number;
    pct_sem_oc?: number;
    maior_fornecedor?: { codigo?: string; nome?: string; valor?: number } | null;
    total_produtos?: number;
    total_servicos?: number;
    total_digitadas?: number;
    total_fechadas?: number;
    total_canceladas?: number;
  };
  graficos: {
    por_mes: Array<{ mes: string; valor: number; qtd_nfs?: number; qtd_itens?: number }>;
    por_tipo_despesa: Array<{ tipo: string; valor: number; qtd_nfs?: number; qtd_itens?: number }>;
    por_centro_custo: Array<{ codigo_centro_custo?: string; centro_custo?: string; valor: number; qtd_nfs?: number; qtd_itens?: number }>;
    por_projeto: Array<{ numero_projeto?: string; projeto?: string; valor: number; qtd_nfs?: number; qtd_itens?: number }>;
    por_fornecedor: Array<{ codigo_fornecedor?: string; fornecedor?: string; valor: number; qtd_nfs?: number; qtd_itens?: number }>;
    por_transacao_nf: Array<{ transacao: string; valor: number; qtd_nfs?: number; qtd_itens?: number }>;
  };
  drill: any[];
}

export interface ConciliacaoEdocsResponse extends PaginatedResponse<any> {
  resumo: {
    total_registros: number;
    total_ok: number;
    total_sem_edocs: number;
    total_com_erro: number;
    total_divergencia_situacao: number;
  };
}

export interface ContasPagarResponse extends PaginatedResponse<any> {
  resumo?: {
    total_titulos: number;
    total_fornecedores: number;
    valor_original_total: number;
    valor_aberto_total: number;
    valor_pago_total: number;
    titulos_vencidos: number;
    valor_vencido_total: number;
    valor_a_vencer_7d: number;
    valor_a_vencer_30d: number;
    ticket_medio: number;
    maior_atraso_dias: number;
  };
}

export interface ContasReceberResponse extends PaginatedResponse<any> {
  resumo?: {
    total_titulos: number;
    total_clientes: number;
    valor_original_total: number;
    valor_aberto_total: number;
    valor_recebido_total: number;
    titulos_vencidos: number;
    valor_vencido_total: number;
    valor_a_vencer_7d: number;
    valor_a_vencer_30d: number;
    ticket_medio: number;
    maior_atraso_dias: number;
  };
}

export interface EstoqueMinMaxResponse extends PaginatedResponse<any> {
  resumo?: {
    abaixo_minimo: number;
    acima_maximo: number;
    sem_politica: number;
    ok: number;
    sugestao_minimo_total: number;
    sugestao_maximo_total: number;
  };
}

export interface EstoqueMovimentacaoResponse extends PaginatedResponse<any> {
  resumo?: {
    saldo_atual_total: number;
    consumo_90d: number;
    consumo_180d: number;
    lead_time_medio_dias: number;
    minimo_sugerido_total: number;
    maximo_sugerido_total: number;
  };
}

export interface SugestaoPoliticaItem {
  codemp?: number;
  codpro?: string;
  despro?: string;
  codder?: string;
  coddep?: string;
  saldo_atual?: number;
  consumo_medio?: number;
  consumo_mensal?: number;
  lead_time_dias?: number;
  minimo_sugerido?: number;
  maximo_sugerido?: number;
  ponto_pedido?: number;
  lote_compra?: number;
  justificativa?: string;
  [key: string]: any;
}

export interface SugestaoPoliticaResponse extends PaginatedResponse<SugestaoPoliticaItem> {
  resumo?: {
    saldo_atual_total: number;
    consumo_90d: number;
    consumo_180d: number;
    lead_time_medio_dias: number;
    minimo_sugerido_total: number;
    maximo_sugerido_total: number;
  };
}

export interface AuditoriaResponse extends PaginatedResponse<any> {
  resumo: {
    total_registros: number;
    total_ncm_vazio: number;
    total_cst_vazio: number;
    total_divergencias: number;
  };
}

// Nota: cada item de `dados` pode incluir status nativo da OP vindo de E900COP:
//   status_op?: 'E' | 'L' | 'A' | 'F' | 'C' | 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO' | 'SEM_STATUS'
// OPs ativas = conjunto { E, L, A }. Finalizadas = F. Canceladas = C.
export type StatusOpNativo = 'E' | 'L' | 'A' | 'F' | 'C' | 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO' | 'SEM_STATUS';

export interface AuditoriaApontGeniusEtapa {
  nome: string;
  quantidade: number;
}

export interface AuditoriaApontGeniusContagem {
  chave: string;
  label?: string;
  quantidade: number;
}

export interface AuditoriaApontGeniusDebug {
  sql_final?: string;
  parametros?: Record<string, any>;
  etapas?: AuditoriaApontGeniusEtapa[];
  contagem_por_origem?: AuditoriaApontGeniusContagem[];
  contagem_por_status_op?: AuditoriaApontGeniusContagem[];
  contagem_por_op?: AuditoriaApontGeniusContagem[];
  apontamentos_por_op?: AuditoriaApontGeniusContagem[];
  observacoes?: string[];
}

export interface AuditoriaApontamentoGeniusResponse extends PaginatedResponse<any> {
  resumo?: {
    total_registros: number;
    // Contrato novo do backend (E900COP + E930MPR)
    total_ops_andamento?: number;
    total_ops_finalizadas?: number;
    total_discrepancias: number;
    total_sem_inicio?: number;
    total_sem_fim?: number;
    total_fim_menor_inicio?: number;
    total_apontamento_maior_8h?: number;
    total_operador_maior_8h_dia?: number;
    maior_total_dia_operador: number;
    // Aliases legados (mantidos para retrocompatibilidade)
    sem_inicio?: number;
    sem_fim?: number;
    fim_menor_inicio?: number;
    acima_8h?: number;
    operador_maior_total?: string;
    ops_em_andamento?: number;
    ops_finalizadas?: number;
    ops_canceladas?: number;
    ops_sem_status?: number;
  };
  debug?: AuditoriaApontGeniusDebug;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPs Pintura/Jato (auditoria-apontamento-genius/ops-jato-peso)
// ─────────────────────────────────────────────────────────────────────────────
export type StatusPesoOp =
  | 'OK'
  | 'PESO_ZERO'
  | 'PESO_PARCIAL'
  | 'SEM_COMPONENTES_E900CMO'
  | 'PRODUZIDO_SEM_MODELO'
  | 'CICLO_BOM'
  | 'SEM_CONVERSAO_UNIDADE';

export interface OpJatoPesoItem {
  origem?: string | number;
  numero_op?: string | number;
  codigo_produto?: string;
  descricao_produto?: string;
  situacao_op?: string;
  data_jato?: string;
  qtd_apontamentos_jato?: number;
  qtd_componentes_diretos?: number;
  qtd_componentes_finais?: number;
  qtd_componentes_expandidos?: number;
  nivel_maximo?: number;
  peso_kg_direto?: number;
  peso_kg_multinivel?: number;
  status_peso?: StatusPesoOp | string;
  [key: string]: any;
}

export interface OpJatoPesoResponse extends PaginatedResponse<OpJatoPesoItem> {
  resumo?: {
    total_ops?: number;
    peso_total_kg_multinivel?: number;
    peso_total_kg_direto?: number;
    ops_com_peso?: number;
    ops_sem_peso?: number;
    ops_peso_parcial?: number;
    ops_com_ciclo?: number;
    ops_sem_componentes?: number;
    [key: string]: any;
  };
}

export interface OpJatoComponente {
  nivel?: number;
  codigo_pai?: string;
  codigo_componente?: string;
  descricao_componente?: string;
  derivacao?: string;
  origem_componente?: string | number;
  tipo_produto?: string;
  quantidade_nivel?: number;
  quantidade_acumulada?: number;
  unidade?: string;
  peso_unitario?: number;
  peso_calculado?: number;
  foi_expandido?: boolean;
  componente_final?: boolean;
  ciclo_detectado?: boolean;
  caminho?: string;
  [key: string]: any;
}

export interface OpJatoComponentesResponse {
  origem?: string | number;
  numero_op?: string | number;
  codigo_produto?: string;
  descricao_produto?: string;
  peso_kg_direto?: number;
  peso_kg_multinivel?: number;
  nivel_maximo?: number;
  qtd_componentes_finais?: number;
  componentes: OpJatoComponente[];
  [key: string]: any;
}

export interface OpsJatoPesoFilters {
  codemp?: string | number;
  data_ini?: string;
  data_fim?: string;
  origem?: string;
  numero_op?: string;
  codigo_produto?: string;
  situacao_op?: string;
  somente_com_peso?: boolean;
  somente_sem_peso?: boolean;
  somente_peso_parcial?: boolean;
  pagina?: number;
  tamanho_pagina?: number;
  usar_multinivel?: boolean;
}

function jatoQueryParams(f: OpsJatoPesoFilters): Record<string, any> {
  const out: Record<string, any> = {};
  Object.entries(f).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (typeof v === 'boolean') {
      if (v) out[k] = 'true';
      return;
    }
    out[k] = v;
  });
  return out;
}

export async function getOpsJatoPeso(filters: OpsJatoPesoFilters): Promise<OpJatoPesoResponse> {
  return api.get<OpJatoPesoResponse>(
    '/api/auditoria-apontamento-genius/ops-jato-peso',
    jatoQueryParams({ usar_multinivel: true, ...filters }),
  );
}

export async function getOpsJatoPesoComponentes(
  origem: string | number,
  numero_op: string | number,
): Promise<OpJatoComponentesResponse> {
  return api.get<OpJatoComponentesResponse>(
    `/api/auditoria-apontamento-genius/ops-jato-peso/${encodeURIComponent(String(origem))}/${encodeURIComponent(String(numero_op))}/componentes`,
  );
}

// ===== Contabilidade — Balanço Patrimonial =====
export interface BalancoPatrimonialFilters {
  anomes_ini?: string | number;
  anomes_fim?: string | number;
  codigo_empresa?: string | number;
  codigo_filial?: string | number;
  conta?: string;
  grupo?: string;
  subgrupo?: string;
  pagina?: number;
  por_pagina?: number;
}

export interface BalancoPatrimonialItem {
  anomes?: string | number;
  codigo_empresa?: string | number;
  codigo_filial?: string | number;
  conta?: string;
  grupo?: string;
  subgrupo?: string;
  saldo?: number;
  [k: string]: any;
}

export interface BalancoPatrimonialResposta {
  itens: BalancoPatrimonialItem[];
  pagina: number;
  total_paginas: number;
  total_registros: number;
  [k: string]: any;
}

export async function getBalancoPatrimonial(
  filters: BalancoPatrimonialFilters,
): Promise<BalancoPatrimonialResposta> {
  return api.get<BalancoPatrimonialResposta>('/api/contabilidade/balanco', filters as Record<string, any>);
}



// ============================================================
// Demonstrativo de Compras e Recebimentos
// ============================================================
export type DemonstrativoOrigem = 'TODOS' | 'COMPRAS' | 'RECEBIMENTOS';
export type DemonstrativoNivel =
  | 'projeto_macro' | 'numero_projeto' | 'centro_custo' | 'tipo_despesa'
  | 'mes_competencia' | 'fornecedor' | 'documento' | 'item'
  | 'transacao' | 'deposito';

export interface DemonstrativoFilters {
  data_ini?: string;
  data_fim?: string;
  origem?: DemonstrativoOrigem;
  nivel?: DemonstrativoNivel;
  projeto_macro?: string;
  numero_projeto?: string;
  centro_custo?: string;
  tipo_despesa?: string;
  mes_competencia?: string;
  fornecedor?: string;
  condicao_pagamento?: string;
  transacao?: string;
  descricao_item?: string;
  deposito?: string;
  familia?: string;
  origem_material?: string;
  numero_oc?: string;
  numero_nf?: string;
  documento?: string;
  tipo_item?: string;
  incluir_detalhe?: boolean;
  limite_detalhe?: number;
}

export interface DemonstrativoKpis {
  valor_comprado: number;
  valor_recebido: number;
  valor_pendente: number;
  diferenca_comprado_recebido: number;
  qtd_linhas: number;
  qtd_fornecedores: number;
  qtd_documentos: number;
}

export interface DemonstrativoDrillRow {
  chave: string;
  label: string;
  valor_comprado?: number;
  valor_recebido?: number;
  valor_pendente?: number;
  diferenca_comprado_recebido?: number;
  qtd_linhas?: number;
  qtd_fornecedores?: number;
  qtd_documentos?: number;
}

export interface DemonstrativoSerieItem {
  chave?: string;
  label?: string;
  mes?: string;
  valor_comprado?: number;
  valor_recebido?: number;
  valor_pendente?: number;
  valor?: number;
}

export interface DemonstrativoGraficos {
  comprado_recebido_pendente?: DemonstrativoSerieItem[];
  por_projeto_macro?: DemonstrativoSerieItem[];
  por_mes?: DemonstrativoSerieItem[];
  por_centro_custo?: DemonstrativoSerieItem[];
  por_projeto?: DemonstrativoSerieItem[];
  por_tipo_despesa?: DemonstrativoSerieItem[];
  por_fornecedor?: DemonstrativoSerieItem[];
  por_transacao?: DemonstrativoSerieItem[];
}

export interface DemonstrativoDetalheRow {
  origem_dado?: string;
  projeto_macro?: string;
  mes_competencia?: string;
  numero_projeto?: string;
  nome_projeto?: string;
  codigo_centro_custo?: string;
  descricao_centro_custo?: string;
  tipo_despesa?: string;
  codigo_fornecedor?: string;
  nome_fornecedor?: string;
  documento?: string;
  numero_oc?: string;
  numero_nf?: string;
  serie_nf?: string;
  tipo_item?: string;
  sequencia_item?: string | number;
  codigo_item?: string;
  descricao_item?: string;
  derivacao?: string;
  unidade_medida?: string;
  codigo_familia?: string;
  origem_material?: string;
  transacao?: string;
  deposito?: string;
  quantidade_pedida?: number;
  quantidade_recebida?: number;
  quantidade_pendente?: number;
  valor_bruto?: number;
  valor_comprado?: number;
  valor_recebido?: number;
  valor_pendente?: number;
  diferenca_comprado_recebido?: number;
  [k: string]: any;
}

export interface DemonstrativoResposta {
  atualizado_em?: string;
  kpis: DemonstrativoKpis;
  kpis_dashboard?: Record<string, any>;
  graficos?: DemonstrativoGraficos;
  drill: DemonstrativoDrillRow[];
  nivel: DemonstrativoNivel;
  proximo_nivel?: DemonstrativoNivel | null;
  detalhe?: DemonstrativoDetalheRow[];
  filtros_aplicados?: Record<string, any>;
  observacao?: string;
}

export async function getDemonstrativoComprasRecebimentos(
  filters: DemonstrativoFilters,
): Promise<DemonstrativoResposta> {
  return api.get<DemonstrativoResposta>(
    '/api/demonstrativo-compras-recebimentos',
    filters as Record<string, any>,
  );
}
