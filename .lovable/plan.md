## Objetivo

Tornar o **Mapa de Calor do Brasil por UF** (heatmap geográfico real, baseado em GeoJSON) disponível em **qualquer dashboard de BI**, da mesma forma que `brazil-map` (cartograma) já está disponível hoje via Biblioteca BI / Dashboard Builder.

Hoje o `BrazilHeatMap` só é usado:
- Direto no `ComercialPage` via `BrazilHeatMapWidget` (acoplado a `fetchComercialEstado`)
- Na demo (`BiComponentsDemoPage`)

Ele **não aparece** no `COMPONENT_REGISTRY` e por isso **não pode** ser arrastado no Dashboard Builder nem adicionado pelo dialog "Adicionar bloco" em outros BIs (Faturamento Validação, Metas, Relatório Executivo, Passagens Aéreas, dashboards do Dashboard Builder, etc.).

## O que será feito

### 1. Registrar `brazil-heat-map` (genérico, data-driven) no `COMPONENT_REGISTRY`

Arquivo: `src/lib/bi/componentRegistry.tsx`

Novo item de registro, espelhando o padrão do `brazil-map` existente, mas renderizando `<BrazilHeatMap />` (mapa coroplético geográfico real) em vez do cartograma:

- `id: 'brazil-heat-map'`
- `label: 'Mapa de Calor Brasil (UF)'`
- `description: 'Mapa coroplético do Brasil por Estado, baseado em série {uf, valor}.'`
- `kind: 'chart'`, `defaultSpan: 2`
- `inputs`: uma série `por UF` (mesma assinatura do `brazil-map`)
- `autoMap`: prioriza séries cuja key bate `/estado|uf/i`
- `render`: extrai `{uf, valor, label}` da série e renderiza `<BrazilHeatMap data={...} valueFormatter={formatterForSeriesKey(...)} onStateClick={...} />`, usando `makeClickHandler` para cross-filter no dashboard host

Resultado: **qualquer página** que passe séries pelo `PageDataContext` (Dashboard Builder, Passagens Aéreas, novos BIs) ganha o heatmap na biblioteca, com mapeamento de dados via dialog "Configurar bloco".

### 2. Registrar `brazil-heat-map-comercial` (host BI Comercial)

Mesmo padrão do `BrazilStateMapRegistryHost` atual, mas usando `BrazilHeatMapWidget` (que já chama `fetchComercialEstado` com filtros do `PageDataContext`):

- `id: 'brazil-heat-map-comercial'`
- `label: 'Mapa de Calor Brasil — Comercial'`
- `description: 'Heatmap por UF do BI Comercial usando filtros da página.'`
- `inputs: []`, `autoMap: () => ({})`
- `render`: `<BrazilHeatMapComercialHost title={title} />` lendo `filtros` do `usePageData()`

Isso garante paridade com o `brazil-state-map` atual (cartograma do Comercial) — o usuário pode escolher entre os dois.

### 3. Atualizar `comercialWidgetCatalog`

Arquivo: `src/lib/bi/comercialWidgetCatalog.ts`, entrada `'estados'`:

```ts
libraryComponentIds: ['brazil-state-map', 'brazil-heat-map-comercial', 'brazil-heat-map', ...LIB_CHART_IDS]
```

Assim o dialog "Substituir/Configurar bloco" no BI Comercial passa a oferecer também o heatmap.

### 4. Demo

Em `src/pages/BiComponentsDemoPage.tsx`, adicionar uma seção `WithApply componentId="brazil-heat-map"` ao lado do `brazil-state-map` para validar o componente no fluxo do registry (mapeamento + render).

### 5. Sem mudanças de backend

Reusa dados que cada BI já expõe (séries por UF no `PageDataContext` ou filtros do Comercial). Nenhum endpoint novo.

## Arquivos afetados

- `src/lib/bi/componentRegistry.tsx` — registra 2 novos componentes + host wrapper para o heatmap Comercial
- `src/lib/bi/comercialWidgetCatalog.ts` — adiciona os novos ids à entrada `estados`
- `src/pages/BiComponentsDemoPage.tsx` — demo do `brazil-heat-map`

Não altera:
- `BrazilHeatMap.tsx` / `BrazilHeatMapWidget.tsx` (já genéricos o suficiente)
- `BrazilStateMapWidget` / `brazil-state-map` (mantidos para compatibilidade)
- Layout default dos BIs existentes (usuário adiciona/substitui via Builder/Dialog)

## Como o usuário usará depois

- **Dashboard Builder / Biblioteca BI**: o card "Mapa de Calor Brasil (UF)" aparece no catálogo de componentes; arrastar e mapear uma série `{uf, valor}`.
- **BI Comercial**: no dialog "Configurar bloco" do widget `estados`, escolher entre `Cartograma`, `Mapa de Calor (Comercial)` ou `Mapa de Calor (genérico via série)`.
- **Outros BIs (Validação, Metas, Relatório Executivo, Passagens Aéreas)**: adicionar via "Adicionar bloco" apontando para uma série por UF do contexto da página.
