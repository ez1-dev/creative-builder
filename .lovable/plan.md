## Objetivo

Reestruturar `/producao/carga/dashboard` para destacar a visão **Por Centro de Recurso** (melhor para enxergar ocupação e gargalo) como visão principal, e mover a granularidade Centro+Operação atual para uma aba secundária.

## Layout final

```text
┌──────────────────────────────────────────────────────────┐
│ Header + FiltersBar (inalterados)                        │
│ KPIs (10 cards) ─ compartilhados                         │
│ TopRecursos | CargaxOPs | InsightsPanel ─ compartilhados │
│ Donuts (Unidade / CCusto / FilaSituação) ─ compartilhados│
│ HeatmapMock ─ compartilhado                              │
├──────────────────────────────────────────────────────────┤
│ Tabs:                                                    │
│   [● Por Centro de Recurso]  [ Centros + Operações ]     │
│                                                          │
│   Aba 1 (default): tabela /api/producao/carga/recursos   │
│   Aba 2: tabela atual "CentrosDemandadosTable" /centros  │
└──────────────────────────────────────────────────────────┘
```

KPIs/gráficos continuam vindo de `/api/producao/carga/centros` (já em produção). As abas trocam apenas a tabela detalhada de baixo.

## Mudanças

### 1. API + tipos (`src/lib/producao/cargaApi.ts`)
- Adicionar `CargaRecursoRow`: `{ unidade_negocio, tipo_recurso, codccu, codcre, descre, qtd_ops, qtd_operacoes, qtd_prevista, carga_prevista_min, carga_prevista_horas }`.
- Adicionar `CargaRecursosResponse` (mesmo shape de `CargaCentrosResponse` mas com `dados: CargaRecursoRow[]`).
- Adicionar método `cargaApi.recursos(f)` → `GET /api/producao/carga/recursos`.

### 2. Hook (`src/hooks/useCargaProducao.ts`)
- Adicionar `useCargaRecursos(filtros, enabled)` — espelho de `useCargaCentros`, queryKey `['carga-producao','recursos',filtros]`.

### 3. Tabela nova (`src/components/producao/carga-dashboard/PorRecursoTable.tsx`)
- Card com header "Por Centro de Recurso · {N} recursos".
- Colunas exatamente como pedido: Unidade, Tipo, CCusto, Recurso, Descrição, Qtd OPs, Qtd Operações, Qtd Prevista, Carga (min), Carga (h).
- Ordenação default `carga_prevista_horas` desc; permitir clique no header das colunas numéricas para reordenar (asc/desc).
- Status (Crítico/Alto/Médio/Normal) reaproveitando `statusOcupacao.ts` por percentil de carga_prevista_horas — mesmo critério da tabela atual.
- `onSelect(row)` → callback para drill.
- Linha "Total Geral" no rodapé (somar qtd_ops, qtd_operacoes, qtd_prevista, carga_prevista_min, carga_prevista_horas).
- Loading skeleton + estado vazio + estado de erro.

### 4. Página (`src/pages/producao/CargaDashboardPage.tsx`)
- Importar `Tabs/TabsList/TabsTrigger/TabsContent` de `@/components/ui/tabs`.
- Adicionar `useCargaRecursos(filtros)` ao lado de `useCargaCentros`.
- Embaixo do bloco compartilhado (após `HeatmapMock`), substituir o uso direto de `CentrosDemandadosTable` por:
  - `<Tabs defaultValue="recursos">` com 2 abas.
  - Aba `recursos`: `<PorRecursoTable rows={recursosApi} loading={...} onSelect={openRecursoApi} />`.
  - Aba `centros-operacoes`: `<CentrosDemandadosTable rows={recursos} onSelect={openRecurso} />` (mantém comportamento atual).
- Novo handler `openRecursoApi(row)`: abre `DrillSheet` com `DetalheOpsTab` filtrado por `codcre` daquela linha — exatamente o mesmo padrão de `openRecurso`, mas usando a linha vinda de `/recursos`.
- Rodapé "Fonte: …" passa a citar os dois endpoints conforme aba ativa (ou listar ambos).

### 5. Doc (`docs/backend-carga-dashboard.md`)
- Adicionar nota no topo: visão principal agora é `/api/producao/carga/recursos`; `/centros` continua para o grão Centro+Operação.

## Não vai mudar

- FiltersBar, KPIs, deltas vs mês anterior, charts (TopRecursos, CargaxOPs), donuts, heatmap mock, InsightsPanel, `FilaSituacaoCard`, `DrillSheet`, `DetalheOpsTab`, navegação/rotas.
- Lógica de export (`urlExportarCentros`) — segue ligada ao endpoint atual; opcional adicionar `urlExportarRecursos` mais tarde se pedido.

## Detalhes técnicos

- Tabs usa shadcn (`@/components/ui/tabs`), tokens semânticos — sem cor hardcoded.
- Ordenação por header: estado local `{ key, dir }` na `PorRecursoTable`, default `{ key: 'carga_prevista_horas', dir: 'desc' }`. `useMemo` em cima da lista.
- `qtd_operacoes` é o novo campo (vs `qtd_linhas_operacao` agregado client-side hoje). Mostrar como inteiro `fmtNum`.
- Status percentil reutilizando `statusOcupacao.ts` precisa receber array com `{ carga_prevista_horas }` — já compatível com `RecursoAgg`, ajustar tipo genérico se necessário.