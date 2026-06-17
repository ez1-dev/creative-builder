import { api, getApiUrl } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

export interface PlanoContaCentroCusto {
  cd_centro_custos: string;
  cd_centro_custos_3: string;
  qtd_lancamentos: number;
  valor_total: number;
}

export interface PlanoContaErp {
  cd_mascara: string;
  cd_conta_contabil: string;
  ds_conta: string;
  nivel: number;
  centros_custo: PlanoContaCentroCusto[];
  qtd_lancamentos: number;
  valor_total: number;
  ja_vinculada: boolean;
  linhas_vinculadas: string[];
}

export interface PlanoContasParams {
  anomes_ini: string;
  anomes_fim: string;
  modelo_id?: string | null;
  busca?: string;
  somente_nao_vinculadas?: boolean;
  somente_vinculadas?: boolean;
  limite?: number;
}

export interface VincularContasPayload {
  modelo_id: string;
  linha_id: string;
  tipo_regra: 'MASCARA_CONTA' | 'CONTA_CONTABIL';
  operador: 'COMECA_COM' | 'IGUAL';
  sinal: 1 | -1;
  prioridade: number;
  contas: { cd_mascara: string; cd_conta_contabil: string }[];
}

function authHeaders(): Record<string, string> {
  const token = api.getToken();
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function fetchPlanoContasDinamica(p: PlanoContasParams): Promise<PlanoContaErp[]> {
  const qs = new URLSearchParams({
    anomes_ini: p.anomes_ini,
    anomes_fim: p.anomes_fim,
  });
  if (p.modelo_id) qs.set('modelo_id', p.modelo_id);
  if (p.busca) qs.set('busca', p.busca);
  if (p.somente_nao_vinculadas) qs.set('somente_nao_vinculadas', 'true');
  if (p.somente_vinculadas) qs.set('somente_vinculadas', 'true');
  if (p.limite) qs.set('limite', String(p.limite));

  const url = `${getApiUrl()}/api/bi/contabilidade/dre-dinamica/plano-contas?${qs.toString()}`;
  console.log('[MONTADOR DRE] plano-contas url:', url);
  const resp = await fetch(url, { headers: authHeaders() });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Plano de contas indisponível (HTTP ${resp.status}): ${txt.slice(0, 300)}`);
  }
  const data = await resp.json().catch(() => []);
  const arr = Array.isArray(data) ? data : Array.isArray((data as any)?.dados) ? (data as any).dados : [];
  if (arr.length) console.log('[MONTADOR DRE] plano-contas raw sample:', arr[0]);

  const pickStr = (o: any, keys: string[]): string => {
    for (const k of keys) { const v = o?.[k]; if (v !== undefined && v !== null && String(v) !== '') return String(v); }
    return '';
  };
  const pickNum = (o: any, keys: string[]): number => {
    for (const k of keys) { const v = o?.[k]; if (v !== undefined && v !== null && v !== '') { const n = Number(v); if (!Number.isNaN(n)) return n; } }
    return 0;
  };

  const mapped = arr.map((r: any) => {
    const cd_mascara: string = pickStr(r, ['cd_mascara', 'mascara']);
    const nivelFallback = cd_mascara ? cd_mascara.split('.').filter(Boolean).length : 0;
    const ccRaw =
      (Array.isArray(r.centros_custo) && r.centros_custo) ||
      (Array.isArray(r.ccu) && r.ccu) ||
      (Array.isArray(r.centroscusto) && r.centroscusto) ||
      (Array.isArray(r.centros) && r.centros) ||
      (Array.isArray(r.cc) && r.cc) ||
      (Array.isArray(r.centros_de_custo) && r.centros_de_custo) ||
      [];
    return {
      cd_mascara,
      cd_conta_contabil: pickStr(r, ['cd_conta_contabil', 'cd_conta', 'conta']),
      ds_conta: pickStr(r, ['ds_conta', 'descricao', 'nome_conta', 'nome', 'conta_descricao', 'ds_conta_contabil', 'ds_conta_descricao']),
      nivel: pickNum(r, ['nivel']) || nivelFallback,
      centros_custo: ccRaw.map((x: any) => ({
        cd_centro_custos: pickStr(x, ['cd_centro_custos', 'cd_centro_custo', 'centro_custo', 'cd_ccu', 'codigo', 'cod_ccu', 'cod']),
        cd_centro_custos_3: pickStr(x, ['cd_centro_custos_3', 'cd_ccu_3', 'ccu_3', 'nivel_3', 'cd_centro_custo_3']),
        qtd_lancamentos: pickNum(x, ['qtd_lancamentos', 'qtd', 'qtde', 'quantidade']),
        valor_total: pickNum(x, ['valor_total', 'valor', 'total', 'vl_saldo', 'saldo']),
      })),
      qtd_lancamentos: pickNum(r, ['qtd_lancamentos', 'qtde', 'qtd', 'quantidade', 'qtd_lanc']),
      valor_total: pickNum(r, ['valor_total', 'total', 'valor', 'vl_saldo', 'saldo']),
      ja_vinculada: !!(r.ja_vinculada ?? r.vinculada),
      linhas_vinculadas: Array.isArray(r.linhas_vinculadas) ? r.linhas_vinculadas : [],
    } as PlanoContaErp;
  });

  if (mapped.length) {
    console.log('[MONTADOR DRE] plano-contas mapped sample:', mapped[0]);
    const semNome = mapped.every((m) => !m.ds_conta);
    const semValor = mapped.every((m) => m.valor_total === 0);
    const semCcu = mapped.every((m) => !m.centros_custo || m.centros_custo.length === 0);
    if (semNome) console.warn('[MONTADOR DRE] backend não retornou ds_conta em nenhum item');
    if (semValor) console.warn('[MONTADOR DRE] backend retornou valor_total = 0 em todos os itens');
    if (semCcu) console.warn('[MONTADOR DRE] backend não retornou centros_custo em nenhum item');
    else {
      const first = mapped.find((m) => m.centros_custo && m.centros_custo.length > 0);
      if (first) console.log('[MONTADOR DRE] centros_custo sample:', first.centros_custo[0]);
    }
  }

  return mapped;
}

export async function vincularContasDinamica(payload: VincularContasPayload): Promise<{ vinculadas: number }> {
  console.log('[MONTADOR DRE] payload vínculo:', payload);
  const url = `${getApiUrl()}/api/bi/contabilidade/dre-dinamica/vincular-contas`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Falha ao vincular (HTTP ${resp.status}): ${txt.slice(0, 300)}`);
  }
  const data = await resp.json().catch(() => ({}));
  return { vinculadas: Number(data?.vinculadas ?? data?.qtde ?? 0) };
}

/** Resolve linha_id (uuid) a partir de modelo_id + codigo_linha consultando bi_dre_estrutura_v2. */
export async function resolverLinhaId(modeloId: string, codigoLinha: string): Promise<string | null> {
  const { data, error } = await (supabase as any)
    .from('bi_dre_estrutura_v2')
    .select('id')
    .eq('modelo_id', modeloId)
    .eq('codigo_linha', codigoLinha)
    .maybeSingle();
  if (error) {
    console.warn('[MONTADOR DRE] resolverLinhaId falhou', error);
    return null;
  }
  return (data as any)?.id ?? null;
}
