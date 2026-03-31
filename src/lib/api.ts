const getApiBaseUrl = () =>
  localStorage.getItem('erp_api_url') || import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.logout();
      window.location.href = '/login';
      throw new Error('Sessão expirada');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
      throw new Error(error.detail || `Erro ${response.status}`);
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

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          searchParams.append(key, String(value));
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

export interface EngenhariaResponse extends PaginatedResponse<any> {
  resumo: {
    total_registros: number;
    total_projetos: number;
    total_paginas: number;
    kg_engenharia_total: number;
    kg_produzido_total: number;
    kg_entrada_estoque_total: number;
    projetos_atendidos_producao: number;
    projetos_atendidos_estoque: number;
    perc_atendimento_producao_total: number;
    perc_atendimento_estoque_total: number;
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

export interface AuditoriaResponse extends PaginatedResponse<any> {
  resumo: {
    total_registros: number;
    total_ncm_vazio: number;
    total_cst_vazio: number;
    total_divergencias: number;
  };
}
