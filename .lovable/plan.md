## Problema

Os gráficos adicionados/trocados pela biblioteca BI (ex.: "Top Destinos por Valor" agora usando `ranking-chart`) **não disparam o cross-filter** da página. Os gráficos canônicos (Evolução Mensal, Motivo, Top UF nativo, etc.) já filtram a página inteira no clique porque estão cabeados diretamente nos `setSelected...`. Já os componentes vindos do `componentRegistry` apenas exibem dados — o clique não chega ao estado de filtros da página.

## Causa

Em `src/lib/bi/componentRegistry.tsx`, os `render(...)` de `ranking-chart`, `bar-chart`, `horizontal-bar-chart`, `pie-chart` etc. **não recebem nem encaminham** `onItemClick`. O contexto passado em `PassagensDashboard` (`ctx: { kpis, series, rows }`) também não inclui um handler de clique. Resultado: o item clicado não vira filtro.

## Plano

1. **Estender o contexto de render do registry**
   - Adicionar campo opcional `onItemClick?: (seriesKey: string, datum: { name: string; value: number }) => void` no tipo de `ctx` (ou nas props de `render`).
   - Cada chart do registry passa `onItemClick={(d) => ctx.onItemClick?.(mapping.series, d)}` para o componente subjacente (`RankingChartCard`, `BarChartCard`, `HorizontalBarChartCard`, `PieChartCard`, `DonutChartCard`).

2. **Mapear seriesKey → cross-filter no `PassagensDashboard`**
   - No bloco que renderiza widgets com `componentId` (linhas ~1646), passar um `onItemClick` que faz roteamento:
     - `evolucao_mensal` → toggle em `selectedMes`
     - `por_motivo` → toggle em `selectedMotivo`
     - `top_cidades_qtd` / `top_cidades_valor` / `top_destinos_valor` → toggle em `selectedDestino`
     - `top_uf_qtd` / `top_uf_valor` → toggle em `selectedUF` (uppercase)
     - `top_cc` (se aplicável) → toggle em `selectedCC`
   - Reusar o helper `toggleItem` já existente.

3. **Feedback visual mínimo**
   - Manter o cursor pointer já presente nos componentes.
   - Os badges de cross-filter no topo da página já mostram a seleção ativa, então o usuário enxerga o impacto no clique.

4. **Validação**
   - Em `/passagens-aereas`: clicar em uma UF no Ranking "Top Destinos por Valor" deve filtrar KPIs, demais gráficos e a tabela.
   - Clicar de novo no mesmo item deve remover o filtro.
   - Repetir o teste trocando o tipo do bloco (barras horizontais, barras, pizza) via "Configurar gráfico".

## Detalhes técnicos

Arquivos afetados:
- `src/lib/bi/componentRegistry.tsx` — aceitar e propagar `onItemClick` em chart-likes.
- `src/components/passagens/PassagensDashboard.tsx` — passar `onItemClick` no `ctx` do `def.render(...)` e fazer o roteamento por `seriesKey`.

Sem mudanças de schema, sem migrações — alteração puramente de frontend/presentation.