## Problema

Após adicionar a anti-colisão com coluna fixa + leader lines, os rótulos da pizza ficaram "bagunçados" — visualmente distantes da fatia, com linhas longas e textos colados nas bordas do card. O usuário quer voltar ao estilo do exemplo de referência ("Por Motivo de Viagem"): rótulos curtos posicionados imediatamente fora de cada fatia, sem leader lines visíveis, mas sem voltar a se sobrepor.

## Solução

Refatorar **somente** o `RichLabelsLayer` em `src/components/bi/charts/PieChartCard.tsx` para um modelo **radial sem leader lines**, com anti-colisão mínima:

1. **Posicionamento radial direto**
   - Para cada fatia: `lx = cx + (outerRadius + 12) * cos(mid)`, `ly = cy + (outerRadius + 12) * sin(mid)`.
   - `textAnchor = lx >= cx ? 'start' : 'end'`.
   - Sem cotovelo, sem `<polyline>`, sem coluna fixa nas bordas.

2. **Remover margens laterais grandes do `<PieChart>`**
   - Voltar para `margin={{ top: 8, right: 24, bottom: 8, left: 24 }}` no modo `rich`.
   - Manter `outerRadius` em 88 (donut: innerRadius 54).

3. **Anti-colisão vertical leve, por lado**
   - Continuar separando em `left` / `right` e aplicar `resolveCollisions` só no Y (mantém X radial calculado).
   - `minGap = blockH + 4` (mais compacto que o atual `+6/+10`).
   - Após resolver Y, **não** travar X: cada label permanece à direita/esquerda da própria fatia.

4. **Sempre mostrar nome + valor/%**
   - Manter `formatRichLabel` (linha 1 = nome em `foreground` bold; linha 2 = valor + % em `muted-foreground`).
   - Sem ocultar nada para fatias pequenas — o ajuste vertical já resolve.

5. **Fonte adaptativa**
   - Manter `layerFs = data.length > 6 ? max(9, fs-1) : fs`.

### Sem mudanças

- Tooltip, legenda, paleta, drill, donut center label.
- Outros gráficos (Bar/Line/Area/Treemap).
- `visualConfig`, persistência, backend.

### Arquivos afetados

- `src/components/bi/charts/PieChartCard.tsx` (único).

### Resultado esperado

Layout idêntico ao exemplo "Por Motivo de Viagem": rótulos colados na borda de cada fatia, sem linhas-guia, e quando duas fatias pequenas caem no mesmo ângulo, uma desliza verticalmente apenas o necessário para não sobrepor a outra.
