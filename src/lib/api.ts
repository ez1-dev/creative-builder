import { logError } from './errorLogger';

let _apiBaseUrl: string | null = null;

const getApiBaseUrl = () => {
  if (_apiBaseUrl) return _apiBaseUrl;
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL;
  if (envBase) return envBase;
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
