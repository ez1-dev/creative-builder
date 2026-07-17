import { api } from '@/lib/api';

export interface DeParaTelaErp {
  tela: string;
  nome_tela: string | null;
  atalho: string | null;
  modulo: string | null;
  ativo: boolean;
  obs: string | null;
}

export interface DeParaTelaPendente {
  tela: string;
  tabela?: string | null;
  modulo_sugerido?: string | null;
  gravacoes?: number | null;
  ultimo_dia?: string | null;
}

export interface DeParaMonitorErpResponse {
  mapeadas: DeParaTelaErp[];
  nao_mapeadas: DeParaTelaPendente[];
}

export interface DeParaMonitorErpUpsertInput {
  tela: string;
  nome_tela: string;
  atalho?: string;
  modulo: string;
  ativo: boolean;
  obs?: string;
}

export async function fetchDeParaMonitorErp(): Promise<DeParaMonitorErpResponse> {
  const r = await api.get<any>('/api/monitor-erp-nativo/depara');
  const nao = Array.isArray(r?.nao_mapeadas) ? r.nao_mapeadas : [];
  return {
    mapeadas: Array.isArray(r?.mapeadas) ? r.mapeadas : [],
    nao_mapeadas: nao.map((n: any) => ({
      tela: n?.tela ?? n?.cod_form ?? '',
      tabela: n?.tabela ?? null,
      modulo_sugerido: n?.modulo_sugerido ?? n?.modulo ?? null,
      gravacoes: n?.gravacoes ?? null,
      ultimo_dia: n?.ultimo_dia ?? null,
    })),
  };
}

export async function upsertDeParaMonitorErp(input: DeParaMonitorErpUpsertInput): Promise<void> {
  await api.post('/api/monitor-erp-nativo/depara', {
    cod_form: input.tela,
    nome_tela: input.nome_tela,
    atalho: input.atalho ?? '',
    modulo: input.modulo,
    ativo: input.ativo,
    obs: input.obs ?? '',
  });
}
