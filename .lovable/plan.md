## Problema

Ao abrir "Configurar gráfico" num bloco canônico do dashboard de Frota (ex.: "Top Veículos"), o diálogo abre com `Tipo de visualização = Gráfico de Barras` e `Série = Evolução mensal · Valor (R$)` — que são apenas os defaults do `ConfigureChartDialog`, não a configuração real do bloco. Isso acontece porque os blocos canônicos (`chart-top-veiculos`, `chart-evolucao-mensal`, `chart-categoria`, etc.) são renderizados com componentes específicos hardcoded no `blocks[...]`, sem `componentId`/`mapping` no widget. Quando `widget.componentId` é `undefined`, o diálogo cai no default.

## Solução

Definir, no `FrotaDashboard.tsx`, um mapa `CANONICAL_DEFAULTS` que descreva a configuração real de cada um dos 8 blocos canônicos configuráveis, e usar esse mapa como fallback ao montar `configureTarget.initial`.

## Mudança

Arquivo único: `src/components/frota/FrotaDashboard.tsx`

1. Adicionar constante (perto de `CONFIGURABLE_CANONICAL`, linha ~91):

```ts
const CANONICAL_DEFAULTS: Record<string, Partial<ConfigureChartValue>> = {
  'chart-evolucao-mensal':  { componentId: 'bar-chart',     mapping: { series: 'mensal__valor' },        customTitle: 'Evolução mensal (R$)' },
  'chart-categoria':        { componentId: 'donut-chart',   mapping: { series: 'por_categoria__valor' }, customTitle: 'Por Segmento (Categoria)' },
  'chart-segmento':         { componentId: 'donut-chart',   mapping: { series: 'por_segmento__valor' },  customTitle: 'Distribuição por Segmento (FROTA/GENIUS/OBRA)' },
  'chart-top-veiculos':     { componentId: 'ranking-chart', mapping: { series: 'por_placa__valor' },       customTitle: 'Placa — Ranking',           options: { topN: 10 } },
  'chart-top-fornecedores': { componentId: 'ranking-chart', mapping: { series: 'por_fornecedor__valor' },  customTitle: 'Fornecedor — Ranking',      options: { topN: 10 } },
  'chart-top-cc':           { componentId: 'ranking-chart', mapping: { series: 'por_centro_custo__valor' },customTitle: 'Centro de Custo — Ranking', options: { topN: 10 } },
  'chart-top-motoristas':   { componentId: 'ranking-chart', mapping: { series: 'por_motorista__valor' },   customTitle: 'Motorista — Ranking',       options: { topN: 10 } },
  'chart-tipo-veiculo':     { componentId: 'donut-chart',   mapping: { series: 'por_tipo_veiculo__valor' },customTitle: 'Por Tipo de Veículo' },
};
```

2. Ajustar `configureTarget` (linhas ~423–439) para combinar `CANONICAL_DEFAULTS[configureType]` com os overrides salvos no widget:

```ts
const defaults = CANONICAL_DEFAULTS[configureType] ?? {};
return {
  widget,
  initial: pending !== undefined
    ? ({ ...defaults, ...(pending ?? {}) }) as Partial<ConfigureChartValue>
    : ({
        componentId: widget?.componentId ?? defaults.componentId,
        mapping:     widget?.mapping     ?? defaults.mapping,
        customTitle: widget?.customTitle ?? defaults.customTitle,
        options:     widget?.options     ?? defaults.options,
      } as Partial<ConfigureChartValue>),
};
```

O `pending` já representa a customização em andamento; permanece prevalente. Novos gráficos (`custom-*`) continuam usando o `componentId`/`mapping` próprios porque `defaults` fica vazio.

## Fora do escopo

- Passagens Aéreas / Máquinas / RH: mesmo padrão poderia ser aplicado, mas o usuário reportou o problema em Frota. Deixar como follow-up.
- Nenhuma mudança visual dos blocos renderizados.
- Nenhuma mudança no `ConfigureChartDialog` — os defaults do dialog continuam intactos.

## Validação

1. `/frota` → configurar "Top Veículos": diálogo abre com `Tipo = Ranking`, `Série = Placa · Valor (R$)`, `Top N = 10`, título "Placa — Ranking".
2. Configurar "Evolução Mensal": `Tipo = Gráfico de Barras`, `Série = Evolução mensal · Valor (R$)`.
3. Configurar "Por Segmento (Categoria)": `Tipo = Donut`, `Série = Categoria · Valor (R$)`.
4. Após aplicar uma customização e reabrir, a customização (pending ou salva) prevalece sobre o default.
