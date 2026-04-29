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
    module: 'Passagens Aéreas',
    items: [
      { key: 'passagens.mapa-destinos', label: 'Mapa de Destinos (Brasil)' },
      { key: 'passagens.top-destinos', label: 'Top 5 Destinos' },
      { key: 'passagens.kpis-charts', label: 'Gráficos do dashboard de passagens' },
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
  {
    module: 'Faturamento Genius',
    items: [
      { key: 'faturamento.charts', label: 'Análises gráficas de faturamento' },
    ],
  },
  {
    module: 'Configurações (admin)',
    items: [
      { key: 'admin.dashboard-uso', label: 'Dashboard de Uso de Usuários' },
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
