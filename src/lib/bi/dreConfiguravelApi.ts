// Client da API FastAPI para o módulo "DRE Configurável" (BI Financeiro).
// Front é apenas interface — não calcula DRE, não acessa ERP, não usa Cloud para valores.

import { api, getApiUrl } from '@/lib/api';
import type {
  DreFiltrosPainel,
  DreRealizadoResumo,
  DreRealizadoTotais,
  DreRealizadoMensalRow,
  DreModeloItem,
} from './dreConfiguravelTypes';

function authHeaders(): Record<string, string> {
  const token = api.getToken();
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

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

export async function fetchDreRealizadoResumo(filtros: DreFiltrosPainel): Promise<DreRealizadoResumo> {
  const url = new URL(`${getApiUrl()}/api/dre/realizado/resumo`);
  if (filtros.empresa != null && filtros.empresa !== '') url.searchParams.set('empresa', String(filtros.empresa));
  if (filtros.filial != null && filtros.filial !== '') url.searchParams.set('filial', String(filtros.filial));
  url.searchParams.set('data_ini', filtros.data_ini);
  url.searchParams.set('data_fim', filtros.data_fim);
  if (filtros.modelo_id) url.searchParams.set('modelo_id', filtros.modelo_id);
  url.searchParams.set('tipo', filtros.tipo ?? 'MENSAL');
  url.searchParams.set('comparar_orcamento', String(!!filtros.comparar_orcamento));

  console.log('[DRE CONFIGURAVEL] GET resumo', url.toString());
  const resp = await fetch(url.toString(), { headers: authHeaders() });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Resumo DRE indisponível (HTTP ${resp.status}): ${txt.slice(0, 300)}`);
  }
  const data = await resp.json();
  return {
    totais: normalizarTotais(data?.totais),
    mensal: normalizarMensal(data?.mensal ?? data?.linhas ?? []),
  };
}

export async function fetchDreModelos(): Promise<DreModeloItem[]> {
  const url = `${getApiUrl()}/api/dre/modelos`;
  console.log('[DRE CONFIGURAVEL] GET modelos', url);
  const resp = await fetch(url, { headers: authHeaders() });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Modelos DRE indisponíveis (HTTP ${resp.status}): ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  const arr = Array.isArray(data?.itens) ? data.itens : Array.isArray(data) ? data : [];
  return arr.map((m: any) => ({
    id: String(m?.id ?? m?.modelo_id ?? ''),
    nome: String(m?.nome ?? m?.descricao ?? m?.id ?? '—'),
    descricao: m?.descricao ?? null,
    status: m?.status ?? null,
  })).filter((m: DreModeloItem) => m.id);
}
