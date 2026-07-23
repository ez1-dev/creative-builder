## Objetivo

Corrigir três defeitos do **Dashboard Geral** apontados na revisão de 23/07/2026, todos no frontend:

1. **Headcount** mostra 1.000 (cap de paginação) — deve ser 404 (KPI do endpoint de dashboard de RH).
2. **% de crescimento do Faturamento** compara bases diferentes (mês corrente vs YTD anterior) → 443,8%.
3. **Gráficos "Compras — 12 meses" e "Turnover — 12 meses"** vazios/zerados quando o período selecionado é curto (mês atual/anterior).

Itens 2/5 do prompt (Resultado DRE, Ativo Total, cards corretos) já estão OK após restart do backend — nenhuma mudança no front nesse turno.

## Escopo

### 1. Headcount pelo KPI oficial
Arquivo: `src/hooks/dashboardGeral/useRh.ts`
- Remover a leitura via `fetchQuadroColaboradores()` (lista paginada em 1000).
- Adicionar `fetchQuadroDashboard(dataRef)` (já existe em `src/lib/rh/quadroDashboardApi.ts`) com `data_ref = último dia do mês final do range` (YYYY-MM-DD).
- `kpis.headcount` passa a vir de `dash.kpis.total` (fallback: `colaboradores` / `total_colaboradores` já cobertos pelo normalizador).
- Manter `fetchQuadroColaboradores()` **apenas** para o breakdown por `setor` (a lista bruta é a única fonte disso hoje); se `quadro.length >= 1000` (cap), exibir um aviso silencioso no console — sem afetar KPIs.
- Series (`headcount`, `turnover_mes`) e demais KPIs continuam vindo do endpoint de turnover, sem alteração.

### 2. % de crescimento do Faturamento com bases equivalentes
Arquivo: `src/hooks/dashboardGeral/useComercial.ts` + helper novo em `src/lib/dashboardGeral/aggregator.ts`
- Adicionar helper `rangeAnteriorEquivalente(range, periodo)`:
  - `mes_atual` → mês anterior (mesmo tamanho: 1 mês)
  - `mes_anterior` → 2 meses atrás
  - `ytd` → **YTD do ano anterior** (Jan/anoAnterior → mesmo mês do ano anterior)
  - `ult_12m` → 12 meses anteriores aos 12 exibidos
- Substituir a segunda query (`rangeAnt = rangeFor('mes_anterior')` fixo) por `rangeAnteriorEquivalente(range, periodo)` — assim `delta_pct` sempre compara janelas do mesmo tamanho.
- Sem mudança visual no card além do valor do %.

### 3. Séries "Compras 12m" e "Turnover 12m" sempre com 12 pontos
Os endpoints devolvem `por_mes` apenas dentro do range solicitado. Quando o card está em "mês atual", `por_mes` traz 1 ponto.

- `src/hooks/dashboardGeral/useCompras.ts`: adicionar **segunda query** com range fixo de últimos 12 meses (`rangeFor('ult_12m')`) só para popular `series.compras_mes`. KPIs continuam usando o range do card.
- `src/hooks/dashboardGeral/useRh.ts`: adicionar **query extra** de turnover com `rangeFor('ult_12m')` para alimentar `series.headcount` e `series.turnover_mes`. KPIs seguem o range do card.
- Ajustar rótulos dos gráficos correspondentes na tela (`src/pages/DashboardGeralPage.tsx` — só o texto do subtítulo se necessário; título "12 meses" fica coerente).

## Fora de escopo
- Contabilidade (item 2 do prompt): backend já corrigido; frontend hoje usa `getBalancoPatrimonial` + `fetchDreRealizadoResumo` (não `resultado-pronto`), portanto sem mudança.
- Turnover mensal vs acumulado (item 5): valor está correto.
- Novos filtros, novo layout, novos endpoints.

## Detalhes técnicos

- `dataRef` = último dia do mês `range.fim` (converter via `anomesToDate(range.fim, true)` já disponível em `shared.ts`).
- `rangeAnteriorEquivalente('ytd', ref)` = `{ ini: (anoRef-1)01, fim: (anoRef-1)mesRef }`.
- Todas as queries novas herdam o mesmo `staleTime`/`gcTime`/`retry: 0`/`keepPreviousData` das demais.
- Chaves de cache incluem o range para não colidir com a query dos KPIs.
