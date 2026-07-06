## Melhorias no PieChartCard (donut/pie compartilhado)

Alterar apenas `src/components/bi/charts/PieChartCard.tsx`. Não muda API pública nem quebra chamadas existentes.

### 1. Total automático no centro (modo donut)
Hoje o centro só aparece se o chamador passar `centerLabel` / `centerValue`. Passa a mostrar automaticamente quando `donut` é true e nenhum deles foi informado:
- valor: `total` formatado com `Intl.NumberFormat('pt-BR')`
- rótulo: "Total"

Se o chamador passar `centerLabel`/`centerValue`, mantém o comportamento atual (override).

### 2. Legenda com valor e %
`legendFormatter` passa a receber o `entry` do recharts e renderiza `"Label · 114 (80%)"` (truncando só o label). Se `total = 0`, oculta a parte "(%)".

### 3. % + valor absoluto dentro das fatias grandes
No layer compacto (modo interno), além do "80,0%" atual, adicionar uma segunda linha com o valor absoluto formatado (`fmt(v)`), quando a fatia for ≥ `MIN_INSIDE_LABEL_PERCENT` (6%). Fica:
```
80,0%
114
```
Texto branco com stroke escuro (paint-order) — igual ao atual. Sem mudar o modo "rich/externo" que já tem leader-lines.

### 4. Cores alinhadas ao design system
Nada a mudar em código: `BI_PALETTE` já usa tokens semânticos (`hsl(var(--chart-*))`). Apenas confirmar visualmente. Se após a mudança o contraste em donut de 2 fatias parecer fraco, ajusto a ordem para pegar `--chart-1` e `--chart-3` (mais distintos) na próxima iteração — não incluído neste plano.

### Impacto colateral
- Todas as telas que usam `DonutChartCard`/`PieChartCard` ganham legenda enriquecida e (em donut sem centro custom) total no centro.
- Nenhum breaking change de props.

### Fora de escopo
- Não mexer em `QuadroColaboradoresPage` (só consome o componente).
- Não alterar animações, altura padrão, layout do shell.
- Não trocar paleta.
