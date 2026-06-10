## Objetivo

Ajustar o `BrazilHeatMap` (mapa geográfico real usado em BI Comercial) para ficar parecido com a referência enviada:

- Escala de cor multi-tom (azul → ciano → verde → amarelo → laranja → vermelho) ao invés do gradiente mono `--primary`.
- Rótulo da UF (sigla) desenhado dentro de cada estado.
- Legenda vertical à esquerda com título `Fat. (R$)`, valor máximo no topo e `0` na base, com barra de gradiente correspondente.
- Mapa centralizado no card, com proporções equilibradas (sem sobrar grande espaço lateral).

Nenhuma alteração no widget cartograma (`BrazilStateMapWidget`) nem no fluxo de dados/`Aplicar` — apenas no componente visual `BrazilHeatMap` (que é o item “Mapa de Calor (geo)” aplicado pelo botão Aplicar).

## Arquivos afetados

1. `src/components/bi/maps/BrazilHeatMap.tsx`
   - Substituir intensidade única por escala de cor categórica/contínua usando paleta tipo Spectral:
     - Stops em HSL puro (sem token): `#2c7bb6`, `#abd9e9`, `#ffffbf`, `#fdae61`, `#d7191c` (mesma família da referência).
     - Função `heatColor(t)` que interpola entre stops; `t = v / max`.
   - Adicionar `<text>` com a sigla da UF no centróide de cada `<Geography>` usando `geoCentroid` de `d3-geo` (já instalado via `react-simple-maps`/`d3-geo`).
   - Trocar legenda horizontal por legenda vertical à esquerda:
     - Título “Fat. (R$)” em cima.
     - Valor formatado do `max` no topo da barra, `0` embaixo.
     - Barra com `linear-gradient(to top, ...mesmas stops...)`.
   - Layout do card: `flex-row` com legenda à esquerda (largura fixa ~110px) e o `<ComposableMap>` ocupando o restante, centralizado vertical e horizontalmente; ajustar `projectionConfig.scale` para preencher melhor o container.

2. `src/lib/bi/mapUtils.ts`
   - Exportar `HEAT_COLOR_STOPS` e helper `heatColorFromValue(valor, max)` para reuso.

## Detalhes técnicos

- A paleta é fixa (não usa tokens semânticos) porque a referência exige cores específicas de escala de calor; isso é uma exceção justificada para visualização de dados, igual ao que já acontece em outras libs de chart.
- `geoCentroid` retorna `[lon, lat]`; usar com `<Marker coordinates>` do `react-simple-maps` para posicionar o `<text>` da sigla. Fonte ~10px, `fill: #111`, `pointerEvents: none`.
- Tooltip nativo (`<title>`) e `onStateClick` continuam iguais.
- Largura interna ajustada: container `flex-1`, `<ComposableMap width=520 height=height-40>` com `projectionConfig.scale ≈ 820` e `center=[-54,-15]`.
- `BrazilHeatMapWidget` (consumidor) não muda.
