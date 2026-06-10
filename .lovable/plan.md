Problema: nos pie/donut com rich labels, a linha-guia é cinza e o texto é preto, então quando há sobreposição (fatias pequenas como GENIUS/EZORTEA ou EMPILHADEIRA/336) não dá pra saber qual rótulo pertence a qual fatia.

**Arquivo:** `src/components/bi/charts/PieChartCard.tsx` (função `RichLabelsLayer`)

Mudanças:

1. **Linha-guia colorida pela fatia** — trocar `stroke="hsl(var(--muted-foreground))"` por `stroke={it.color}` e subir `opacity` para 0.9 e `strokeWidth` para 1.5. Assim cada cotovelo tem a mesma cor da fatia de origem.

2. **Bolinha de ancoragem na ponta da linha (junto ao texto)** — adicionar um `<circle r=3 fill={it.color}>` em `(it.labelX ± 2, it.y)` para marcar visualmente qual rótulo pertence à cor.

3. **Nome da série colorido** — pintar `it.line1` (nome) com `fill={it.color}` e deixar só o `line2` (valor/percentual) em `--muted-foreground`. Reforça a associação cor↔legenda.

4. **Gap mínimo maior + clamp** — aumentar `minGap` de `blockH + 4` para `blockH + 8` e, quando `data.length` for grande (>6), reduzir `fs` em 1px só dentro do layer, para diminuir colisões residuais como `EMPILHADEIRA / 336`.

Sem mudanças em outros gráficos, na legenda inferior, nos tooltips ou no comportamento de clique/drill. Afeta todos os pies/donuts do app (BI Comercial, Frota, Máquinas, Passagens etc.) que usam `richLabel`.
