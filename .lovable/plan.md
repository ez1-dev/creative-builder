## Ajustar TreemapChartCard para mostrar mais informação

O treemap hoje só mostra o nome do estado e desperdiça muito espaço (caixas grandes ficam quase vazias e caixas pequenas não mostram nada).

### Mudanças em `src/components/bi/charts/TreemapChartCard.tsx`

1. **Label com nome + valor + %** dentro de cada célula:
   - Linha 1: nome (estado), truncado se a caixa for estreita.
   - Linha 2: valor formatado de forma compacta (`R$ 1,2M`, `R$ 340k`).
   - Linha 3: percentual do total (`28,4%`), só quando a caixa comporta.

2. **Escala adaptativa**:
   - Tamanho da fonte cresce com a área da célula (clamp entre ~10px e ~22px).
   - Esconde a linha de % se altura < ~36px; esconde o valor se altura < ~22px; esconde o nome se largura < ~36px (fallback: nada, evitando overflow).
   - Trunca o nome com base na largura disponível (sem ultrapassar o retângulo).

3. **Contraste**: cor do texto (`white` vs `foreground`) escolhida a partir da luminância da cor da célula, garantindo leitura em todo `BI_PALETTE`.

4. **Tooltip**: mantém o `valueFormatter` completo (R$ por extenso) e acrescenta a participação % no total.

5. **Helper local** `formatCompactCurrency(v)` (R$ 1,2 mi / 340 mil / 12,3 k) — sem nova dependência.

Sem mudanças em consumidores nem em backend.
