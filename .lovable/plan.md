
## Objetivo

Fazer com que cada card do Dashboard Geral **sempre apareça** — mesmo quando a API devolve zero, campo ausente ou payload parcial — sem que um bloco vazio "sequestre" a informação dos vizinhos ou esconda o resto do painel.

## Diagnóstico

1. **Gráficos somem por completo** — `HorizontalBarChartCard`, `BarChartCard`, `LineChartCard`, `DonutChartCard` renderizam `NoDataState` em altura cheia (ex. 300px) quando `data.length === 0`, deixando um bloco vazio grande que domina a aba.
2. **Séries com todos os valores zero** ainda renderizam o card, mas eixos ficam sem escala útil — melhor exibir microcopy "Sem movimento no período" e manter o card compacto.
3. **Filtros ocultam dados legítimos**:
   - `useComercial` remove `OUTROS` e `LANCTO MANUAL` das revendas — se o backend só tiver esses, a lista fica vazia.
   - `useCompras.situacao` só faz `push` quando > 0 — quando tudo está no prazo, some inteiro.
4. **KPIs sem tolerância a `undefined`**:
   - Divisões `faturamento / notas`, `abaixo / total`, `desconto / (fat+desc)` podem dar `NaN` quando denominador = 0 (o `num()` protege parte, mas `NaN` chega ao `KpiCard`).
   - `data.kpis.faturamento_delta` em `VisaoGeralTab` é multiplicado por 100 mesmo já vindo em %.
5. **Contabilidade `dre_top`**: valores negativos em `HorizontalBarChartCard` viram barras invertidas confusas — usar `Math.abs` para grandeza + sinal por cor semântica ou usar `WaterfallChartCard`/tabela.
6. **VisãoGeral**: quando um hook secundário (fin/cont/est/prod) falha, o KPI mostra 0 sem indicar erro; hoje não há tooltip nem badge de status.

## Escopo — SEM mexer em endpoints/cálculos de negócio

### 1. Nova camada visual: "empty inline"

- **Adicionar** `src/components/bi/states/InlineEmpty.tsx` — placeholder compacto (altura fixa ~80px, ícone pequeno + texto sutil) para uso quando a série está vazia mas o card deve permanecer visível.
- **Ajustar** `ChartCardShell.tsx`: aceitar prop opcional `emptyVariant?: 'full' | 'inline'` (default `full` — compat). Quando `inline`, renderiza `InlineEmpty` no lugar do `NoDataState` sem reservar toda a altura, e ainda expõe título/subtítulo para o usuário entender o quê está vazio.
- **Repassar** `emptyVariant="inline"` em todos os charts do Dashboard Geral (tabs), mantendo os demais dashboards intactos.

### 2. KPIs resilientes

- **Criar helper** `safeDiv(a, b)` em `src/hooks/dashboardGeral/shared.ts` retornando 0 quando `b === 0 || !Number.isFinite(a/b)`. Trocar todas as divisões que hoje podem produzir `NaN`/`Infinity` nos 8 hooks.
- **KpiCard**: aceitar valor `NaN` e renderizar `—` (traço) em vez de "R$ NaN". Ajuste dentro do próprio `KpiCard.tsx` (fallback via `Number.isFinite`).
- **VisãoGeralTab**: corrigir `faturamento_delta * 100` (já vem em decimal? confirmar em `useDashboardGeral`) — se necessário, unificar assinatura via helper `pctDisplay(v)` que detecta escala 0-1 vs 0-100.
- **Adicionar sub-badge de status** por KPI headline (`ok`/`erro`/`carregando`) usando o campo `status` que já vem dos hooks; renderiza um dot discreto em vez de mostrar 0 silencioso.

### 3. Remover filtros que ocultam dados

- `useComercial`: **remover** o filtro que exclui `OUTROS` e `LANCTO MANUAL` das revendas — deixar aparecer com badge `[Outros]` para transparência.
- `useCompras`: sempre incluir as duas fatias `Atrasadas`/`No prazo` (mesmo com zero) para o donut manter contexto.
- `useEstoque`: mesmo tratamento — `itens_ok`, `abaixo`, `acima`, `sem_politica` sempre presentes na composição.

### 4. Gráficos de contabilidade

- **ContabilidadeTab**: trocar `HorizontalBarChartCard` do `dre_top` (que tem valores negativos e distorce) por `WaterfallChartCard` já disponível na biblioteca, com fallback `inline` quando totais vierem zerados.
- Grupos do balanço: quando a lista vier vazia, manter o card visível com placeholder inline + link para "Abrir Balanço Patrimonial" (já existe no topo).

### 5. Ajustes por aba (padrão único de resiliência)

Para cada uma das 9 abas em `src/pages/dashboard-geral/tabs/*.tsx`:

- Todos os charts recebem `emptyVariant="inline"` e `height` reduzida quando série vazia (via prop).
- Toda seção `<section>` mantém a **estrutura de grid mesmo com dados vazios** — o card fica com placeholder inline, o grid não colapsa.
- Adicionar `subtitle` explicando o período (`"Mês atual · MM/AAAA"`) para o usuário identificar o recorte.
- Tabelas (`EstoqueTab.rupturas`, `ContabilidadeTab.balanco`) já tratam vazio — apenas polir microcopy e adicionar contagem no header ("0 itens em ruptura ✓").

### 6. Fora de escopo

- Nenhuma alteração em endpoints, migrations, backend, cálculos de negócio ou navegação.
- Nenhum novo card/gráfico é adicionado — só reforço da renderização dos existentes.

## Arquivos afetados

**Novos:**
- `src/components/bi/states/InlineEmpty.tsx`

**Editados:**
- `src/components/bi/charts/ChartCardShell.tsx` (prop `emptyVariant`)
- `src/components/bi/kpis/KpiCard.tsx` (fallback `NaN`/`Infinity` → `—`)
- `src/hooks/dashboardGeral/shared.ts` (`safeDiv`, `pctDisplay`)
- `src/hooks/dashboardGeral/{useComercial,useCompras,useContabilidade,useEstoque,useFinanceiro,useProducao,useRh,useManutencao}.ts` (usar `safeDiv`, retirar filtros ocultadores, sempre popular categorias)
- `src/pages/dashboard-geral/tabs/{ComercialTab,ComprasTab,ContabilidadeTab,EstoqueTab,FinanceiroTab,ManutencaoTab,ProducaoTab,RhTab,VisaoGeralTab}.tsx` (props `emptyVariant`, subtitles de período, correções pontuais de escala de %)

## Resultado esperado

Cada aba do Dashboard Geral **preserva o layout** independentemente da qualidade do payload: KPIs mostram o valor real ou `—` (nunca `NaN`/`Infinity`), gráficos exibem barras/linhas quando há dados e um placeholder compacto quando não há — sem que o card vazio ocupe a tela inteira e sem esconder as informações vizinhas.
