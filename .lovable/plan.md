# Ajuste de enquadramento do BrazilHeatMap

## Problema
O mapa está cortado: faltam o extremo norte (RR, AP, parte do AM/PA) e o extremo sul (RS, SC). A combinação atual `scale: 760` + `width: 680` + `height: 520` + `center: [-54, -15]` projeta o Brasil maior do que o viewBox, e os rótulos de UFs como RR/AP/SC/RS ficam fora da área visível.

## Causa
- `scale` muito alto para o tamanho do viewBox.
- `height/width` do `ComposableMap` com proporção que não acomoda a forma do Brasil (mais alto que largo).
- Centro vertical em `-15` desloca o mapa para cima, cortando o sul.

## Mudanças (somente em `src/components/bi/maps/BrazilHeatMap.tsx`)

1. **Projeção**: reduzir `scale` para que o Brasil inteiro caiba com folga, e recentrar verticalmente.
   - `projectionConfig={{ scale: 620, center: [-54, -14] }}`
   - `width={620}`, `height={620}` (proporção ~1:1, que casa melhor com a silhueta do Brasil).
   - `style={{ width: '100%', height: '100%', maxWidth: 720 }}` (deixa o SVG escalar dentro do card sem estourar).

2. **Container do mapa**: trocar `maxWidth: 760` por `maxWidth: 720` e garantir `h-full` para usar toda altura do card, sem reservar mais espaço que o necessário para a legenda.

3. **Altura do card**: aumentar `DEFAULT_HEIGHT` de `360` para `440` (somente o default; o widget continua podendo sobrescrever via prop `height`). Isso dá espaço vertical para o Brasil inteiro sem espremer a legenda.

4. **Legenda**: manter à esquerda, mas reduzir `minWidth` de `80` para `72` e a altura da barra para `Math.min(240, mapHeight * 0.75)` para acompanhar o novo `mapHeight`.

5. **Siglas**: manter `geoCentroid` + `Marker`. Como a escala diminui, ajustar `fontSize` base para `9` (zoom 1) e `8` quando `zoom > 1`, evitando sobreposição em estados pequenos.

## Não muda
- Paleta `HEAT_COLOR_STOPS`, `heatColor`, `heatColorFromValue`, `buildUfValueMap` (sem mexer em `mapUtils.ts`).
- API, fetch, filtros, drill, cross-filter, zoom/pan, tooltip nativo, `BrazilHeatMapWidget`, `comercialWidgetCatalog`.

## Validação
- Abrir `/bi/comercial` no preview: mapa deve mostrar de RR/AP (norte) até RS (sul) sem corte.
- Legenda continua à esquerda com "Fat. (R$)", máximo no topo e 0 embaixo.
- Siglas legíveis dentro dos estados grandes; siglas de UFs pequenas seguem ocultas em zoom 1.
- Zoom/pan/reset e clique por UF continuam funcionando.
