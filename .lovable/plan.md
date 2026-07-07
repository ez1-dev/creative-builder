## Rótulo de valor como opção do gráfico "Evolução Mensal"

### Diagnóstico
- O render nativo do bloco `chart-evolucao-mensal` já ganhou `<LabelList>`, mas ele só é exibido quando o bloco NÃO está sobrescrito (`componentId` do widget nulo). Se o usuário configurou o gráfico pelo diálogo (mesmo só mudando título/série), o render passa para o `COMPONENT_REGISTRY` (BI `BarChartCard`), que respeita `options.visual.dataLabels.visible` — hoje `false` por padrão. Por isso o rótulo "ainda não aparece".
- O `ConfigureChartDialog` já expõe `VisualConfigEditor`, que tem o switch "Mostrar rótulos de dados" — só faltava um atalho e a opção no render nativo.

### Alterações em `src/components/passagens/PassagensDashboard.tsx`

1. Localizar o widget correspondente no render nativo do bloco `chart-evolucao-mensal`:
   ```ts
   const wEvo = effectiveWidgets.find((w) => w.type === 'chart-evolucao-mensal');
   const showLabelsEvo = wEvo?.options?.visual?.dataLabels?.visible !== false; // default: true
   ```
2. Renderizar `<LabelList>` no `<Bar>` apenas quando `showLabelsEvo` for true. Mantém `position="top"`, formatador compacto (R$ …k) e cor `hsl(var(--foreground))`.
3. Nada mudar quando o widget estiver com `componentId` override — nesse caminho o `BarChartCard` já lê `dataLabels.visible` via `VisualConfig`. Para tornar a experiência coerente, no diálogo `ConfigureChartDialog` acrescentar acima do `VisualConfigEditor` um atalho visível:
   - `Switch` "Mostrar valor em cima das barras" que sincroniza com `visual.dataLabels.visible` (bidirecional). Isso não substitui o editor completo — só evita o usuário ter que rolar até ele.

### Fora de escopo
- Outros gráficos (motivo, produto, CC, cidades, UF): mantêm o comportamento atual.
- Não mexer em `VisualConfigEditor`, `BarChartCard`, ou defaults globais do `dataLabels`.

### Validação
- Bloco nativo (sem override): rótulos aparecem por padrão; ao abrir "Configurar" e desmarcar "Mostrar rótulos de dados" → some.
- Bloco com override (BI): mesma opção pelo atalho ou pelo editor mostra/oculta o rótulo.
