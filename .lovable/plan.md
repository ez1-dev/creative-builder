## Objetivo

Aplicar à tela `Painel de Compras` o mesmo padrão executivo de ERP/BI já usado na `Notas Fiscais de Recebimento` (cards modernos, filtros recolhíveis, chips ativos, gráficos padronizados, drill com breadcrumb claro, tabela limpa) — **sem alterar lógica de negócio, endpoints, cálculos, drill ou export**.

## Mudanças

### 1. Componentes reutilizáveis

- **`src/components/erp/ChartCard.tsx`** (novo, extraído do que já existe em `NotasRecebimentoPage`): wrapper com header (ícone + título + contador opcional) e área de gráfico, padronizando aparência.
- **`src/components/erp/ActiveFilterChips.tsx`** (novo, extraído da implementação em Notas): barra de chips removíveis, recebe `chips: { key, label, value, onRemove }[]`.

Ambos serão consumidos depois também por `NotasRecebimentoPage` numa próxima passagem (não nesta).

### 2. `src/pages/PainelComprasPage.tsx` — redesign visual

- **PageHeader**: título "Painel de Compras" e subtítulo "Compras por projeto, centro de custo, tipo de despesa, fornecedor e recebimento". Ações no topo:
  - Atualizar (`search(pagina)`)
  - Limpar filtros (existente `clearFilters`)
  - Limpar drill (`setDrillSeed(null)` + reset do stack via prop em `PainelDrillView` — adicionar callback opcional `onClearDrill`)
  - Seletor "Registros"
  - ExportButton (já existe)
- **FilterPanel**: `defaultOpen={false}` quando já houver dados. Mantém todos os filtros atuais; nenhum é removido.
- **ActiveFilterChips** abaixo do FilterPanel, listando filtros aplicados (Projeto Macro, Tipo Despesa, Mês, Cond. Pagto, Fornecedor, Projeto, CC, Situação OC, datas, Transação, Tipo OC, Tipo Item, Família, Origem, Item, Descrição, Desconto, Somente pendentes).
- **KPI Hero** (visão executiva, substitui a primeira linha):
  - Card primário (gradient sutil, `border-l-4 border-primary`) com **Total Comprado** + Ticket Médio/OC.
  - Card de **Recebido vs Pendente** com duas barras de progresso (success/warning) mostrando `% Recebido` quando `recebido != null`; senão só Pendente vs Comprado.
  - KPICards menores: Qtd OCs, Qtd Itens, Qtd Fornecedores, Maior Fornecedor (todos clicáveis usando o `openDrill`/`openDrillRoot` já implementado).
- **Painel "Status de OCs / Vínculo NF"** (novo card, abaixo dos KPIs):
  - Barras de progresso para: OCs com NF, OCs sem NF, OCs totalmente recebidas, parcialmente recebidas, pendentes, itens atrasados.
  - Os valores derivam de `kpis` / `chartData?.situacoes` / `dadosFiltrados` que já existem (sem novo endpoint).
- **Operacionais detalhados**: mover os KPIs financeiros existentes (Valor Bruto, Desconto, Impostos, Itens Atrasados etc.) para um `<details>` recolhível "Indicadores Operacionais Detalhados" — preserva todos os KPIs atuais, apenas reduz ruído inicial.
- **Gráficos**: envolver cada `ResponsiveContainer` em `ChartCard`. Layout `grid lg:grid-cols-3 xl:grid-cols-3`:
  - Compras por Mês (col-span-2) com `linearGradient` + `ReferenceLine` da média.
  - Tipo de Despesa: PieChart com `innerRadius` (donut) e total no centro.
  - Top Fornecedores, Top CCs, Top Projetos, Famílias, Origens: ChartCards padronizados.
  - **Comparativo Comprado x Recebido x Pendente** (novo gráfico de barras agrupadas por mês) — só renderiza se houver `valor_recebido` na linha; caso contrário fica oculto (sem mock).
- **Tabela**: trocar coluna `situacao_oc` para usar `<Badge>` colorido (success=Liquidado, info=Aberto, warning=Suspenso, destructive=Cancelado, default demais). Coluna `numero_nf`: badge `Link2` (success) quando preenchido, `Unlink` (warning) quando vazio. Coluna `dias_atraso > 0`: badge destructive. Cabeçalho fixo via `sticky top-0` e hover já existente no `DataTable`. Manter todas as colunas atuais.
- **Drill-down** (`PainelDrillView`): nada na lógica. Adicionar: chip "Nível atual" destacado no breadcrumb (badge primary) e indicação "Próximo: <nivel>" ao lado. Já existe seed via clique em gráfico.
- **Estados visuais**:
  - Loading: skeleton dos KPIs/gráficos.
  - Estado vazio (após pesquisa): card centralizado "Nenhum resultado para os filtros aplicados" com botão "Limpar filtros".
  - Erro: já é tratado via toast — manter; adicionar mensagem inline quando `data === null` após erro.

### 3. Nada de quebra
- Endpoints, parâmetros, drill, export, autenticação e filtros mantidos exatamente como estão.
- Sem mocks: indicadores que dependem de campos opcionais (`valor_recebido`) só aparecem se vierem.
- Tabela mantém todas as colunas atuais (apenas badges + condicionais visuais).

## Validação
1. Filtros alteram KPIs, gráficos e tabela.
2. Limpar filtros funciona e não altera o drill.
3. Limpar drill funciona e não altera filtros.
4. Drill segue a ordem completa.
5. Export respeita filtros.
6. Layout responsivo (lg/xl/notebook).
7. Nenhuma funcionalidade prévia removida.
