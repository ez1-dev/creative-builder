# Rótulos enriquecidos (nome + valor + %) na Biblioteca BI

## Objetivo

Reproduzir o estilo de rótulos do gráfico "Por Motivo de Viagem" (nome + R$ abreviado + percentual) como uma opção reutilizável no `VisualConfigEditor`, valendo para qualquer página BI que use os componentes da biblioteca.

Referência visual (já existente em `PassagensDashboard.tsx` linhas 1186-1206):

```text
CONTRATAÇÃO
R$143 Mil (18,9%)
```

## Mudanças

### 1. `src/lib/bi/visualConfig.ts`
Adicionar 2 campos opcionais em `dataLabels` (compatível com configs salvas):
- `richLabel: boolean` — ativa rótulo "nome + valor + %"
- `showName: boolean` — controla se exibe o nome da categoria (default true quando rich)
- `showPercent: boolean` — controla se exibe o percentual (default true quando rich)

Default: `richLabel: false`, `showName: true`, `showPercent: true`. Atualizar `DEFAULT_VISUAL_CONFIG`, `mergeVisualConfig` (já cobre por spread).

Adicionar helper `formatRichLabel({ name, value, total, cfg })` que retorna:
- nome truncado em 18 chars + "…"
- valor formatado por `formatDataLabel` (já existe; usuário escolheu "compact")
- `(xx,x%)` calculado em cima de `total`

### 2. `src/components/bi/visual/VisualConfigEditor.tsx`
Na aba "Rótulos", logo abaixo do switch "Exibir valores no gráfico", adicionar:
- Switch **"Rótulos enriquecidos (nome + valor + %)"** (vincula `dataLabels.richLabel`)
- Quando ligado, exibir 2 sub-switches: "Mostrar nome" e "Mostrar percentual"
- Texto de ajuda: "Igual ao gráfico 'Por Motivo de Viagem'. Funciona melhor em Pizza/Rosca, Barras, Treemap e Linha/Área."

Quando `richLabel` está ativo, ocultar campos de "Prefixo/Sufixo" (não fazem sentido) e manter Formato/Decimais (controlam o valor numérico).

### 3. Componentes de gráfico — adotar `richLabel`

Em cada componente abaixo, calcular `total = sum(data.valor)` e, quando `vc.dataLabels.visible && vc.dataLabels.richLabel`, renderizar rótulo customizado em vez do `LabelList` padrão.

**`PieChartCard.tsx` / `DonutChartCard.tsx`**
- Trocar `LabelList` por `label` customizado no `<Pie>` (estilo exato de `PassagensDashboard.tsx` 1189-1206 — texto SVG com `<tspan>` em 2 linhas posicionado em `outerRadius + 22`)
- Ativar `labelLine` quando `richLabel` está ligado

**`BarChartCard.tsx` / `HorizontalBarChartCard.tsx`**
- Substituir `LabelList` simples por `LabelList` com `content={renderRichBarLabel}` que desenha 2 linhas SVG (nome em cima, "valor (%)" embaixo) acima/à direita da barra

**`TreemapChartCard.tsx`**
- No `content` do Treemap, quando `richLabel` ativo, renderizar nome + valor + % dentro do retângulo (ocultar se a área for menor que ~80×40 px)

**`LineChartCard.tsx` / `AreaChartCard.tsx`**
- Trocar `LabelList` por componente que renderiza 2 linhas em cada ponto (nome do eixo X + valor/%). Reduzir auto-skip se ficar denso

### 4. Sem mudança em
- `MultiSeriesChartCard.tsx`, mapas, KPIs, tabelas, ranking — escopo definido pelo usuário
- Backend/ETL
- Persistência (`config.visual` já guarda objeto livre)

## Compatibilidade

- Configs antigas continuam funcionando (`richLabel` ausente → comportamento atual via `LabelList`)
- Toggle é puramente cosmético; não muda dados nem mapping
- `ConfigureChartDialog` já passa `visual` para `options.visual` — sem mudança

## Validação

1. `/passagens-aereas` — confirmar que o card "Por Motivo de Viagem" continua igual (não muda — é código próprio)
2. `/bi/comercial` — em qualquer bloco Pizza/Rosca, ativar "Rótulos enriquecidos" e verificar nome+R$ Mil+%
3. Em um bloco de Barras, ativar e ver rótulo acima de cada barra com 2 linhas
4. Em Treemap, confirmar que rótulos aparecem nos blocos grandes e somem nos pequenos
5. Em Linha/Área, confirmar que cada ponto mostra rótulo legível
6. Desativar o toggle e confirmar volta ao `LabelList` simples
7. Salvar/recarregar página e confirmar persistência

## Arquivos editados
- `src/lib/bi/visualConfig.ts` (campos + helper)
- `src/components/bi/visual/VisualConfigEditor.tsx` (3 switches)
- `src/components/bi/charts/PieChartCard.tsx`
- `src/components/bi/charts/DonutChartCard.tsx`
- `src/components/bi/charts/BarChartCard.tsx`
- `src/components/bi/charts/HorizontalBarChartCard.tsx`
- `src/components/bi/charts/TreemapChartCard.tsx`
- `src/components/bi/charts/LineChartCard.tsx`
- `src/components/bi/charts/AreaChartCard.tsx`
