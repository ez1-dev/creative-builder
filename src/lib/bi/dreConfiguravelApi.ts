// Client da API FastAPI para o módulo "DRE Configurável" (BI Financeiro).
// Front é apenas interface — não calcula DRE, não acessa ERP, não usa Cloud para valores.
// Usa o cliente compartilhado `api` (envia Authorization: Bearer <token> e trata 401).

import { api } from '@/lib/api';
import type {
  DreFiltrosPainel,
  DreRealizadoResumo,
  DreRealizadoTotais,
  DreRealizadoMensalRow,
  DreModeloItem,
} from './dreConfiguravelTypes';

function toNumberBI(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  const n = s.includes(',')
    ? Number(s.replace(/\./g, '').replace(',', '.'))
    : Number(s);
  return Number.isFinite(n) ? n : 0;
}

function normalizarTotais(raw: any): DreRealizadoTotais {
  const t = raw ?? {};
  return {
    receita_operacional: toNumberBI(t.receita_operacional),
    custos: toNumberBI(t.custos),
    despesas: toNumberBI(t.despesas),
    resultado_dre: toNumberBI(t.resultado_dre),
    margem_pct: toNumberBI(t.margem_pct),
  };
}

function normalizarMensal(raw: any[]): DreRealizadoMensalRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => ({
    anomes: String(r?.anomes ?? r?.ano_mes ?? ''),
    receita_operacional: toNumberBI(r?.receita_operacional),
    receita_bruta: toNumberBI(r?.receita_bruta),
    deducoes: toNumberBI(r?.deducoes),
    custos: toNumberBI(r?.custos),
    despesas: toNumberBI(r?.despesas),
    receitas_nao_operacionais: toNumberBI(r?.receitas_nao_operacionais),
    resultado_dre: toNumberBI(r?.resultado_dre),
  }));
}

function rethrowAuthAware(err: any): never {
  const status = err?.statusCode;
  const msg = String(err?.message ?? '');
  if (status === 401 || /not authenticated/i.test(msg)) {
    const e: any = new Error('Sessão expirada. Faça login novamente.');
    e.statusCode = 401;
    e.isAuthError = true;
    throw e;
  }
  throw err;
}

export async function fetchDreRealizadoResumo(filtros: DreFiltrosPainel): Promise<DreRealizadoResumo> {
  const params: Record<string, any> = {
    empresa: filtros.empresa || undefined,
    filial: filtros.filial || undefined,
    data_ini: filtros.data_ini,
    data_fim: filtros.data_fim,
    modelo_id: filtros.modelo_id || undefined,
    tipo: filtros.tipo ?? 'MENSAL',
    comparar_orcamento: !!filtros.comparar_orcamento,
  };
  console.log('[DRE CONFIGURAVEL] GET /api/dre/realizado/resumo', params);
  try {
    const data = await api.get<any>('/api/dre/realizado/resumo', params);
    return {
      totais: normalizarTotais(data?.totais),
      mensal: normalizarMensal(data?.mensal ?? data?.linhas ?? []),
    };
  } catch (err) {
    rethrowAuthAware(err);
  }
}

export async function fetchDreModelos(): Promise<DreModeloItem[]> {
  console.log('[DRE CONFIGURAVEL] GET /api/dre/modelos');
  try {
    const data = await api.get<any>('/api/dre/modelos');
    const arr = Array.isArray(data?.itens) ? data.itens : Array.isArray(data) ? data : [];
    return arr
      .map((m: any) => ({
        id: String(m?.id ?? m?.modelo_id ?? ''),
        nome: String(m?.nome ?? m?.descricao ?? m?.id ?? '—'),
        descricao: m?.descricao ?? null,
        status: m?.status ?? null,
      }))
      .filter((m: DreModeloItem) => m.id);
  } catch (err) {
    rethrowAuthAware(err);
  }
}
