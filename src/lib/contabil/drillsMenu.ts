// Contrato compartilhado do menu de drills padrão Senior (REABRIR / CONSULTA).
// Lê `linha.drills_menu` (novo backend) e faz fallback para o legado `linha.drills`
// (array de dimensões). Não infere itens; apenas normaliza o que vem do backend.

import { DRILL_LABELS, normalizarDrillDimensao } from './drillDreApi';

export interface DrillMenuItem {
  grupo?: string;              // "REABRIR" | "CONSULTA" | outro
  label?: string;
  chave?: string;
  acao?: string;               // "reabrir" | "consulta"
  agrupar_por?: string;        // "conta" | "centro_custo" | "conta_contabil" | ...
  endpoint?: string;
  icone?: string;
  ordem?: number;
  [k: string]: any;
}

export interface LinhaDrillContract {
  linha_id?: string | null;
  codigo?: string | null;
  codigo_linha?: string | null;
  descricao?: string | null;
  drillavel?: boolean;
  drills_menu?: DrillMenuItem[];
  drills?: Array<string | { chave: string; label?: string | null }>;
}

/** Regra oficial: só há drill se `drillavel === true` e há itens em `drills_menu`
 *  (ou, para compatibilidade, na lista legada `drills`). */
export function possuiDrill(l: LinhaDrillContract | null | undefined): boolean {
  if (!l) return false;
  if (l.drillavel !== true) return false;
  const menu = normalizarDrillsMenu(l);
  return menu.length > 0;
}

/** Retorna `drills_menu` como está (ordenado) ou converte `drills` legado em
 *  itens do grupo CONSULTA. Preserva campos extras. */
export function normalizarDrillsMenu(l: LinhaDrillContract | null | undefined): DrillMenuItem[] {
  if (!l) return [];
  if (Array.isArray(l.drills_menu) && l.drills_menu.length > 0) {
    const items = l.drills_menu.filter((it) => it && (it.label || it.agrupar_por || it.chave));
    // Estável: ordena por `ordem` (quando presente), mantendo posição original como desempate.
    return items
      .map((it, i) => ({ it, i }))
      .sort((a, b) => {
        const oa = typeof a.it.ordem === 'number' ? a.it.ordem : Number.POSITIVE_INFINITY;
        const ob = typeof b.it.ordem === 'number' ? b.it.ordem : Number.POSITIVE_INFINITY;
        if (oa !== ob) return oa - ob;
        return a.i - b.i;
      })
      .map(({ it }) => it);
  }
  // Fallback: `drills` legado (só dimensões) → grupo CONSULTA.
  if (Array.isArray(l.drills) && l.drills.length > 0) {
    const out: DrillMenuItem[] = [];
    const seen = new Set<string>();
    for (const raw of l.drills) {
      const chave = typeof raw === 'string' ? raw : raw?.chave;
      const label = typeof raw === 'object' && raw && raw.label ? String(raw.label) : undefined;
      const dim = normalizarDrillDimensao(String(chave ?? ''));
      if (!dim || seen.has(dim)) continue;
      seen.add(dim);
      out.push({
        grupo: 'CONSULTA',
        label: label ?? DRILL_LABELS[dim],
        chave: String(chave),
        acao: 'consulta',
        agrupar_por: dim,
        endpoint: '/api/contabil/drill-dre',
      });
    }
    return out;
  }
  return [];
}

/** Agrupa itens do menu por `grupo`, com REABRIR primeiro e CONSULTA depois. */
export function agruparDrillsMenu(items: DrillMenuItem[]): Array<{ grupo: string; itens: DrillMenuItem[] }> {
  const buckets = new Map<string, DrillMenuItem[]>();
  const ordemAparicao: string[] = [];
  for (const it of items) {
    const g = (it.grupo || 'CONSULTA').toUpperCase();
    if (!buckets.has(g)) {
      buckets.set(g, []);
      ordemAparicao.push(g);
    }
    buckets.get(g)!.push(it);
  }
  const prioridade = ['REABRIR', 'CONSULTA'];
  const ordenados = [
    ...prioridade.filter((g) => buckets.has(g)),
    ...ordemAparicao.filter((g) => !prioridade.includes(g)),
  ];
  return ordenados.map((g) => ({ grupo: g, itens: buckets.get(g)! }));
}
