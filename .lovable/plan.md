# Corrigir alinhamento dos rótulos com as fatias da pizza

## Problema
Os rótulos das fatias pequenas (TRATOR, CARREGADEIRA, EMPILHADEIRA, PASSEIO no "Por Tipo de Veículo") aparecem todos empilhados no topo do gráfico, longe das suas fatias reais. O motivo: depois da anti-colisão, o texto desliza no eixo Y mas continua sem nenhuma linha-guia ligando-o à fatia — então o usuário não consegue mapear o rótulo no resultado.

## Solução
No `RichLabelsLayer` de `src/components/bi/charts/PieChartCard.tsx`:

1. **Manter a âncora da fatia separada da posição do texto**
   - `anchorX/anchorY` = ponto na borda externa da fatia (raio = `outerRadius`).
   - `labelX/labelY` = posição do texto (raio = `outerRadius + 14`), partindo do mesmo ângulo.
   - Hoje os dois pontos coincidem, perdendo a referência da fatia após a anti-colisão.

2. **Desenhar leader line curta apenas quando o rótulo foi deslocado**
   - Após `resolveCollisions`, comparar `it.y` com `it.targetY` original.
   - Se `|it.y - it.targetY| > 2px`: desenhar `<polyline>` com 3 pontos:
     - ponto 1: borda da fatia (`anchorX`, `anchorY`)
     - ponto 2: cotovelo no raio do label (`labelX`, `targetY`)
     - ponto 3: início do texto (`labelX ± 4`, `y`)
   - Cor: `currentColor` da fatia com opacidade 0.5, `strokeWidth=1`, sem fill.
   - Se não foi deslocado, nada é desenhado (visual igual ao exemplo limpo).

3. **Pequeno offset horizontal do texto quando há linha**
   - Right side: `textX = labelX + 6`
   - Left side: `textX = labelX - 6`
   - Só quando a linha é desenhada; quando não há linha, mantém `textX = labelX` (visual atual).

4. **Anti-colisão inalterada** — `minGap = blockH + 4`, somente Y, lados separados.

5. **Nada muda** em: paleta, formatação `formatRichLabel`, fonte, donut, margens do `PieChart`, modo simples (`rich = false`).

## Arquivos
- `src/components/bi/charts/PieChartCard.tsx` (único)

## Resultado esperado
- Fatias grandes: rótulo encosta na fatia, sem linha (igual exemplo "Por Motivo de Viagem").
- Fatias pequenas vizinhas: rótulos se separam verticalmente e cada um ganha uma linha-guia curta apontando para a sua fatia, eliminando a ambiguidade da imagem atual.
