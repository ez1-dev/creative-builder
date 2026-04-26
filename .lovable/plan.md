## Objetivo

Transformar a página `/passagens-aereas` num **construtor visual de dashboards** estilo BI:
- Múltiplos dashboards (abas) salvos no banco.
- Editor visual com paleta de widgets, drag-and-drop e redimensionamento em grid.
- **Cross-filter**: clicar numa fatia/barra filtra todos os outros widgets da aba.
- **Drill-down**: duplo-clique abre tabela detalhada dos registros que compõem o ponto.
- **Layout padrão (admin) + override pessoal (cada usuário)**.
- Gráficos com **Recharts** (já usado no projeto).

## Como vai ficar (visão do usuário)

```text
┌──────────────────────────────────────────────────────────────┐
│ Passagens Aéreas                       [Compartilhar] [Novo] │
├──────────────────────────────────────────────────────────────┤
│ Abas: [ Visão Geral ] [ Por Colaborador ] [ + Nova ] [Editar]│
├──────────────────────────────────────────────────────────────┤
│ Filtros globais: data início | data fim | tipo | colaborador │
├──────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌──────────────────────────┐           │
│ │ KPI    │ │ KPI    │ │ Barras: gasto × c.custo  │           │
│ │ Total  │ │ Regs   │ │ (clique filtra tudo)     │           │
│ └────────┘ └────────┘ └──────────────────────────┘           │
│ ┌──────────────────┐  ┌──────────────────────────┐           │
│ │ Pizza: tipo      │  │ Linha: evolução mensal   │           │
│ └──────────────────┘  └──────────────────────────┘           │
│ ┌────────────────────────────────────────────────┐           │
│ │ Tabela detalhada                               │           │
│ └────────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────┘
```

**Modo edição** (botão "Editar dashboard", só admin no layout-padrão; qualquer um no próprio override):
- Painel lateral com **paleta de widgets**: KPI, Barra, Linha, Área, Pizza, Treemap, Scatter, Tabela.
- Arrastar widget para o grid; redimensionar pelas bordas.
- Clicar num widget abre **inspetor** à direita: título, tipo de gráfico, dimensão (eixo X), métrica (soma/contagem/média/mín/máx do campo), filtros locais, formatação, cor.
- Botões: **Salvar**, **Descartar**, **Restaurar padrão** (apaga override pessoal).

## Estrutura de dados (novas tabelas)

**`dashboards`** — uma aba.
- `id uuid pk`, `module text` (= `'passagens-aereas'`), `name text`, `is_default boolean`, `owner_id uuid null` (null = padrão do admin; preenchido = override pessoal), `position int`, `created_at`, `updated_at`.
- Unique parcial: `(module, owner_id, name)`.

**`dashboard_widgets`** — widgets de uma aba.
- `id uuid pk`, `dashboard_id uuid fk`, `type text` (`kpi|bar|line|area|pie|treemap|scatter|table`), `title text`,
- `config jsonb` (dimensão, métrica, agregação, campo, filtros locais, cor, formato),
- `layout jsonb` (`{x,y,w,h}` — grid 12 colunas),
- `position int`.

**RLS**:
- SELECT: autenticado lê dashboards `owner_id IS NULL` (padrão) **OU** `owner_id = auth.uid()` (próprios).
- INSERT/UPDATE/DELETE em `owner_id = auth.uid()`: qualquer autenticado.
- INSERT/UPDATE/DELETE em `owner_id IS NULL`: apenas `is_admin(auth.uid())`.
- Mesma lógica em `dashboard_widgets` via join no dashboard pai.

**Resolução de qual dashboard mostrar**: para cada `name` do módulo, se existe versão do usuário (`owner_id = auth.uid()`) usa ela; senão, usa a padrão (`owner_id IS NULL`).

## Componentes (frontend)

Novos arquivos em `src/components/dashboard-builder/`:
- `DashboardBuilder.tsx` — orquestrador (abas + modo view/edit).
- `WidgetGrid.tsx` — grid responsivo com `react-grid-layout`.
- `WidgetRenderer.tsx` — switch por `type` que chama o componente certo.
- `widgets/KpiWidget.tsx`, `BarWidget.tsx`, `LineWidget.tsx`, `AreaWidget.tsx`, `PieWidget.tsx`, `TreemapWidget.tsx`, `ScatterWidget.tsx`, `TableWidget.tsx` (todos Recharts, exceto KPI/Tabela).
- `WidgetPalette.tsx` — paleta lateral (modo edição).
- `WidgetInspector.tsx` — painel de propriedades do widget selecionado.
- `useCrossFilter.ts` — hook + contexto com filtros aplicados por interação (`{ field, value }`), aplicados antes da agregação em todos widgets.
- `aggregations.ts` — funções puras `aggregate(rows, { dimension, metric, aggregation })`.

Adaptação na página:
- `src/pages/PassagensAereasPage.tsx`: substituir `<PassagensDashboard ... />` por `<DashboardBuilder module="passagens-aereas" data={data} loading={loading} />`.
- O atual `PassagensDashboard` continua existindo para a página pública compartilhada (`PassagensAereasCompartilhadoPage`), sem editor.

## Cross-filter & drill-down

- Cada widget chama `onSelect({ field, value })` quando o usuário clica numa categoria.
- `useCrossFilter` mantém array de filtros ativos; aparecem como **chips removíveis** acima do grid.
- Todos os widgets recalculam a partir de `data` filtrada por (filtros globais ∩ filtros locais ∩ cross-filters).
- Duplo-clique em um ponto abre **modal com `TableWidget`** mostrando os registros da fatia.

## Dependências novas
- `react-grid-layout` (drag/resize do grid).
- (Recharts e demais já existem.)

## Filtros globais
Mantém os filtros de hoje (`data início`, `data fim`, `tipo`, `colaborador`) acima das abas; serão respeitados por todos os widgets de qualquer aba. Salvos no `user_preferences.frequent_filters['passagens-aereas']`.

## Seeds (dashboards iniciais)
Migração já cria 2 abas padrão (`owner_id = NULL`):
1. **Visão Geral** — KPIs (total, registros, colaboradores catálogo), barra por centro de custo, pizza por tipo de despesa, linha por mês, tabela.
2. **Por Colaborador** — barra top 20 colaboradores, pizza por cia aérea, treemap origem→destino, tabela.

## Permissões
- Botão **"Editar layout padrão"**: visível só para admin (controla dashboards com `owner_id IS NULL`).
- Botão **"Personalizar"**: visível para qualquer usuário autenticado; cria/edita o dashboard com `owner_id = auth.uid()`.
- **"Restaurar padrão"**: apaga o override pessoal.

## Arquivos impactados / criados

Criados:
- `src/components/dashboard-builder/*` (10 arquivos listados acima)
- Migração SQL (tabelas `dashboards`, `dashboard_widgets`, RLS, seeds)

Editados:
- `src/pages/PassagensAereasPage.tsx` (troca o componente principal)
- `package.json` (adiciona `react-grid-layout`)

Não tocados:
- `PassagensDashboard.tsx` (segue usado pela página pública compartilhada)
- `client.ts`, `types.ts`, `.env` (auto-gerados)

## Fora deste escopo (ficam para depois, se quiser)
- Filtros cruzados entre abas diferentes.
- Versionamento/histórico de dashboards.
- Exportar dashboard como PDF/imagem.
- Aplicar o builder em outros módulos (a arquitetura já fica genérica via campo `module`, então depois é só plugar).
