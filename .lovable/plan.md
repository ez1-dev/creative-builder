## Problema

No modo `richLabel`, os rótulos do `PieChartCard` ficam sobrepostos e desalinhados (ex.: "Por Tipo de Veículo" no print). Causas no `RichLabelsLayer` atual:

1. `labelX` é calculado a partir do `elbowX` (que depende do ângulo da fatia), então labels do mesmo lado terminam em colunas X diferentes — texto de um item invade o do outro.
2. A pizza usa `outerRadius` fixo (88) centrada em 50%/50% do container, sem reservar margem lateral para os textos. Em cards estreitos não sobra espaço horizontal.
3. `resolveCollisions` empilha verticalmente, mas como cada label tem X próprio, o empilhamento não evita colisão visual.
4. Fatias muito pequenas (<2%) escondem `line1` (nome), o que confunde a leitura quando há muitos itens (TRATOR, CARREGADEIRA, etc.).

## Plano

Refatorar **apenas** `RichLabelsLayer` e o dimensionamento do `<Pie>` em `src/components/bi/charts/PieChartCard.tsx`:

1. **Reservar margens laterais para os labels**
   - Calcular `labelColW` (largura estimada do bloco de texto, ex.: 110–130px conforme `layerFs`).
   - Reduzir `outerRadius` dinamicamente quando `rich=true`: `effectiveOuter = Math.max(50, Math.min(outerRadius, (cw / 2) - labelColW - 24))`.
   - Reduzir `innerRadius` proporcionalmente quando for donut.
   - Passar esse raio para o `<Pie>` via state/ref do layer (renderiza o `<Pie>` com `outerRadius`/`innerRadius` calculados a partir do container — usar `ResponsiveContainer` callback ou medir o `cw` por `useRef`+`ResizeObserver`). Solução mais simples: usar `Customized` para desenhar inclusive a pizza não — manter `<Pie>` mas com `outerRadius` em função do `height` (já fixo) e adicionar `margin` no `<PieChart>` (`margin={{ left: 120, right: 120 }}`) quando `rich`. Isso é o ajuste prático sem reescrever a pizza.

2. **Alinhar todos os labels do mesmo lado numa coluna X fixa**
   - `labelX` à direita = `cw - 8` com `textAnchor="end"`... ou manter `textAnchor="start"` com `labelX = cx + outerRadius + 60` (constante). À esquerda, espelhado.
   - O cotovelo (`elbowX`) continua próximo da fatia; o segmento horizontal vai até `labelX - 4` (ou `+4` à esquerda). Assim todos os textos ficam alinhados em coluna, sem sobreposição lateral.

3. **Sempre mostrar o nome da série**
   - Remover o `isTiny` que zera `line1`. Em fatias pequenas, manter nome (com truncamento já existente) — a colisão vertical é resolvida pelo `resolveCollisions`.

4. **Aumentar `minGap` quando há muitos itens**
   - `minGap = blockH + (data.length > 8 ? 10 : 6)`.

5. **Sem mudanças** em tooltip, legenda, cor, formatação, drill, ou outros tipos de gráfico.

### Resultado esperado

- Cada label fica numa coluna X fixa por lado (direita/esquerda), com linha-guia de 3 segmentos sem cruzamento de texto.
- Em "Por Tipo de Veículo" (8 fatias) todos os 8 nomes aparecem legíveis, distribuídos verticalmente.
- Em "Por Segmento" (4 fatias) o layout continua limpo.

### Arquivos afetados

- `src/components/bi/charts/PieChartCard.tsx` (único arquivo).
