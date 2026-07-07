## Rótulo de valor no topo de cada barra — "Evolução Mensal"

Adicionar `<LabelList>` acima das barras do gráfico `chart-evolucao-mensal` em `src/components/passagens/PassagensDashboard.tsx` (dentro do `<Bar>` das linhas 1167–1179), exibindo o valor formatado em `R$` compacto (ex.: "R$ 231k") acima de cada barra.

Detalhes:
- `position="top"`, `fontSize={11}`, `fill="hsl(var(--foreground))"`.
- Formatter: `(v) => v >= 1000 ? \`R$ ${(v/1000).toFixed(0)}k\` : formatCurrency(v)`.
- Aumentar o `height` do `ResponsiveContainer` levemente (ex.: 240/280) para o rótulo não cortar; ou adicionar `margin={{ top: 16 }}` ao `<BarChart>`.

Sem outras alterações. Nenhum outro gráfico afetado.

### Validação
Abrir `/passagens-aereas`: cada barra mensal mostra o valor no topo, sem cortar e sem sobrepor o eixo Y.
