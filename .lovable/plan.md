## Objetivo
Deixar todos os gráficos de pizza/rosca exatamente como o exemplo "Por Motivo de Viagem" anexado: rótulos limpos (NOME em cima, R$ valor (%) embaixo), encostados na fatia, **sem linhas-guia** e sem deslocamentos visíveis. Aplicar no componente único — não criar novos gráficos.

## Mudanças
Arquivo único: `src/components/bi/charts/PieChartCard.tsx` → `RichLabelsLayer`.

1. **Remover leader lines** — apagar o `<polyline>` e toda a lógica de `displaced`/`anchorX`/`anchorY`/`elbowX`/`elbowY`/offset horizontal do texto. O texto fica sempre em `labelX` puro (igual ao exemplo).

2. **Anti-colisão suave (mantida, porém invisível)** — continua deslocando Y para não sobrepor, mas sem desenhar linha. Para reduzir deslocamentos perceptíveis em fatias muito pequenas:
   - Aumentar `labelR` para `outerRadius + 18` (mais respiro).
   - `minGap = blockH + 2` (gap mínimo justo).
   - Reduzir `outerRadius` para `82` quando `rich` (sobra mais espaço lateral para os rótulos).

3. **textAnchor** continua `start` (direita) / `end` (esquerda), baseado em `labelX >= cx`.

4. **Nada muda** em: paleta, `formatRichLabel` (NOME negrito + valor/% muted), fonte, donut, tooltip, legend, modo simples (`rich=false`), `PieChart` margins.

## Resultado esperado
- Visual idêntico ao print enviado em qualquer pizza/rosca BI.
- Fatias pequenas vizinhas continuam separadas verticalmente pela anti-colisão, mas sem linhas — exatamente como o exemplo "FÉRIAS / VIAGEM ADMINISTRA... / DEMISSÃO" do print.
- Nenhum gráfico novo é criado; apenas o componente compartilhado é ajustado.

## Arquivos
- `src/components/bi/charts/PieChartCard.tsx` (único)
