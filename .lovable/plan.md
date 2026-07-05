## Remover R$ dos gráficos do Quadro de Colaboradores

### Causa

`BarChartCard` e `AreaChartCard` (biblioteca `@/components/bi`) hardcodam `tickFormatter={tickCurrencyAbbrev}` no `<YAxis>`, então os ticks do eixo Y sempre saem em R$ mesmo quando a página passa `valueFormatter` numérico. Isso afeta os gráficos de Sexo/Situação/Vínculo/Escolaridade/Faixa etária/Tempo de casa e o histórico "Nº Colaboradores".

### Alterações

**`src/components/bi/charts/BarChartCard.tsx`**
- Adicionar prop opcional `tickFormatter?: (v: number) => string` (default: `tickCurrencyAbbrev` — mantém comportamento atual em outras páginas).
- Usar `tickFormatter` no `<YAxis tickFormatter={...} />`.

**`src/components/bi/charts/AreaChartCard.tsx`**
- Mesmo tratamento: novo prop `tickFormatter?: (v: number) => string` com default `tickCurrencyAbbrev`, usado no `<YAxis>`.

**`src/pages/rh/QuadroColaboradoresPage.tsx`**
- `BreakdownCard`: passar `tickFormatter={fmt}` também para o `<BarChartCard>` (usa `Intl.NumberFormat("pt-BR")`).
- Histórico `<AreaChartCard>`: passar `tickFormatter` idêntico ao `valueFormatter` já usado (número pt-BR abreviado ou completo — usar helper `tickNumberAbbrev` local: `1.2 mil`, `3,4 mi`, sem R$).

### Fora de escopo

- Alterar `tickCurrencyAbbrev` em si (usado corretamente por BI Comercial/DRE onde é dinheiro).
- Outros chart cards (Line/Combo/Stacked/Horizontal/Waterfall) — não são usados na tela de RH.
- KPIs de topo e grid Empresa (já usam formatação numérica).

### Validação

Recarregar `/rh/quadro-colaboradores`: eixo Y de todos os gráficos e do histórico deixa de mostrar "R$" e passa a mostrar valores inteiros/abreviados em pt-BR.
