# Monitor de Telas — ERP Nativo (`/monitor-erp-nativo`)

Nova página que consome a auditoria nativa do ERP Senior (tabela `e000log`). Segue o padrão visual/UX do `MonitorTelasPage` já existente e não substitui o Monitor Web.

## Novos arquivos

### 1. `src/lib/monitorErpNativoApi.ts`
Camada de acesso à API. Usa `api.get` (base + Bearer já configurados).

Tipos exportados:
- `MonitorErpFiltros` — `{ dias?; tela?; tabela?; usuario_filtro?; tiplog? }` (helper `buildParams` que remove chaves vazias).
- `MonitorErpResumo`, `MonitorErpRankingTela`, `MonitorErpUsuario`, `MonitorErpEvento`, `MonitorErpPorDia`, `MonitorErpSemUso` — flexíveis (todos campos opcionais, aceitam extras).
- `TipLog = 'I' | 'A' | 'E'`.

Funções:
- `getResumo(f)` → `/api/monitor-erp-nativo/resumo`
- `getRanking(f, limit=100)` → `/api/monitor-erp-nativo/ranking`
- `getPorDia(f)` → `/api/monitor-erp-nativo/por-dia`
- `getUsuarios(f, limit=200)` → `/api/monitor-erp-nativo/usuarios`
- `buscarEventos(f, limit=200)` → `/api/monitor-erp-nativo/buscar`
- `getSemUso(dias)` → `/api/monitor-erp-nativo/sem-uso`

Helper `mapTiplog(t)` retornando `{ label, icon, badgeVariant }` (Inclusão / Alteração / Exclusão).

### 2. `src/pages/MonitorErpNativoPage.tsx`
Layout (segue `MonitorTelasPage`):

- Cabeçalho: título "Monitor de Telas — ERP Nativo" + subtítulo curto.
- **Barra de filtros** (Card fixo no topo):
  - Período: chips 7/30/90/180 (default 30).
  - Tela: input "Código da tela, exemplo F210LPD".
  - Tabela: input "Nome da tabela".
  - Usuário: input "Login ou código do usuário".
  - Tipo: Select Todos/Inclusão/Alteração/Exclusão.
  - Debounce ~400ms nos textos via `useDebouncedValue` (novo hook simples inline se não existir).
  - Não envia parâmetros vazios (buildParams).
- **Cards de resumo** (grid 4 col): Total Gravações, Telas Usadas, Telas Sem Uso, Usuários Ativos. Abaixo: chips com ícones para Inclusões (`Plus`), Alterações (`Pencil`), Exclusões (`Trash2`). Legenda: `Fonte: {resumo.fonte}. Captura gravações de dados, não simples visualização de telas.`
- **Gráfico "Gravações por dia"** — `recharts` `BarChart` (já usado no projeto) + linha `usuarios` quando presente. Tooltip com data, gravações, usuários, telas.
- **Tabs**: `Telas` · `Usuários` · `Eventos` · `Sem uso`.
  - `Telas`: tabela com Tela, Tabela, Gravações, Usuários, I/A/E, Última movimentação. Linha clicável → abre drawer de eventos com `tela` aplicada. Key = `tela+'|'+tabela`.
  - `Usuários`: tabela análoga; clique aplica `usuario_filtro` e abre drawer.
  - `Eventos`: consulta `/buscar` ao entrar na aba ou após clique; colunas Data/Hora, Usuário, Tela, Tabela, Ação (badge+ícone), Chave (`Não informada` quando vazia). Sem deduplicação.
  - `Sem uso`: `/sem-uso?dias={periodo}` — colunas Tela, Tabela, Última movimentação, Dias sem uso, Total histórico. Tooltip explicativo no título.
- **Drawer de detalhamento** (`Sheet` shadcn): reutiliza a query de `buscarEventos` com filtro atual + `tela`/`usuario` selecionados.
- **Alert informativo fixo** no rodapé: texto exigido sobre gravações vs. visualização.
- Estados: `Skeleton` (cards, gráfico, tabelas); vazio "Sem registros no período selecionado."; erro "Não foi possível carregar o Monitor do ERP Nativo." + botão "Tentar novamente" que faz `refetch`. Não mostrar "API offline" genérico.

**TanStack Query** — `staleTime: 60_000`, `gcTime: 5*60_000`, `refetchOnWindowFocus: false`. Query keys:
- `["monitor-erp-nativo","resumo",dias,tela,tabela,usuario,tiplog]`
- `["monitor-erp-nativo","por-dia", ...mesmos]`
- `["monitor-erp-nativo","ranking", ...]`
- `["monitor-erp-nativo","usuarios", ...]`
- `["monitor-erp-nativo","buscar", ...]`
- `["monitor-erp-nativo","sem-uso",dias]`

## Arquivos alterados

### 3. `src/App.tsx`
- Import lazy: `import MonitorErpNativoPage from "@/pages/MonitorErpNativoPage"`.
- Nova rota protegida:
  `<Route path="/monitor-erp-nativo" element={<ProtectedRoute path="/monitor-erp-nativo"><MonitorErpNativoPage /></ProtectedRoute>} />`

### 4. `src/components/AppSidebar.tsx`
- No grupo `config` (após "Monitor de Telas (IA)"):
  `{ title: 'Monitor de Telas — ERP Nativo', url: '/monitor-erp-nativo', icon: Database }`
- Manter "Monitor de Telas (IA)" inalterado.

### 5. `src/lib/screenCatalog.ts`
- Adicionar entrada para `/monitor-erp-nativo` (para checagem de permissão do `ProtectedRoute`).

## Fora de escopo
- Não altera backend, SQL, `e000log`, auth, URL da API, Monitor Web, telemetria atual, nem Cloud (Supabase).
- Sem cálculos no frontend — apenas renderiza o payload.
- 404 nos endpoints antes do restart do backend não deve ser tratado como bug visual (mostra o estado de erro padrão).

## Critérios de aceite cobertos
1–15 do briefing atendidos pela estrutura descrita.
