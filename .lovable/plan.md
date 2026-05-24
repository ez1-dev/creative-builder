## Módulo "Carga de Produção"

Novo módulo apenas consumidor da API FastAPI. Nenhum cálculo no frontend — toda regra (classificação GENIUS/ESTRUTURAL/APOIO, mapeamento de recursos, agregação de carga) vem pronta da API.

### Rota e menu
- Nova rota `/producao/carga` em `src/App.tsx`.
- Item "Carga de Produção" no grupo Produção em `src/components/AppSidebar.tsx` (ícone `Gauge` ou `Activity`).
- Permissão registrada em `src/lib/screenCatalog.ts`.

### Estrutura de arquivos

```
src/pages/producao/CargaProducaoPage.tsx          (page com Tabs)
src/components/producao/carga/
  CargaFiltersBar.tsx        filtros compartilhados entre abas
  VisaoGeralTab.tsx          KPIs (cards) + resumo da API
  CentrosRecursoTab.tsx      tabela agregada, ordenação, busca rápida
  DetalheOpsTab.tsx          tabela paginada
  ParametrosRecursosTab.tsx  CRUD via API
  ParametroRecursoDialog.tsx form incluir/editar
  badges.tsx                 UnidadeNegocioBadge, OrigemMapeamentoBadge
src/hooks/useCargaProducao.ts  hooks de fetch (centros, detalhe, opções, parâmetros)
src/lib/producao/cargaApi.ts   wrappers tipados sobre api.ts
```

### Consumo da API (via `src/lib/api.ts` existente — já injeta `Authorization: Bearer` e `ngrok-skip-browser-warning`)

- `GET /api/producao/carga/centros` → tabela Centros + `resumo.*` para KPIs
- `GET /api/producao/carga/detalhe` → tabela paginada (`pagina`, `tamanho_pagina`)
- `GET /api/producao/carga/opcoes` → popular selects de filtros
- `GET|POST|PUT /api/producao/carga/parametros-recursos[/id]` → aba Parâmetros
- `GET /api/export/producao-carga-centros` → botão Exportar Excel (download blob com filtros atuais)

### Filtros (compartilhados entre abas via estado na page)
- Data inicial / Data final (default: mês corrente)
- Situações OP (multi, default `A,L`)
- Unidade de negócio: TODOS, GENIUS, ESTRUTURAL, APOIO, NAO_CLASSIFICADO
- Tipo de recurso: TODOS, PRODUCAO, TERCEIROS, LOGISTICA, MANUTENCAO
- Centro de recurso, Operação, Produto, Origem (via `/opcoes`)
- Checkbox "Considerar somente recursos produtivos" (default ON → `considera_carga=true`)
- Botões Atualizar e Exportar Excel

### Aba 1 — Visão Geral
Cards KPI (usar `KpiGrid` + `KpiCard` da biblioteca BI) mapeando: `qtd_ops`, `qtd_recursos`, `qtd_linhas_operacao`, `carga_prevista_min`, `carga_prevista_horas`, `linhas_sem_mapeamento_supabase` (destacar em amarelo se > 0).

### Aba 2 — Centros de Recurso
Tabela ordenável (default `carga_prevista_horas desc`), busca rápida client-side sobre `codcre/descre/codopr/descricao_operacao`. Linha clicável → muda para aba Detalhe aplicando `codcre` e `codopr` aos filtros. Badge de unidade de negócio.

### Aba 3 — Detalhe das OPs
Tabela paginada server-side com todas as colunas listadas, badge `origem_mapeamento` (SUPABASE / REGRA_API), formatação de tempo (min e horas), badge de situação.

### Aba 4 — Parâmetros de Recursos
Tabela listando parâmetros + botão "Novo". Dialog com formulário (zod + react-hook-form) para POST/PUT. Selects pré-populados com valores sugeridos de `unidade_negocio` e `tipo_recurso`. Toggle de `considera_carga` e `ativo`.

### UX
- `useQuery` (TanStack) com loading skeletons e estado vazio.
- Tratamento de erro com toast + mensagem amigável na tela.
- Filtros persistem ao trocar aba (estado na page).
- Badges via design tokens semânticos (sem cores hardcoded):
  - GENIUS = primary; ESTRUTURAL = secondary; APOIO = accent; NAO_CLASSIFICADO = muted
  - SUPABASE = secondary; REGRA_API = outline

### Fora de escopo
- Nenhuma alteração no FastAPI.
- Nenhuma leitura direta de tabelas do ERP ou da `producao_recurso_unidade` no Supabase pelo frontend.
- Sem ETL/BI nesta entrega.
