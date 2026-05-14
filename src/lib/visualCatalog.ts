// Catálogo de gráficos e mapas controláveis por perfil de acesso.
// Cada item é uma "chave visual" estável usada em <VisualGate visualKey="..."> e
// na tabela `profile_visuals`. Adicionar novas entradas aqui as torna automaticamente
// configuráveis na aba "Gráficos e Mapas" em Configurações.

export interface VisualItem {
  key: string;
  label: string;
}

export interface VisualGroup {
  module: string;
  items: VisualItem[];
}

export const VISUAL_CATALOG: VisualGroup[] = [
  {
    module: 'Manutenção de Frota',
    items: [
      { key: 'frota.chart-evolucao-mensal',  label: 'Gráfico: Evolução Mensal' },
      { key: 'frota.chart-segmento',         label: 'Gráfico: Distribuição por Segmento' },
      { key: 'frota.chart-top-veiculos',     label: 'Gráfico: Top Veículos por Valor' },
      { key: 'frota.chart-top-fornecedores', label: 'Gráfico: Top Fornecedores' },
      { key: 'frota.chart-top-cc',           label: 'Gráfico: Top Centros de Custo' },
      { key: 'frota.chart-top-motoristas',   label: 'Gráfico: Top Motoristas' },
    ],
  },
  {
    module: 'Manutenção de Máquinas',
    items: [
      { key: 'maquinas.chart-evolucao-mensal',  label: 'Gráfico: Evolução Mensal' },
      { key: 'maquinas.chart-tipo-maquina',     label: 'Gráfico: Por Tipo de Máquina' },
      { key: 'maquinas.chart-top-maquinas',     label: 'Gráfico: Top Máquinas' },
      { key: 'maquinas.chart-top-fornecedores', label: 'Gráfico: Top Fornecedores' },
      { key: 'maquinas.chart-top-cc',           label: 'Gráfico: Top Centros de Custo' },
      { key: 'maquinas.chart-top-descricoes',   label: 'Gráfico: Top Descrições' },
      { key: 'maquinas.drill-hierarquico',      label: 'Drill-down hierárquico' },
    ],
  },
  {
    module: 'Passagens Aéreas',
    items: [
      { key: 'passagens.kpis-charts', label: 'Gráficos (todos — chave de retrocompatibilidade)' },
      { key: 'passagens.chart-evolucao-mensal', label: 'Gráfico: Evolução Mensal' },
      { key: 'passagens.chart-motivo-viagem',   label: 'Gráfico: Por Motivo de Viagem' },
      { key: 'passagens.chart-top-cc',          label: 'Gráfico: Top Centros de Custo' },
      { key: 'passagens.chart-top-cidades',     label: 'Gráfico: Top Cidades de Destino' },
      { key: 'passagens.chart-top-uf',          label: 'Gráfico: Top Estados (UF)' },
      { key: 'passagens.chart-top-destinos-valor', label: 'Gráfico: Top Destinos por Valor' },
    ],
  },
  {
    module: 'Produção – Dashboard',
    items: [
      { key: 'producao.cargas-periodo', label: 'Cargas por Período' },
      { key: 'producao.status-projetos', label: 'Status dos Projetos' },
      { key: 'producao.top-saldo-patio', label: 'Top Projetos com Maior Saldo em Pátio' },
    ],
  },
  {
    module: 'Produção – Relatório Semanal Obra',
    items: [
      { key: 'producao.top-peso', label: 'Top 10 Obras por Peso' },
      { key: 'producao.top-pecas', label: 'Top 10 Obras por Peças' },
      { key: 'producao.top-cargas', label: 'Top 10 Obras por Cargas' },
      { key: 'producao.evolucao-semanal', label: 'Evolução Semanal' },
      { key: 'producao.peso-medio-carga', label: 'Peso Médio por Carga' },
      { key: 'producao.clientes-participacao', label: 'Participação por Cliente' },
    ],
  },
  {
    module: 'Produção – Meta Entrega Semanal',
    items: [
      { key: 'producao.meta-semanal', label: 'Meta de Entrega Semanal' },
    ],
  },
  {
    module: 'Painel de Compras',
    items: [
      { key: 'compras.top-fornecedores', label: 'Top Fornecedores (Valor Líquido)' },
      { key: 'compras.top-familias', label: 'Top Famílias por Valor Líquido' },
      { key: 'compras.top-origens', label: 'Top Origens por Valor Líquido' },
    ],
  },
];

export const ALL_VISUAL_KEYS: string[] = VISUAL_CATALOG.flatMap((g) => g.items.map((i) => i.key));

export function findVisualLabel(key: string): string {
  for (const g of VISUAL_CATALOG) {
    const it = g.items.find((i) => i.key === key);
    if (it) return it.label;
  }
  return key;
}
