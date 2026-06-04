import { supabase } from '@/integrations/supabase/client';
import type { UnidadeNegocio } from './comercialApi';

export type UnidadeMeta = 'GENIUS' | 'ESTRUTURAL ZORTEA';

export interface MetaFaturamento {
  id: string;
  anomes_emissao: string;            // 'YYYYMM'
  ano: number | null;                 // gerado
  mes: number | null;                 // gerado
  unidade_negocio: UnidadeMeta;
  codigo_unidade: string | null;      // gerado: 503 / 502
  descricao_unidade: string | null;   // gerado
  vl_meta: number;
  observacao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type MetaFaturamentoInput = Pick<
  MetaFaturamento,
  'anomes_emissao' | 'unidade_negocio' | 'vl_meta' | 'observacao' | 'ativo'
>;

export const CODIGO_POR_UNIDADE: Record<UnidadeMeta, string> = {
  'GENIUS': '503',
  'ESTRUTURAL ZORTEA': '502',
};

export async function listMetas(
  anomesIni?: string,
  anomesFim?: string,
): Promise<MetaFaturamento[]> {
  let q = supabase
    .from('bi_meta_faturamento')
    .select('*')
    .order('anomes_emissao', { ascending: false })
    .order('unidade_negocio', { ascending: true });
  if (anomesIni) q = q.gte('anomes_emissao', anomesIni);
  if (anomesFim) q = q.lte('anomes_emissao', anomesFim);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MetaFaturamento[];
}

export async function upsertMeta(input: MetaFaturamentoInput): Promise<void> {
  const { error } = await supabase
    .from('bi_meta_faturamento')
    .upsert(input, { onConflict: 'anomes_emissao,unidade_negocio' });
  if (error) throw error;
}

export async function upsertMetasBatch(rows: MetaFaturamentoInput[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('bi_meta_faturamento')
    .upsert(rows, { onConflict: 'anomes_emissao,unidade_negocio' });
  if (error) throw error;
}

export async function toggleAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase
    .from('bi_meta_faturamento')
    .update({ ativo })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMeta(id: string): Promise<void> {
  const { error } = await supabase
    .from('bi_meta_faturamento')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/**
 * Replica um valor de meta para os 12 meses de um ano (upsert por anomes+unidade).
 */
export async function copyMetaAnoCompleto(params: {
  ano: number;
  unidade_negocio: UnidadeMeta;
  vl_meta: number;
  observacao?: string | null;
  ativo?: boolean;
}): Promise<void> {
  const rows: MetaFaturamentoInput[] = Array.from({ length: 12 }, (_, i) => ({
    anomes_emissao: `${params.ano}${String(i + 1).padStart(2, '0')}`,
    unidade_negocio: params.unidade_negocio,
    vl_meta: params.vl_meta,
    observacao: params.observacao ?? null,
    ativo: params.ativo ?? true,
  }));
  await upsertMetasBatch(rows);
}

/* ----------------- CSV ----------------- */

const CSV_HEADER = ['anomes_emissao', 'unidade_negocio', 'codigo_unidade', 'vl_meta', 'observacao', 'ativo'];

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[";\n,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportarMetasCsv(rows: MetaFaturamento[]): string {
  const lines = [CSV_HEADER.join(';')];
  for (const r of rows) {
    lines.push([
      r.anomes_emissao,
      r.unidade_negocio,
      r.codigo_unidade ?? CODIGO_POR_UNIDADE[r.unidade_negocio] ?? '',
      String(r.vl_meta).replace('.', ','),
      r.observacao ?? '',
      r.ativo ? 'true' : 'false',
    ].map(csvEscape).join(';'));
  }
  return lines.join('\n');
}

export interface CsvImportResult {
  ok: number;
  erros: { linha: number; mensagem: string }[];
}

function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === sep) { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export async function importarMetasCsv(text: string): Promise<CsvImportResult> {
  const result: CsvImportResult = { ok: 0, erros: [] };
  const raw = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (raw.length === 0) return result;

  const sep = raw[0].includes(';') ? ';' : ',';
  const header = parseCsvLine(raw[0], sep).map((h) => h.trim().toLowerCase());
  const idx = {
    anomes: header.indexOf('anomes_emissao'),
    unidade: header.indexOf('unidade_negocio'),
    valor: header.indexOf('vl_meta'),
    obs: header.indexOf('observacao'),
    ativo: header.indexOf('ativo'),
  };
  if (idx.anomes < 0 || idx.unidade < 0 || idx.valor < 0) {
    throw new Error('Cabeçalho inválido. Esperado: anomes_emissao;unidade_negocio;codigo_unidade;vl_meta;observacao;ativo');
  }

  const toInsert: MetaFaturamentoInput[] = [];
  for (let i = 1; i < raw.length; i++) {
    const cells = parseCsvLine(raw[i], sep);
    const linha = i + 1;
    try {
      const anomes = (cells[idx.anomes] ?? '').replace(/[^0-9]/g, '').slice(0, 6);
      const unidade = (cells[idx.unidade] ?? '').trim().toUpperCase() as UnidadeMeta;
      const valorRaw = (cells[idx.valor] ?? '').trim().replace(/\./g, '').replace(',', '.');
      const valor = Number(valorRaw);
      const obs = idx.obs >= 0 ? (cells[idx.obs] ?? '').trim() : '';
      const ativoStr = idx.ativo >= 0 ? (cells[idx.ativo] ?? '').trim().toLowerCase() : 'true';
      const ativo = !['false', '0', 'nao', 'não', 'n'].includes(ativoStr);

      if (anomes.length !== 6) throw new Error(`anomes_emissao inválido: "${cells[idx.anomes]}"`);
      if (unidade !== 'GENIUS' && unidade !== 'ESTRUTURAL ZORTEA') {
        throw new Error(`unidade_negocio inválida: "${cells[idx.unidade]}" (use GENIUS ou ESTRUTURAL ZORTEA)`);
      }
      if (!Number.isFinite(valor) || valor < 0) throw new Error(`vl_meta inválido: "${cells[idx.valor]}"`);

      toInsert.push({
        anomes_emissao: anomes,
        unidade_negocio: unidade,
        vl_meta: valor,
        observacao: obs || null,
        ativo,
      });
    } catch (e: any) {
      result.erros.push({ linha, mensagem: e?.message || 'erro' });
    }
  }

  if (toInsert.length > 0) {
    await upsertMetasBatch(toInsert);
    result.ok = toInsert.length;
  }
  return result;
}

/**
 * Soma vl_meta (apenas ativos) para o intervalo + unidade.
 * Retorna null se não houver nenhuma meta cadastrada no período.
 */
export async function fetchMetaCloudTotal(params: {
  anomes_ini: string;
  anomes_fim: string;
  unidade_negocio: UnidadeNegocio;
}): Promise<number | null> {
  let q = supabase
    .from('bi_meta_faturamento')
    .select('vl_meta, unidade_negocio')
    .eq('ativo', true)
    .gte('anomes_emissao', params.anomes_ini)
    .lte('anomes_emissao', params.anomes_fim);

  if (params.unidade_negocio !== 'CONSOLIDADO') {
    q = q.eq('unidade_negocio', params.unidade_negocio);
  }

  const { data, error } = await q;
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data.reduce((acc, r) => acc + Number(r.vl_meta || 0), 0);
}

/**
 * Mapa por mês (`YYYYMM`) com a soma de `vl_meta` (apenas ativos) no intervalo + unidade.
 * Para `CONSOLIDADO`, soma GENIUS + ESTRUTURAL ZORTEA por mês.
 * Vazio = nenhuma meta cadastrada no período.
 */
export async function fetchMetasMensalMap(params: {
  anomes_ini: string;
  anomes_fim: string;
  unidade_negocio: UnidadeNegocio;
}): Promise<Record<string, number>> {
  let q = supabase
    .from('bi_meta_faturamento')
    .select('anomes_emissao, vl_meta, unidade_negocio')
    .eq('ativo', true)
    .gte('anomes_emissao', params.anomes_ini)
    .lte('anomes_emissao', params.anomes_fim);

  if (params.unidade_negocio !== 'CONSOLIDADO') {
    q = q.eq('unidade_negocio', params.unidade_negocio);
  }

  const { data, error } = await q;
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const r of data ?? []) {
    const k = String(r.anomes_emissao);
    out[k] = (out[k] ?? 0) + Number(r.vl_meta || 0);
  }
  return out;
}
