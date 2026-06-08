import { useCallback, useMemo, useState } from 'react';

export type UnidadeNegocio = 'GENIUS' | 'ESTRUTURAL ZORTEA' | 'CONSOLIDADO';

export type BiComercialDrillKey =
  | 'anomes_emissao'
  | 'cd_estado'
  | 'cd_cliente'
  | 'cd_prj'
  | 'cd_rev_pedido'
  | 'cd_origem'
  | 'cd_tp_movimento'
  | 'cd_tns'
  | 'cd_nf'
  | 'cd_produto'
  | 'cd_derivacao'
  | 'categoria_custom';

export const DRILL_LABELS: Record<BiComercialDrillKey, string> = {
  anomes_emissao: 'Ano/Mês',
  cd_estado: 'Estado',
  cd_cliente: 'Cliente',
  cd_prj: 'Obra',
  cd_rev_pedido: 'Revenda',
  cd_origem: 'Origem',
  cd_tp_movimento: 'Tipo Movimento',
  cd_tns: 'TNS',
  cd_nf: 'Nota Fiscal',
  cd_produto: 'Produto',
  cd_derivacao: 'Derivação',
  categoria_custom: 'Categoria',
};

export type BiComercialFilters = {
  anomes_ini: string;
  anomes_fim: string;
  unidade_negocio: UnidadeNegocio;
} & Partial<Record<BiComercialDrillKey, string>>;

export interface DrillChip {
  key: BiComercialDrillKey;
  label: string;
  value: string;
}

export function getActiveDrillChips(f: BiComercialFilters): DrillChip[] {
  return (Object.keys(DRILL_LABELS) as BiComercialDrillKey[])
    .filter((k) => f[k] != null && String(f[k]).length > 0)
    .map((k) => ({ key: k, label: DRILL_LABELS[k], value: String(f[k]) }));
}

export function useComercialFilters(initial: BiComercialFilters) {
  const [filters, setFilters] = useState<BiComercialFilters>(initial);

  const applyDrill = useCallback(
    (key: BiComercialDrillKey, value: string | number | null | undefined) => {
      if (value == null || value === '') return;
      setFilters((f) => ({ ...f, [key]: String(value) }));
    },
    [],
  );

  /**
   * Cross-filter por clique esquerdo no gráfico: se o valor já estiver ativo
   * para a mesma chave, remove (toggle). Senão, substitui.
   */
  const toggleDrill = useCallback(
    (key: BiComercialDrillKey, value: string | number | null | undefined) => {
      if (value == null || value === '') return;
      const v = String(value);
      setFilters((f) => {
        const cur = f[key];
        const next = { ...f };
        if (cur != null && String(cur) === v) {
          delete next[key];
        } else {
          (next as any)[key] = v;
        }
        return next;
      });
    },
    [],
  );

  const removeDrill = useCallback((key: BiComercialDrillKey) => {
    setFilters((f) => {
      const next = { ...f };
      delete next[key];
      return next;
    });
  }, []);

  const clearDrill = useCallback(() => {
    setFilters((f) => ({
      anomes_ini: f.anomes_ini,
      anomes_fim: f.anomes_fim,
      unidade_negocio: f.unidade_negocio,
    }));
  }, []);

  const setBase = useCallback((patch: Partial<BiComercialFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  const chips = useMemo(() => getActiveDrillChips(filters), [filters]);

  return { filters, setFilters, setBase, applyDrill, removeDrill, clearDrill, chips };
}

/** Mapeia categoria do donut "Mix" para o filtro de drill correto. */
export function drillFromMixCategoria(categoria: string): { key: BiComercialDrillKey; value: string } | null {
  const c = String(categoria || '').trim().toUpperCase();
  if (!c) return null;
  // remove acentos para tolerância
  const norm = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (norm === 'MAQUINAS' || norm === 'PECAS') {
    return { key: 'cd_origem', value: c };
  }
  if (norm === 'SERVICOS' || norm === 'PRODUTOS') {
    return { key: 'cd_tp_movimento', value: c };
  }
  return { key: 'cd_origem', value: c };
}
