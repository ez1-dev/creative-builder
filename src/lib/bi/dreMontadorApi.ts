import { api, getApiUrl } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

export interface PlanoContaCentroCusto {
  cd_centro_custos: string;
  cd_centro_custos_3: string;
  ds_centro_custos: string;
  qtd_lancamentos: number;
  valor_total: number;
  vl_realizado: number;
}

export interface PlanoContaLinhaVinculada {
  codigo_linha: string;
  cd_centro_custos: string | null;
}

export interface PlanoContaErp {
  cd_mascara: string;
  ds_mascara: string;
  cd_conta_contabil: string;
  ds_conta: string;
  nivel: number;
  centros_custo: PlanoContaCentroCusto[];
  qtd_lancamentos: number;
  valor_total: number;
  vl_realizado?: number;
  realizado?: number;
  qtd_centros: number;
  ja_vinculada: boolean;
  linhas_vinculadas: (string | PlanoContaLinhaVinculada)[];
}

export interface PlanoContasParams {
  anomes_ini: string;
  anomes_fim: string;
  modelo_id?: string | null;
  empresa_id?: string;
  somente_resultado?: boolean;
  q?: string;
}

export interface VincularContasPayloadConta {
  cd_mascara?: string;
  cd_conta_contabil?: string;
  centros_custo?: { cd_centro_custos: string }[];
}

export interface VincularContasPayload {
  modelo_id: string;
  linha_id: string;
  tipo_regra: 'MASCARA_CONTA' | 'CONTA_CONTABIL';
  operador: 'COMECA_COM' | 'IGUAL';
  sinal: 1 | -1;
  prioridade: number;
  contas: VincularContasPayloadConta[];
}

export interface VincularContasResult {
  criados: number;
  ignorados_por_duplicidade: number;
  vinculadas: number;
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
 * Conversor numérico tolerante a strings pt-BR e en-US.
 * - "-124.811,54"  → -124811.54
 * - "-124811.54"   → -124811.54
 * - null/undefined/"" → 0
 */
export function toNumberBI(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value).trim();
  if (!text) return 0;
  if (text.includes(',')) {
    const normalized = text.replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
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
      const valorCentro = toNumberBI(item.valor_total ?? item.vl_realizado ?? 0);
      return {
        cd_centro_custos: cd,
        cd_centro_custos_3: String(
          item.cd_centro_custos_3 ||
          item.cd_centro_custo_3 ||
          cd.slice(0, 3)
        ).trim(),
        qtd_lancamentos: Number(item.qtd_lancamentos || 0),
        valor_total: valorCentro,
        vl_realizado: valorCentro,
        ds_centro_custos: String(item.ds_centro_custos || '').trim(),
      } as PlanoContaCentroCusto;
    })
    .filter((item) => item.cd_centro_custos);
}

export async function fetchPlanoContasDinamica(p: PlanoContasParams): Promise<PlanoContaErp[]> {
  const qs = new URLSearchParams({
    anomes_ini: p.anomes_ini,
    anomes_fim: p.anomes_fim,
    empresa_id: p.empresa_id ?? '1',
    somente_resultado: String(p.somente_resultado ?? true),
  });
  if (p.modelo_id) qs.set('modelo_id', p.modelo_id);
  if (p.q) qs.set('q', p.q);

  const url = `${getApiUrl()}/api/bi/contabilidade/plano-contas-disponivel?${qs.toString()}`;
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
    console.log('[MONTADOR DRE] primeira conta bruta:', primeira);
    console.log('[MONTADOR DRE] Object.keys(primeiraConta):', Object.keys(primeira || {}));
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
    const valorConta = toNumberBI(
      r?.vl_realizado ?? r?.valor_total ?? r?.realizado ?? 0,
    );
    const centros = normalizeCentrosCusto(r?.centros_custo);
    const linhaVinc = pickStr(r, ['linha_vinculada', 'codigo_linha']);
    return {
      cd_mascara,
      ds_mascara: pickStr(r, ['ds_mascara', 'descricao_mascara']),
      cd_conta_contabil: pickStr(r, ['cd_conta_contabil', 'cd_conta', 'conta']),
      ds_conta: pickStr(r, ['ds_conta', 'ds_mascara', 'descricao', 'nome_conta', 'nome']),
      nivel: pickNum(r, ['nivel']) || nivelFallback,
      centros_custo: centros,
      qtd_centros: pickNum(r, ['qtd_centros']) || centros.length,
      qtd_lancamentos: pickNum(r, ['qtd_lancamentos', 'qtde', 'qtd', 'quantidade']),
      valor_total: valorConta,
      vl_realizado: valorConta,
      realizado: valorConta,
      ja_vinculada: !!(r.ja_usada ?? r.ja_vinculada ?? r.vinculada),
      linhas_vinculadas: Array.isArray(r.linhas_vinculadas)
        ? r.linhas_vinculadas
        : (linhaVinc ? [linhaVinc] : []),
    };
  });


  if (mapped.length) {
    const qtdComValor = mapped.filter((c) => Math.abs(Number(c.valor_total || 0)) > 0).length;
    const somaValor = mapped.reduce((acc, c) => acc + Number(c.valor_total || 0), 0);
    console.log('[MONTADOR DRE] primeira conta normalizada:', mapped[0]);
    console.log('[MONTADOR DRE] qtd contas com valor:', qtdComValor);
    console.log('[MONTADOR DRE] soma valor_total:', somaValor);

    const conta311 = mapped.find((m) => m.cd_conta_contabil === '311020006' || m.cd_mascara === '311020006');
    if (conta311) {
      console.log(
        '[MONTADOR DRE] conta 311020006 → valor_total =', conta311.valor_total,
        '| centros_custo.length =', conta311.centros_custo.length,
      );
    }

    const temValor = mapped.some((conta) => {
      const valorConta = Math.abs(Number(conta.valor_total || 0));
      const valorCentros = (conta.centros_custo || []).some(
        (cc) => Math.abs(Number(cc.valor_total || 0)) > 0,
      );
      return valorConta > 0 || valorCentros;
    });

    if (!temValor) {
      console.warn(
        '[MONTADOR DRE] Valores zerados em TODAS as', mapped.length, 'contas (incluindo centros_custo).',
        '\n  Período enviado: anomes_ini=', p.anomes_ini, 'anomes_fim=', p.anomes_fim,
        '\n  URL chamada:', url,
        '\n  Verifique no backend: bi_vm_lanc_contabil tem dados no período? sum(vl_saldo) está populado?',
      );
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
