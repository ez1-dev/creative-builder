## Objetivo

Refinar o `BrazilHeatMap` (já em escala Spectral) para ficar mais próximo da referência: mapa maior e centralizado, siglas com contorno branco para contraste, zoom/pan com botões, tooltip mais informativo e título de produto. Sem mexer em API, filtros, drill ou no widget cartograma.

## Escopo

Arquivos alterados:
1. `src/components/bi/maps/BrazilHeatMap.tsx` — refinos visuais + ZoomableGroup + label com stroke + tooltip rico + título limpo.
2. `src/lib/bi/mapUtils.ts` — adicionar `heatColorFromValue` no formato pedido (cinza `#e5e7eb` para sem dado) mantendo helpers atuais.
3. `src/components/bi/comercial/BrazilHeatMapWidget.tsx` — só ajuste do `title`/`subtitle` default ("Faturamento por UF" / "Mapa de calor por estado"), sem mudar props nem lógica.

Não muda: `comercialApi`, `comercialWidgetCatalog`, `componentRegistry`, `BrazilStateMapWidget` (cartograma), `fetchComercialEstado`, filtros, drill, applyCtxAsCrossFilter.

## Mudanças detalhadas

### `mapUtils.ts`
- Manter `HEAT_COLOR_STOPS`, `heatColor`, `buildUfValueMap`.
- Substituir `heatColorFromValue` para devolver `#e5e7eb` quando `valor<=0` ou sem dado (em vez de `hsl(var(--muted))`), garantindo contraste explícito com a paleta.

### `BrazilHeatMap.tsx`
- **Layout**: container `flex` com legenda à esquerda (largura fixa ~80px) e área do mapa `flex-1` centralizada. Mapa `<ComposableMap width=680 height=520 projectionConfig={{scale:760, center:[-54,-15]}}>` com `style={{ width:'100%', maxWidth:'760px', height:'auto' }}`.
- **ZoomableGroup**: importar de `react-simple-maps`. Estado local `position = { coordinates:[-54,-15], zoom:1 }`. `minZoom=1`, `maxZoom=8`. Botões flutuantes no canto superior direito do mapa: `+`, `−`, `⟲` (reset). Implementados como `<button>` absolutos sobre o container do mapa, usando tokens (`bg-background/90 border-border`).
- **Siglas**: manter `geoCentroid` + `<Marker>` + `<text>`. Adicionar `stroke="#fff"`, `strokeWidth={2.5}`, `paintOrder="stroke"` para contorno branco; `fill="#111827"`; `fontSize=10`, `fontWeight=600`; `pointerEvents:'none'`. Esconder label quando `zoom<=1` e estado for muito pequeno (lista fixa: DF, SE, AL, PB, RN, PE — ou medir bounding box do path; vamos usar a lista fixa por simplicidade e por já corresponder ao problema visível no print).
- **Cores**: usar `heatColorFromValue(v, max)` (cinza `#e5e7eb` para sem dado).
- **Hover/seleção**: `default.stroke = isSelected ? '#111827' : '#ffffff'`, `strokeWidth = isSelected ? 2 : 0.6`; `hover.stroke = '#111827'`, `strokeWidth = 1.4`.
- **Tooltip nativo (`<title>`)**: incluir nome completo, UF, faturamento formatado e participação `% = v/total*100` (calcular `total = sum(valores)`). Texto sem valor: `"<Estado> (UF) — Sem faturamento no período"`.
- **Legenda vertical**: já existe; ajustar para barra `h-[220px] w-4 rounded-full` com `linear-gradient(to top, HEAT_COLOR_STOPS)`, título `Fat. (R$)`, max formatado no topo, `0` na base. Continua usando `valueFormatter` (respeita modo global de arredondamento).
- **Título**: o `title`/`subtitle` vêm via props (definidos no Widget); o componente em si não hardcoda.

### `BrazilHeatMapWidget.tsx`
- Trocar defaults: `title="Faturamento por UF"`, `subtitle="Mapa de calor por estado"`.

## Critérios de aceite

- Mapa centralizado, ocupando bem o card, sem sobra lateral grande.
- Escala azul → ciano → amarelo → laranja → vermelho aplicada.
- Estados sem dado em cinza claro (`#e5e7eb`), distintos do azul mais baixo.
- Siglas legíveis com contorno branco; siglas de estados pequenos somem em zoom 1.
- Legenda vertical à esquerda com `Fat. (R$)`, max e 0.
- Botões de zoom/reset funcionam; pan via arrasto.
- Clique por UF continua chamando `onStateClick` (drill/cross-filter intactos).
- Sem mudança em backend/API.
