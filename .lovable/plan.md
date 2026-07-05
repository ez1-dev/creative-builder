# Melhorias nos gráficos do Painel de Compras

Duas frentes independentes na mesma tela (`src/pages/PainelComprasPage.tsx`), sem mexer em lógica de filtros, KPIs ou drill.

## 1) Refino visual (todas as seções "Análises Gráficas" e "Análise Gerencial")

Padronizar a aparência com tokens do design system e componentes da Biblioteca BI (`@/components/bi`), que já cuidam de responsividade, cores e formatação.

**Aplicações:**

- **Wrapper único**: cada gráfico passa a usar `ChartCardShell` (padroniza título, subtítulo, borda, padding, empty/loading states) em vez do `<div className="rounded-md border bg-card p-4">` solto.
- **Cores**: trocar `hsl(215,70%,45%)`, `hsl(142,70%,40%)`, `hsl(280,60%,50%)`, `fill="hsl(280,60%,50%)"` etc. por tokens semânticos (`hsl(var(--primary))`, `hsl(var(--chart-1..5))`). Zero cor hardcoded.
- **Rótulos de valor**: mostrar valor em cima/lado das barras usando `<LabelList>` com formatação abreviada (`R$ 1,2M` / `R$ 250k` via helper `formatCompactCurrency`).
- **Eixos**: fonte legível (`text-xs text-muted-foreground`), tick lines discretos, gridlines só no eixo de valor com `strokeDasharray="3 3"` e cor `hsl(var(--border))`.
- **Nomes longos** (Top Fornecedores, Famílias, Origens): truncar com "…" no eixo e mostrar nome completo no tooltip; aumentar `width` do YAxis para caber os principais, com scroll interno quando > 10 itens.
- **Tooltip**: usar `ChartTooltipContent` da BI (cursor de fundo `hsl(var(--muted))`, valores formatados em moeda BR, categoria em negrito).
- **Legenda**: reposicionar para o topo direito com bullets pequenos; esconder quando só há uma série.
- **Ordenação/limite**: Top-N=10 explícito nos rankings, resto agrupado em "Outros" nos donuts quando > 6 fatias.
- **Grid do dashboard**: ajustar de `lg:grid-cols-2 xl:grid-cols-3` para uma organização mais respirada; gráficos de ranking horizontais ganham `col-span-2` em telas grandes.
- **Trocas de tipo pontuais** (mantendo os dados):
  - Top Fornecedores → `HorizontalBarChartCard` (barra horizontal já é o formato natural).
  - Situação das OCs e Produtos × Serviços → `DonutChartCard` com total no centro.
  - Entregas por Mês → `AreaChartCard` (tendência) em vez de barras esparsas.
  - Top Famílias / Top Origens → `RankingChartCard` (barras + posição + participação %).
  - Compras por Mês → `LineChartCard` com marcadores.
  - Top 10 Centros / Top 10 Projetos → `HorizontalBarChartCard` com `LabelList`.

## 2) Corrigir "Análise Gerencial" zerada (Compras por Mês / Centros de Custo / Projetos)

Sintoma: rótulos aparecem como "———" e todas as barras marcam `R$ 0k`. As séries são construídas em `gerencialCharts` (linhas 562–592) a partir de `dashboard.graficos.por_mes | por_centro_custo | por_projeto`.

**Diagnóstico a executar (sem mudar backend):**

1. Logar no console a resposta crua do endpoint agregado (`dashboard.graficos.por_mes[0]`, `por_centro_custo[0]`, `por_projeto[0]`) para confirmar quais chaves o backend está devolvendo.
2. Comparar com o esperado em `docs/backend-painel-compras-dashboard.md` (`mes`, `centro_custo`, `numero_projeto`+`projeto`, todos com `valor`).

**Correções previstas no frontend (mesmo se o backend mudar depois):**

- Aceitar aliases comuns de campo de valor: `valor` **ou** `valor_liquido` **ou** `valor_comprado` **ou** `total`.
- Aceitar aliases de label: `mes|competencia|mes_competencia`, `centro_custo|centro|nome_centro`, `projeto|nome_projeto|numero_projeto`.
- Se após o parsing tudo ainda vier 0, cair no fallback client-side já existente (`agg()` sobre `dadosFiltrados`) — hoje esse fallback só roda quando `gerencialActive` é true; passar a rodar também quando o backend devolveu a estrutura mas com valores todos zerados.
- Ordenar `porMes` cronologicamente aceitando `YYYY-MM` ou `MM/YYYY`.
- Formatar labels vazias/`null` como "Sem informação" em vez de "———".

Se após o diagnóstico ficar claro que o backend não está agregando esses três buckets (bug servidor), gero um `docs/backend-painel-compras-dashboard-fix.md` curto descrevendo o que precisa ser retornado — sem editar o FastAPI daqui.

## Fora de escopo

- Endpoints, cálculos de KPI, filtros globais, drill navigation.
- "Biblioteca BI" / widgets do usuário / toggle "Editar dashboard" (já implementados numa entrega anterior).
- Aba Drill e aba Lista Detalhada.

## Arquivos

- `src/pages/PainelComprasPage.tsx` — refactor visual das seções de gráficos + parsing tolerante das séries gerenciais.
- (possível) `src/lib/format.ts` — adicionar `formatCompactCurrency` se ainda não existir.
- (condicional) `docs/backend-painel-compras-dashboard-fix.md` — só se o diagnóstico apontar bug de servidor.
