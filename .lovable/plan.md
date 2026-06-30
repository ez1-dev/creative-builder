## Problema

A tela está agregando KPIs client-side a partir de `/api/rh/resumo-folha`, e os totais não batem com o acumulado oficial Jan–Jun/2026:

| Métrica | Esperado (acumulado) |
|---|---|
| Provento | R$ 15.009.216,13 |
| Desconto | R$ 7.777.378,54 |
| Total Líquido | R$ 7.231.837,59 |

O backend já expõe os dois recortes via parâmetro `modo`:

- `GET /api/rh/resumo-folha/dashboard?anomes_ini=YYYYMM&anomes_fim=YYYYMM&modo=acumulado` → KPIs/tabelas para os cards.
- `GET /api/rh/resumo-folha/dashboard?...&modo=mensal` → série para gráfico/tabela mensal.

## Mudanças

### 1. `src/lib/rh/api.ts`
- Adicionar tipo `ResumoFolhaModo = "acumulado" | "mensal"`.
- Alterar `fetchResumoFolhaDashboard(p, modo)` para aceitar `modo` e enviá-lo na query string. Default `"acumulado"`.
- Remover (ou marcar como obsoleto) `fetchResumoFolhaConsolidado` e os helpers `aggregateKpisFromLinhas` / `buildProventosFromLinhas` etc — não usar mais agregação client-side para a tela (mantém apenas funções de baixo nível caso outras telas usem; verificar imports).
- Manter `DashboardIndisponivelError` para erros 404/405/501.

### 2. `src/pages/rh/ResumoFolhaPage.tsx`
- Disparar **duas queries** em paralelo via React Query:
  1. `["rh","resumo-folha-dashboard","acumulado",params]` → `fetchResumoFolhaDashboard(params, "acumulado")` — alimenta KPIs, tabelas Proventos/Descontos, Filial e Tipos de Evento.
  2. `["rh","resumo-folha-dashboard","mensal",params]` → `fetchResumoFolhaDashboard(params, "mensal")` — alimenta os gráficos "Custo Hora Extra" e "Custo Mensal".
- Restaurar o tratamento de `DashboardIndisponivelError` (banner amarelo).
- Filtros (período, filial, matrícula) continuam controlando ambas as chamadas.
- Loading independente por bloco (cards x gráficos mensais).

### 3. `docs/backend-rh-resumo-folha-dashboard.md`
- Documentar parâmetro `modo=acumulado|mensal` (default `acumulado`).
- Esclarecer que `modo=acumulado` retorna `kpis`, `proventos_vantagens`, `descontos`, `filiais`, `tipos_evento` com totais do período inteiro; `modo=mensal` retorna a estrutura `mensal[]` com `competencia`, `custo_hora_extra`, `custo_mensal` (e opcionalmente os mesmos blocos quebrados por competência).

## Validação

Abrir `/rh/resumo-folha` com Jan/2026 → Jun/2026 e conferir nos cards:

- Provento = `15.009.216,13`
- Desconto = `7.777.378,54`
- Total Líquido = `7.231.837,59`

Conferir no gráfico "Custo Mensal" 6 barras (jan→jun) e no console o log `[RH ResumoFolha] dashboard` com `modo: "acumulado"` e `modo: "mensal"`.
