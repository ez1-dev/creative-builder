import { api } from '@/lib/api';

export interface DeParaMapeada {
  sig_processo: string;
  nome_tela: string | null;
  modulo: string | null;
  ativo: boolean;
  obs: string | null;
}

export interface DeParaNaoMapeada {
  sig_processo: string;
  acessos: number | null;
  ultimo_acesso: string | null;
}

export interface DeParaResponse {
  mapeadas: DeParaMapeada[];
  nao_mapeadas: DeParaNaoMapeada[];
}

export interface DeParaUpsertInput {
  sig_processo: string;
  nome_tela: string;
  modulo: string;
  ativo: boolean;
  obs?: string;
}

export async function fetchDeParaTelas(): Promise<DeParaResponse> {
  const r = await api.get<any>('/api/telemetria-nativa/depara');
  return {
    mapeadas: Array.isArray(r?.mapeadas) ? r.mapeadas : [],
    nao_mapeadas: Array.isArray(r?.nao_mapeadas) ? r.nao_mapeadas : [],
  };
}

export async function upsertDeParaTela(input: DeParaUpsertInput): Promise<void> {
  await api.post('/api/telemetria-nativa/depara', {
    sig_processo: input.sig_processo,
    nome_tela: input.nome_tela,
    modulo: input.modulo,
    ativo: input.ativo,
    obs: input.obs ?? '',
  });
}
