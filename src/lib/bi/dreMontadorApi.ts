import { api, getApiUrl } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

export interface PlanoContaCentroCusto {
  cd_centro_custos: string;
  cd_centro_custos_3: string;
  qtd_lancamentos: number;
  valor_total: number;
  vl_realizado: number;
  ds_centro_custos: string;
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

/**
 * Normaliza o campo `centros_custo` de cada conta retornada por
 * /api/bi/contabilidade/dre-dinamica/plano-contas (RPC bi_dre_plano_contas_disponivel_v2).
 * Aceita array, string JSON ou null/undefined. Descarta itens sem `cd_centro_custos`.
 */
export function normalizeCentrosCusto(raw: unknown): PlanoContaCentroCusto[] {
  let value: any = raw;
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any) => {
      const cd = String(
        item.cd_centro_custos ||
        item.cd_centro_custo ||
        item.centro_custo ||
        ''
      ).trim();
      return {
        cd_centro_custos: cd,
        cd_centro_custos_3: String(
          item.cd_centro_custos_3 ||
          item.cd_centro_custo_3 ||
          cd.slice(0, 3)
        ).trim(),
        qtd_lancamentos: Number(item.qtd_lancamentos || 0),
        valor_total: Number(item.valor_total ?? item.vl_realizado ?? 0),
        vl_realizado: Number(item.vl_realizado ?? item.valor_total ?? 0),
        ds_centro_custos: String(item.ds_centro_custos || '').trim(),
      } as PlanoContaCentroCusto;
    })
    .filter((item) => item.cd_centro_custos);
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

  if (arr.length) {
    const primeira = arr[0];
    console.log('[MONTADOR DRE] primeira conta (bruta):', primeira);
    console.log('[MONTADOR DRE] Object.keys(primeiraConta):', Object.keys(primeira || {}));
    console.log('[MONTADOR DRE] typeof primeiraConta.centros_custo:', typeof primeira?.centros_custo);
    console.log('[MONTADOR DRE] primeiraConta.centros_custo (bruto):', primeira?.centros_custo);
  }

  const pickStr = (o: any, keys: string[]): string => {
    for (const k of keys) { const v = o?.[k]; if (v !== undefined && v !== null && String(v) !== '') return String(v); }
    return '';
  };
  const pickNum = (o: any, keys: string[]): number => {
    for (const k of keys) { const v = o?.[k]; if (v !== undefined && v !== null && v !== '') { const n = Number(v); if (!Number.isNaN(n)) return n; } }
    return 0;
  };

  const mapped: PlanoContaErp[] = arr.map((r: any) => {
    const cd_mascara: string = pickStr(r, ['cd_mascara', 'mascara']);
    const nivelFallback = cd_mascara ? cd_mascara.split('.').filter(Boolean).length : 0;
    return {
      cd_mascara,
      cd_conta_contabil: pickStr(r, ['cd_conta_contabil', 'cd_conta', 'conta']),
      ds_conta: pickStr(r, ['ds_conta', 'descricao', 'nome_conta', 'nome', 'conta_descricao', 'ds_conta_contabil', 'ds_conta_descricao']),
      nivel: pickNum(r, ['nivel']) || nivelFallback,
      centros_custo: normalizeCentrosCusto(r?.centros_custo),
      qtd_lancamentos: pickNum(r, ['qtd_lancamentos', 'qtde', 'qtd', 'quantidade', 'qtd_lanc']),
      valor_total: pickNum(r, ['valor_total', 'total', 'valor', 'vl_saldo', 'saldo']),
      ja_vinculada: !!(r.ja_vinculada ?? r.vinculada),
      linhas_vinculadas: Array.isArray(r.linhas_vinculadas) ? r.linhas_vinculadas : [],
    };
  });

  if (mapped.length) {
    console.log('[MONTADOR DRE] mapped[0]:', mapped[0]);
    console.log('[MONTADOR DRE] mapped[0].centros_custo.length:', mapped[0].centros_custo.length);
    if (mapped[0].centros_custo.length) {
      console.log('[MONTADOR DRE] mapped[0].centros_custo[0]:', mapped[0].centros_custo[0]);
    }
    const conta311 = mapped.find((m) => m.cd_conta_contabil === '311020006' || m.cd_mascara === '311020006');
    if (conta311) {
      console.log('[MONTADOR DRE] conta 311020006 → centros_custo.length =', conta311.centros_custo.length);
    }

    const temCentroCusto = mapped.some(
      (conta) => Array.isArray(conta.centros_custo) && conta.centros_custo.length > 0,
    );
    if (!temCentroCusto) {
      console.warn(
        '[MONTADOR DRE] Backend não retornou `centros_custo` válido em nenhuma das', mapped.length, 'contas.',
        '\n  Contrato esperado (RPC bi_dre_plano_contas_disponivel_v2):',
        '\n  centros_custo: [{ cd_centro_custos, cd_centro_custos_3, qtd_lancamentos, valor_total, vl_realizado, ds_centro_custos }]',
        '\n  Período enviado: anomes_ini=', p.anomes_ini, 'anomes_fim=', p.anomes_fim,
        '\n  URL chamada:', url,
      );
      console.warn('[MONTADOR DRE] chaves do primeiro item bruto recebido:', arr[0] ? Object.keys(arr[0]) : '(payload vazio)');
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
