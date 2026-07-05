## Objetivo

Duas entregas no Painel de Compras (aba **Dashboard**), consumindo o backend novo (`POST /api/compras/ia-grafico`) e a Biblioteca BI já plugada via `PageDataProvider pageKey="painel-compras"`.

---

## Entrega 1 — Análise Gerencial com IA

Adicionar bloco colapsável **"Gerar gráfico com IA"** no topo da aba Dashboard, reaproveitando o padrão do BI Comercial.

**Novos arquivos**
- `src/lib/bi/comprasIaChartApi.ts` — client de `POST /api/compras/ia-grafico`. Mesmo contrato de resposta do BI Comercial (`titulo, subtitulo, tipo_grafico, dimensao, metrica, total, series[{label, valor, filtros_drill}]`). Dimensões: `fornecedor | projeto | centro_custo | mes | oc | item | familia | origem`. Métricas: `comprado | pendente | recebido | qtd_ocs | qtd_itens`.
- `src/components/compras/ComprasAiChartGenerator.tsx` — variante do `AiChartGenerator`:
  - chama `api.post('/api/compras/ia-grafico', { prompt, filtros })` passando os filtros ativos do painel (`fornecedor, numero_projeto, centro_custo, transacao, tipo_item, tipo_despesa, data_emissao_ini/fim, data_entrega_ini/fim, mes_competencia, somente_pendentes`);
  - render bar/line/pie/donut a partir de `series`;
  - formatação: `formatCurrency` para métricas monetárias, `formatNumber` para `qtd_ocs`/`qtd_itens`;
  - **click** em fatia/barra: usa `filtros_drill` da série — pega a primeira chave e chama `openDrill(chave, valor, label)` (a chave já vem no formato do painel: `fantasia_fornecedor`, `numero_projeto`, `centro_custo`, `mes_competencia_calc`, etc.);
  - chips de exemplo: "top 10 fornecedores por valor comprado", "evolução mensal das compras", "valor pendente por projeto", "compras por centro de custo".

**Integração em `PainelComprasPage.tsx`**
- Dentro de `<TabsContent value="dashboard">`, no topo, renderizar `<ComprasAiChartGenerator filtrosAtivos={filtros} onDrill={openDrill} />` colapsável (Card com header `Sparkles` + botão chevron, colapsado por padrão).
- Nenhum gráfico/KPI existente é alterado.

---

## Entrega 2 — Gráficos do Dashboard substituíveis pela Biblioteca BI

Registrar os gráficos fixos como widgets da biblioteca e permitir esconder/substituir cada um.

**Novo arquivo**
- `src/lib/bi/comprasWidgetCatalog.ts` — catálogo (padrão `comercialWidgetCatalog.ts`) com widgets:
  - `compras.top_fornecedores` (bar, dim=fornecedor, série `top_fornecedores`)
  - `compras.por_mes` (line, série `compras_por_mes`)
  - `compras.por_centro_custo` (bar, série `por_centro_custo`)
  - `compras.por_projeto` (bar, série `por_projeto`)
  - `compras.por_tipo_despesa` (donut, série `tipos_despesa`)
  - `compras.situacoes` (donut, série `situacoes`)
  - `compras.tipos_item` (donut, série `tipos_item`) — Produtos × Serviços
  - `compras.entregas_por_mes` (bar, série `entregas_por_mes`)
- Registrar no `componentRegistry` existente (mesmo mecanismo do BI Comercial).

**Expor mais séries no `PageDataProvider`** (linhas ~789-800 de `PainelComprasPage.tsx`)
- Adicionar: `por_centro_custo`, `por_projeto`, `situacoes`, `tipos_item`, `entregas_por_mes` — todos derivados de `dashboard.graficos.*` já disponíveis (com fallback para `chartData` local quando o endpoint agregado não retornou).

**Toggle "Biblioteca BI"** (padrão da ComercialPage)
- Estado local `modoEdicao` + botão no header da aba Dashboard.
- Chave `hiddenCharts: Record<string, boolean>` persistida em `localStorage('painel-compras.hiddenCharts')`; cada gráfico fixo (top_fornecedores, situacoes, tipos_item, entregas_por_mes, por_mes, por_centro_custo, por_projeto, por_tipo_despesa) recebe um botão "Esconder" (visível só em modo edição) que seta a flag; escondidos não renderizam.
- `UserWidgetsSlot section="charts"` continua exibindo widgets da biblioteca aplicados pelo usuário — quando o fixo está escondido, o widget correspondente da biblioteca toma o lugar naturalmente.

**Fora de escopo**
- Endpoints, cálculos de KPI, drill navigation, filtros, sidebar/menu.

---

## Detalhes técnicos

- `filtros_drill` do backend pode vir como `{fantasia_fornecedor: "ACME"}` etc. Handler:
  ```ts
  const [k, v] = Object.entries(serie.filtros_drill ?? {})[0] ?? [];
  if (k && v != null) openDrill(k, v, serie.label);
  ```
- Backend usa Gemini opcional; frontend não precisa saber — só faz POST.
- Reusar `DonutChartCard/BarChartCard/LineChartCard/PieChartCard` de `@/components/bi`.
- Diagnóstico de "0 séries" reaproveitado do `AiChartGenerator` (mostra filtros aplicados).

## Arquivos tocados

- **Criar**: `src/lib/bi/comprasIaChartApi.ts`, `src/components/compras/ComprasAiChartGenerator.tsx`, `src/lib/bi/comprasWidgetCatalog.ts`
- **Editar**: `src/pages/PainelComprasPage.tsx` (import + slot IA na aba Dashboard, séries extras no PageDataProvider, toggle edição + botões esconder), registrar catálogo (import no bootstrap onde `comercialWidgetCatalog` é registrado).
