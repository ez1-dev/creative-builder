export interface LinhaArvoreFinanceira {
  tipo_linha: 'TITULO' | 'RATEIO' | string;
  id_linha: string;
  codigo_pai?: string | null;
  nivel: number;
  caminho?: string;
  possui_filhos?: boolean;
  descricao_resumida?: string;
  numero_projeto?: string | null;
  codigo_fase_projeto?: string | null;
  codigo_centro_custo?: string | null;
  descricao_centro_custo?: string | null;
  percentual_rateio?: number | null;
  valor_rateado?: number | null;
  origem_rateio?: string | null;
  status_titulo?: string | null;
  data_vencimento?: string | null;
  valor_original?: number | null;
  valor_aberto?: number | null;
  valor_vencido?: number | null;
  dias_atraso?: number | null;
  [key: string]: any;
}

export function construirMapaFilhos(
  dados: LinhaArvoreFinanceira[],
): Map<string, LinhaArvoreFinanceira[]> {
  const mapa = new Map<string, LinhaArvoreFinanceira[]>();
  for (const item of dados) {
    const pai = item.codigo_pai;
    if (!pai) continue;
    const arr = mapa.get(pai) ?? [];
    arr.push(item);
    mapa.set(pai, arr);
  }
  return mapa;
}

export function getRaizesArvore(
  dados: LinhaArvoreFinanceira[],
): LinhaArvoreFinanceira[] {
  return dados.filter(
    (i) => i.tipo_linha === 'TITULO' || !i.codigo_pai,
  );
}

export function flattenArvore(
  dados: LinhaArvoreFinanceira[],
  expandidos: Set<string>,
): LinhaArvoreFinanceira[] {
  const mapa = construirMapaFilhos(dados);
  const raizes = getRaizesArvore(dados);
  const out: LinhaArvoreFinanceira[] = [];
  const visit = (no: LinhaArvoreFinanceira) => {
    out.push(no);
    if (!expandidos.has(no.id_linha)) return;
    const filhos = mapa.get(no.id_linha) ?? [];
    for (const f of filhos) visit(f);
  };
  for (const r of raizes) visit(r);
  return out;
}

export function toggleNoArvore(estado: Set<string>, idLinha: string): Set<string> {
  const novo = new Set(estado);
  if (novo.has(idLinha)) novo.delete(idLinha);
  else novo.add(idLinha);
  return novo;
}

export function calcularKpisArvore(dados: LinhaArvoreFinanceira[]) {
  const titulos = dados.filter((i) => i.tipo_linha === 'TITULO');
  const valor_original = titulos.reduce((s, r) => s + (r.valor_original || 0), 0);
  const valor_aberto = titulos.reduce((s, r) => s + (r.valor_aberto || 0), 0);
  const vencidos = titulos.filter((r) => r.status_titulo === 'VENCIDO');
  const valor_vencido = vencidos.reduce((s, r) => s + (r.valor_aberto || 0), 0);
  return {
    total_titulos: titulos.length,
    valor_original_total: valor_original,
    valor_aberto_total: valor_aberto,
    titulos_vencidos: vencidos.length,
    valor_vencido_total: valor_vencido,
  };
}
