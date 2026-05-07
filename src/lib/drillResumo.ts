/**
 * Helper para padronizar o "resumo gerencial" de endpoints paginados
 * (Drill-down Gerencial).
 *
 * REGRA: KPIs/cards/totais devem usar SEMPRE este resumo (totais globais
 * do filtro, sem paginação). NUNCA somar a partir de `data.dados` (página atual).
 *
 * Backend deve retornar:
 *   { pagina, tamanho_pagina, total_registros, total_paginas, resumo: {...}, dados: [...] }
 *
 * Aliases aceitos (caso backend ainda use nomes antigos):
 *   kg_engenharia        ← kg_engenharia_total
 *   kg_produzido         ← kg_produzido_total | peso_produzido | peso_real
 *   kg_expedido          ← kg_expedido_total | peso_expedido
 *   kg_patio             ← kg_patio_total | kg_entrada_estoque_total
 *   itens_nao_carregados ← total_itens_nao_carregados
 *   quantidade_cargas    ← quantidade_cargas_geral | cargas_distintas | total_cargas
 */

export interface ResumoGerencial {
  total_registros: number;
  // Pesos (Kg)
  kg_engenharia: number;
  kg_produzido: number;
  kg_expedido: number;
  kg_patio: number;
  // Quantidades / contagens
  quantidade_produzida: number;
  quantidade_expedida: number;
  quantidade_etiquetas: number;
  itens_nao_carregados: number;
  quantidade_cargas: number;
  total_obras: number;
  total_projetos: number;
  // Lead time (dias)
  leadtime_medio_engenharia_producao: number;
  leadtime_medio_producao_expedicao: number;
  leadtime_medio_total: number;
  // catch-all
  [k: string]: number;
}

const num = (...vs: any[]): number => {
  for (const v of vs) {
    if (v == null) continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
};

export function normalizarResumoGerencial(resumo: any = {}): ResumoGerencial {
  const r = resumo || {};
  return {
    total_registros: num(r.total_registros, r.total_geral),
    kg_engenharia: num(r.kg_engenharia, r.kg_engenharia_total, r.kg_previsto, r.kg_previsto_total),
    kg_produzido: num(r.kg_produzido, r.kg_produzido_total, r.peso_produzido, r.peso_real),
    kg_expedido: num(r.kg_expedido, r.kg_expedido_total, r.peso_expedido),
    kg_patio: num(r.kg_patio, r.kg_patio_total, r.kg_entrada_estoque_total),
    quantidade_produzida: num(r.quantidade_produzida, r.qtd_produzida),
    quantidade_expedida: num(r.quantidade_expedida, r.qtd_expedida),
    quantidade_etiquetas: num(r.quantidade_etiquetas, r.qtd_etiquetas, r.total_pecas, r.total_pecas_etiquetas),
    itens_nao_carregados: num(r.itens_nao_carregados, r.total_itens_nao_carregados),
    quantidade_cargas: num(r.quantidade_cargas, r.quantidade_cargas_geral, r.cargas_distintas, r.total_cargas),
    total_obras: num(r.total_obras),
    total_projetos: num(r.total_projetos),
    leadtime_medio_engenharia_producao: num(r.leadtime_medio_engenharia_producao, r.leadtime_eng_prod, r.lt_eng_prod),
    leadtime_medio_producao_expedicao: num(r.leadtime_medio_producao_expedicao, r.leadtime_prod_exp, r.lt_prod_exp),
    leadtime_medio_total: num(r.leadtime_medio_total, r.leadtime_total, r.lt_total),
  };
}

/** Extrai resumo de uma resposta paginada (`resumo` ou `totais`). Retorna `null` se ausente. */
export function extrairResumo(resp: any): ResumoGerencial | null {
  if (!resp) return null;
  const fonte = resp.resumo ?? resp.totais;
  if (!fonte) return null;
  const norm = normalizarResumoGerencial(fonte);
  if (!norm.total_registros) norm.total_registros = num(resp.total_registros);
  return norm;
}
