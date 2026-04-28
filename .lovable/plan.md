## Objetivo

Adicionar uma seção de **Gráficos & Dashboards** abaixo dos KPIs no Relatório Semanal Obra, reagindo aos mesmos filtros e usando todos os registros consolidados (não apenas a página atual).

## Gráficos Propostos

1. **Top 10 Obras por Peso (kg)** — barras horizontais. Ranking das obras com maior peso produzido no período.
2. **Top 10 Obras por Quantidade de Peças** — barras horizontais. Identifica obras com maior volume de peças.
3. **Distribuição de Cargas por Obra** — gráfico de barras (Top 10) mostrando quantidade de cargas por obra.
4. **Evolução Semanal (linha)** — agrupando pela `data_inicial` (semana), exibe peso, peças e cargas ao longo do tempo. Permite ver tendência da produção.
5. **Peso médio por Carga (Top 10 obras)** — barras com peso/carga, indicador de eficiência logística.
6. **Resumo por Cliente** (donut/pizza Top 8 + “Outros”) — participação de cada cliente no peso total.

Layout: grid responsivo `2 colunas em desktop, 1 em mobile`, cada card com título e altura fixa (~280px). Cores derivadas do design system (tokens semânticos azuis), sem cores hardcoded.

## Comportamento

- Os gráficos consomem o **mesmo dataset consolidado** já agregado pelo fluxo `consolidateKpis` (todas as páginas). Vamos estender esse fluxo para também acumular as linhas brutas em um estado `consolidatedRows: RelatorioRow[]`, alimentando os charts.
- Enquanto a consolidação roda, exibir skeleton "Calculando gráficos..." nos cards.
- Ao limpar filtros, zerar `consolidatedRows`.
- Os gráficos só aparecem após uma busca bem-sucedida (mesma regra dos KPIs).
- Cross-filter simples: clicar em uma barra de obra/cliente preenche o filtro `obra` e dispara nova busca (drill-down leve).

## Detalhes Técnicos

**Arquivo único editado:** `src/pages/producao/RelatorioSemanalObraPage.tsx`

- Biblioteca: `recharts` (já usada no projeto em outros dashboards de produção/compras).
- Novo estado: `const [consolidatedRows, setConsolidatedRows] = useState<RelatorioRow[]>([])`.
- Em `consolidateKpis`, além de agregar Sets/contadores, acumular as linhas (`agg.rows.push(...r.dados)`) e setar `setConsolidatedRows` ao final. Quando `resumo` vier do backend, usar apenas `firstResult.dados` como base (gráficos exibem aviso "amostra parcial" se `total_paginas > 1` e backend já entregou resumo — para evitar duplicar fetches).
- Helpers de agregação para charts:
  - `topByMetric(rows, keyFn, metricFn, n=10)` — ordena e retorna top N.
  - `groupByWeek(rows)` — usa `data_inicial` truncada à segunda-feira da semana, soma peso/peças/cargas.
  - `clientShare(rows)` — soma peso por cliente, top 8 + "Outros".
- Componentes recharts: `BarChart` (horizontal via `layout="vertical"`), `LineChart`, `PieChart` com `ResponsiveContainer`.
- Tooltips formatados com `formatNumber`.
- Cores via CSS vars do tema (`hsl(var(--primary))`, `hsl(var(--chart-1..5))`).
- Cross-filter: handler `onClick` da barra → `setFilters(f => ({...f, obra: nomeObra})); search(1);`.

## Fora de Escopo

- Alterações no backend (FastAPI) — usaremos apenas dados já retornados pelo endpoint atual.
- Persistência de configuração de dashboard pelo usuário.
- Exportação dos gráficos como imagem.
