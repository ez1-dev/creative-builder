## Resumo

Hoje o "Editar layout" em `/passagens-aereas` só move/redimensiona/oculta blocos. Quero estender para um **construtor visual completo** onde o admin pode (a) trocar o tipo de visualização dos gráficos existentes e (b) adicionar novos gráficos customizados, tudo persistido globalmente.

A boa notícia: o projeto já tem essa engenharia — o registry da Biblioteca BI (`src/lib/bi/componentRegistry.tsx`, `pageRegistry.ts`, `ApplyComponentDialog`, `PageDataContext`) cobre 24 tipos de gráfico com mapping de séries e auto-fill. Vou conectar isso ao layout salvo em `dashboard_widgets`.

## Fluxo proposto

**Modo edição**, em cada bloco que é um gráfico, aparece um botão ⚙️ ao lado dos +/-/X. Ao clicar abre um diálogo:

```
┌─ Configurar gráfico ──────────────────────────┐
│ Tipo:    [ Barras vertical ▼ ]                │
│           ├ Barras horizontal                 │
│           ├ Linhas / Área                     │
│           ├ Pizza / Rosca                     │
│           └ Ranking, Funnel, Treemap, etc.    │
│                                               │
│ Série:   [ Top Centros de Custo ▼ ]           │
│ Título:  [ Custos por CC                  ]   │
│                                               │
│           [ Cancelar ]  [ Aplicar ]           │
└───────────────────────────────────────────────┘
```

E o "+ Adicionar bloco" do toolbar ganha duas opções:
- **Restaurar bloco oculto** (igual hoje)
- **Novo gráfico…** → abre catálogo dos 24 tipos da Biblioteca BI; após escolher, abre o mesmo diálogo para mapear série/título.

Tudo salvo em `dashboard_widgets.config` (já é JSONB) e persistido globalmente.

## Implementação

### 1. Registrar página de Passagens no PAGE_REGISTRY
`src/lib/bi/pageRegistry.ts`: adicionar entrada `passagens-aereas` com:
- `kpis`: total_geral, ticket_medio, total_registros, colaboradores_unicos
- `series`: evolucao_mensal, por_motivo, top_cc, top_cidades, top_uf, top_destinos_valor
- `rows`: passagens (campos colaborador, cc, projeto, valor…)

### 2. Expor dados via PageDataContext em `PassagensDashboard.tsx`
Embrulhar a área dos blocos com `<PageDataProvider value={{ kpis, series, rows }}>` populando os `useMemo` já calculados (totalGeral, evolucao, motivosData, topCC, topCidades, etc.). Sem mudar visuais; só publica o que já existe.

### 3. Estender `dashboard_widgets.config`
Schema lógico (sem migração — é JSONB livre):
```ts
{
  hidden?: boolean,
  componentId?: string,   // id do COMPONENT_REGISTRY (ex.: "bar-chart")
  mapping?: Record<string, string>,
  options?: Record<string, any>,
  customTitle?: string
}
```
Sem `componentId` → renderiza o bloco canônico atual (compatível). Com `componentId` → renderiza via `COMPONENT_REGISTRY[id].render({ title, mapping, ctx, options })`.

### 4. Tipos `custom-*` para blocos novos
Novos blocos adicionados pelo usuário usam `type = "custom-{nanoid}"`. A RPC `upsert_passagens_dashboard_default` é ajustada para **preservar** registros com prefixo `custom-` (em vez de deletar tudo fora da whitelist).

### 5. UI no `PassagensLayoutGrid`
- Adicionar botão Settings ao toolbar de edição quando o bloco é configurável (ou seja, está em uma whitelist `CONFIGURABLE_TYPES = [chart-evolucao-mensal, chart-motivo-viagem, chart-top-cc, chart-top-cidades, chart-top-uf, custom-*]`).
- KPIs, MapaDestinosCard e tabela-registros permanecem fixos (não configuráveis) — são componentes complexos com cross-filter próprio.

### 6. Diálogos
- **`ConfigureChartDialog`** novo — versão simplificada do `ApplyComponentDialog` voltada para um único bloco de Passagens. Reusa `MAPPING_FIELDS` e `autoMap` do registry.
- **`AddChartDialog`** novo — lista os tipos do registry filtrados por `kind === 'chart'`; ao escolher chama o ConfigureChartDialog.

### 7. Hook `usePassagensLayout`
- Tipo `PassagensWidget` ganha `componentId`, `mapping`, `options`, `customTitle` (vindos do `config`).
- `saveLayout` (já corrigido) aceita esses campos e persiste em `config`.
- `mergeWithDefaults` preserva blocos `custom-*` mesmo se não estão nos defaults.

### 8. Migração SQL
Atualizar `upsert_passagens_dashboard_default` para que o `DELETE` preserve `type LIKE 'custom-%'`. Sem mudanças em colunas.

## Detalhes técnicos

- Arquivos novos: `src/components/passagens/ConfigureChartDialog.tsx`, `src/components/passagens/AddChartDialog.tsx`.
- Arquivos modificados: `src/lib/bi/pageRegistry.ts`, `src/hooks/usePassagensLayout.ts`, `src/components/passagens/PassagensLayoutGrid.tsx`, `src/components/passagens/PassagensDashboard.tsx`.
- 1 migração: ajuste do filtro DELETE na RPC para preservar `custom-*`.
- Compatível com layouts existentes: blocos sem `componentId` continuam renderizando como hoje.
- Compartilhamento via link público (`/compartilhado`) já lê `widget_config` via RPC — basta adicionar leitura dos novos campos.

## Fora de escopo nesta etapa

- Permitir cada usuário ter sua própria configuração (você optou por compartilhada).
- Editar mapping/título de KPIs individualmente, MapaDestinosCard e tabela-registros (continuam como blocos fixos).
- Construtor multi-aba — o dashboard de Passagens permanece com uma aba só.
