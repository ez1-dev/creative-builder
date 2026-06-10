Ajustar `RichLabelsLayer` em `src/components/bi/charts/PieChartCard.tsx` para reproduzir o estilo da imagem de referência:

1. **Linha-guia neutra e fina** — voltar `stroke` para `hsl(var(--muted-foreground))`, `strokeWidth={1}`, `opacity={0.5}`. Sem cor da fatia na linha.
2. **Remover a bolinha de ancoragem** (`<circle>`) — o modelo de referência não tem dot.
3. **Nome da série em foreground (preto/branco do tema)** — `line1` volta a usar `fill="hsl(var(--foreground))"` com `fontWeight: 600`. Sem cor da fatia no texto.
4. **Valor + percentual em muted** — `line2` permanece em `hsl(var(--muted-foreground))`, mesmo tamanho de fonte do nome.
5. Manter: cotovelo de 3 segmentos, resolução de colisões (gap maior), clamp de fonte para >6 itens, truncamento de nomes longos (`TRANSFERENCIA DE ...`) — já presentes via `formatRichLabel`.

Sem mudanças em tooltip, legenda, drill, ou outros tipos de gráfico. Afeta todos os pies/donuts que usam `richLabel` (BI Comercial, Frota, Máquinas, Passagens etc.).
