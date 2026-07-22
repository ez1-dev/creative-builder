// Helper compartilhado para ler a capacidade de filtro por Unidade de Negócio
// a partir da meta dos endpoints /api/contabil/dre/matriz e
// /api/contabil/modelos/{id}/resultado-pronto. O contrato é o mesmo nos dois.

export interface UnidadeNegocioOption {
  codigo: string;
  nome?: string | null;
}

export interface UnidadeCapabilities {
  /** Meta já foi recebida (evita mostrar filtro por frações de segundo). */
  carregado: boolean;
  /** Backend liberou a materialização/filtragem por unidade de negócio. */
  suportaFiltro: boolean;
  /** Lista para popular o Select. */
  unidades: UnidadeNegocioOption[];
  /** Descrição informativa da regra de classificação usada pelo backend. */
  regra: string | null;
  /** Motivo textual quando o filtro não está disponível. */
  motivo: string | null;
  /** Backend recebeu unidade mas ignorou (retornou consolidado). */
  filtroIgnorado: boolean;
}

export const UNIDADE_CAPABILITIES_DEFAULT: UnidadeCapabilities = {
  carregado: false,
  suportaFiltro: false,
  unidades: [],
  regra: null,
  motivo: null,
  filtroIgnorado: false,
};

export function getUnidadeCapabilities(meta: any | null | undefined): UnidadeCapabilities {
  if (meta == null) return { ...UNIDADE_CAPABILITIES_DEFAULT };
  const unidades = Array.isArray(meta.unidades_negocio)
    ? meta.unidades_negocio
        .map((u: any) => ({
          codigo: String(u?.codigo ?? u?.code ?? ''),
          nome: u?.nome ?? u?.name ?? null,
        }))
        .filter((u: UnidadeNegocioOption) => !!u.codigo)
    : [];
  return {
    carregado: true,
    suportaFiltro: meta.suporta_filtro_unidade === true,
    unidades,
    regra: meta.unidade_regra ?? null,
    motivo: meta.unidade_indisponivel_motivo ?? null,
    filtroIgnorado: meta.unidade_filtro_ignorado === true,
  };
}
