## Refinar gauge "% Atingimento" no estilo Upquery

Reescrever `src/components/bi/charts/GaugeAchievementCard.tsx` mantendo a mesma API (props `title`, `value`, `max`, `className`) e o atributo `data-widget-value`.

### Mudanças visuais
- Substituir o gauge atual (Recharts Pie em 4 segmentos colados) por um SVG próprio com 4 segmentos (vermelho → laranja → amarelo → verde) separados por **pequenos gaps** entre eles — visual mais limpo e moderno, igual ao padrão Upquery.
- **Ponteiro corrigido**: agora termina exatamente na borda interna do arco (não passa por baixo nem fica desproporcional). Atualmente, com valores baixos como 6,06%, o ponteiro saía quase horizontal e parecia "quebrado".
- **Pivô central refinado**: círculo cheio escuro com um pontinho claro no meio (estilo relógio analógico).
- Proporções ajustadas (arco mais cheio, melhor uso do espaço do card).
- Transição suave do ponteiro ao mudar o valor.

### O que NÃO muda
- API do componente é preservada — qualquer página que já usa `<GaugeAchievementCard>` continua funcionando sem alteração.
- Escala 0 → `max` (default 120%) mantida.
- Tipografia do valor abaixo do arco mantida (com classes responsivas `3xl:` / `4xl:` para TV mode).
- Cores semânticas (vermelho/laranja/amarelo/verde) preservadas.

### Arquivos
- **Editar (rewrite):** `src/components/bi/charts/GaugeAchievementCard.tsx`

Nenhum outro arquivo é tocado e nenhuma página precisa de ajuste.
