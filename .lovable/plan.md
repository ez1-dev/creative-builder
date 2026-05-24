## Objetivo

Criar uma nova página `/producao/carga/recursos` — um **dashboard dedicado à visão por Centro de Recurso**, focado em **ocupação e gargalo**, consumindo `GET /api/producao/carga/recursos`.

A página atual `/producao/carga/dashboard` (grão Centro+Operação) continua existindo. As duas convivem como dashboards-irmãos.

## Layout

```text
┌────────────────────────────────────────────────────────────┐
│ Header  "Dashboard por Centro de Recurso"                  │
│ + link "Ver por operação →" (vai para /carga/dashboard)    │
│ + Atualizado em ...                                        │
├────────────────────────────────────────────────────────────┤
│ FiltersBar (reaproveitada de carga)                        │
├────────────────────────────────────────────────────────────┤
│ KPIs (6 cards numerados, com delta vs mês anterior)        │
│   1. Recursos ativos                                       │
│   2. Qtd OPs                                               │
│   3. Qtd Operações                                         │
│   4. Carga Prevista (h)                                    │
│   5. Centros Críticos (top 10%)                            │
│   6. Carga média por recurso (h)                           │
├────────────────────────────────────────────────────────────┤
│ Linha 1:                                                   │
│   [ Top 10 recursos por carga (barras h) ]  │ Insights     │
│   [ Carga × Qtd OPs (barras duplas)      ]  │ painel       │
├────────────────────────────────────────────────────────────┤
│ Linha 2 (donuts):                                          │
│   [Unid. Negócio]  [Tipo Recurso]  [Centro de Custo]       │
├────────────────────────────────────────────────────────────┤
│ Tabela completa (PorRecursoTable já existente)             │
│   ordenável + status + drill (DrillSheet → DetalheOpsTab)  │
└────────────────────────────────────────────────────────────┘
```

## Diferenças vs `/producao/carga/dashboard`

| | `/dashboard` (atual) | `/recursos` (nova) |
|---|---|---|
| Endpoint base | `/centros` (grão centro+operação) | `/recursos` (1 linha por recurso) |
| Foco | mapeamento e mix de operações | ocupação e gargalo |
| KPIs | 10 cards (inclui placeholders de capacidade) | 6 cards enxutos focados em recurso |
| Heatmap mock | sim | não (irrelevante neste recorte) |
| FilaSituacao | sim | não |
| Tabela principal | `CentrosDemandadosTable` (agregado client de /centros) | `PorRecursoTable` (dados nativos do endpoint) |

## Arquivos a criar

### 1. `src/pages/producao/CargaRecursosDashboardPage.tsx`
Página nova. Estrutura:
- `useState<CargaFiltros>` (mesmos defaults da página atual).
- `useCargaRecursos(filtros)` + `useCargaRecursos(filtrosPrev)` para deltas vs mês anterior.
- Agregações **client-side a partir de `dataRecursos.dados`** para os donuts:
  - por `unidade_negocio` → soma de `carga_prevista_horas`
  - por `tipo_recurso` → soma de `carga_prevista_horas`
  - por `codccu` → top 8 + "Outros"
- Top 10 recursos por `carga_prevista_horas` desc para o gráfico de barras.
- `DrillSheet` + `useDrillSheet` reaproveitando o `DetalheOpsTab` (mesmo padrão).

### 2. `src/components/producao/carga-recursos/RecursosKpis.tsx`
6 KpiCards numerados (reutiliza `KpiCard` existente). Calcula:
- recursos = `dados.length`
- carga média = total horas / recursos
- críticos = `countCriticos` (reuso de `statusOcupacao`, adaptando shape)
- deltas via mês anterior (mesma estratégia da página atual)

### 3. `src/components/producao/carga-recursos/TopRecursosHorasChart.tsx`
Gráfico Recharts horizontal bar (top 10 recursos × carga_prevista_horas). `onSelect(codcre)` → abre drill. Reaproveita estilo do `TopRecursosChart` atual.

### 4. `src/components/producao/carga-recursos/CargaVsOpsChart.tsx`
Gráfico de barras combinadas (carga_h e qtd_ops) por recurso, top 10. `onSelect` → drill.

### 5. `src/components/producao/carga-recursos/InsightsRecursosPanel.tsx`
Painel pequeno com 3-4 insights derivados:
- Recurso #1 em carga (com %)
- Concentração: % do top 3 sobre total
- Recursos com >X horas
- Recursos críticos (link para filtrar tabela abaixo)

## Arquivos a editar

### 6. `src/App.tsx`
Adicionar rota:
```tsx
<Route path="/producao/carga/recursos" element={<ProtectedRoute path="/producao/carga"><CargaRecursosDashboardPage /></ProtectedRoute>} />
```
Mesma guarda de permissão de `/producao/carga`.

### 7. `src/components/AppSidebar.tsx`
Adicionar item "Por Centro de Recurso" no submenu de Produção/Carga, logo abaixo de "Dashboard de Carga".

### 8. `src/lib/screenCatalog.ts`
Registrar a nova tela para o catálogo de telas/permissões.

### 9. `src/pages/producao/CargaDashboardPage.tsx`
No header, adicionar um link discreto "Ver visão por recurso →" apontando para `/producao/carga/recursos`. E vice-versa no header da página nova.

## Reaproveitamento

- `CargaFiltersBar` — sem mudanças.
- `KpiCard` (com `delta`, `number`) — sem mudanças.
- `PorRecursoTable` — sem mudanças (já feito na rodada anterior).
- `DrillSheet` + `DetalheOpsTab` — sem mudanças.
- `statusOcupacao.classifyOcupacao` / `countCriticos` — pequeno ajuste de tipo para aceitar `CargaRecursoRow` (basta tipar parâmetro como `Pick<…, 'codcre'|'codccu'|'carga_prevista_horas'>[]`).
- `DonutCard` — sem mudanças.
- Utils `shiftMonth` / `pctDelta` — copiados do CargaDashboardPage para um helper compartilhado `src/components/producao/carga-dashboard/utils.ts` (extração leve) ou duplicados se preferir manter intocada a página existente.

## Não vai mudar

- Endpoints novos. Tudo a partir de `/api/producao/carga/recursos` (e `/detalhe` para o drill).
- Lógica do `/producao/carga/dashboard` continua igual.
- Permissões — usa a mesma chave `/producao/carga`.

## Observações

- Como o endpoint `/recursos` ainda não retorna capacidade real, **não** vamos colocar KPIs placeholder "Capacidade / Ocupação %" nessa página — em vez disso, "Críticos" e "Carga média" indicam gargalo via ranking percentil (mesmo critério já em uso).
- Página segue o padrão visual da biblioteca BI (`biResponsive.*`, tokens semânticos, sem cor hardcoded).