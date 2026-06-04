## Drill-down completo em `/bi/comercial`

Adicionar navegação analítica clicável em todos os componentes do BI Comercial, com filtros encadeados, breadcrumb e drawer de detalhes — sem mocks, consumindo a FastAPI.

### 1. Estado global de filtros

Criar hook `useComercialFilters` em `src/lib/bi/comercialFilters.ts`:

```ts
type BiComercialFilters = {
  // base (não limpa em "Limpar Drill")
  anomes_ini: string;
  anomes_fim: string;
  unidade_negocio: 'GENIUS' | 'ESTRUTURAL ZORTEA' | 'CONSOLIDADO';
  // drill (limpa em "Limpar Drill")
  anomes_emissao?: string;
  cd_estado?: string;
  cd_cliente?: string;
  cd_prj?: string;
  cd_rev_pedido?: string;
  cd_origem?: string;
  cd_tp_movimento?: string;
  cd_tns?: string;
  cd_nf?: string;
};
```

Helpers: `applyDrill(key,value,label)`, `removeDrill(key)`, `clearDrill()`, `getActiveDrillChips()`.

### 2. Camada API

Estender `src/lib/bi/comercialApi.ts`:

- Passar **todos** os filtros ativos como query params para `kpis/mensal/mix/estado/revenda/obras` (a FastAPI já filtra pelo que reconhece; campos não suportados são ignorados — confirmar no backend caso necessário).
- Novo `fetchComercialDetalhes(filters, opts?)` → `GET /api/bi/comercial/detalhes` retornando linhas com as colunas listadas no enunciado. Unwrap key `bi_comercial_detalhes`.
- Tipagem `ComercialDetalheRow` com todas as colunas (`anomes_emissao, unidade_negocio, cd_tp_movimento, cd_origem, cd_empresa, cd_filial, cd_nf, cd_serie, dt_emissao, cd_estado, cd_cliente, cd_prj, ds_abr_prj, cd_rev_pedido, cd_tns, vl_bruto, vl_impostos, vl_liquido, vl_devolucao, qtd_produtos`).
- Opções extras enviadas como query: `escopo` (`'todas' | 'impostos' | 'devolucao' | 'vendas' | 'clientes' | 'estados'`) — apenas etiqueta para o backend distinguir cards; default `todas`.

### 3. Página `/bi/comercial`

Refatorar `src/pages/bi/ComercialPage.tsx` mantendo a Biblioteca BI já em uso:

**Barra de filtros ativos (drill)**

- Usar `DrillBreadcrumb` (já existe em `@/components/bi/drill/DrillBreadcrumb`) logo abaixo do `FilterBar`.
- Mostra cada filtro de drill ativo como chip removível (X) + botão **"Limpar Drill"** que zera apenas os campos de drill.
- Quando vazio, esconder a barra.

**Cliques nos gráficos** — todos passam a ter `cursor-pointer` e tooltip "Clique para detalhar":

| Componente | Ação ao clicar |
|---|---|
| `ComboChartCard` mensal | `applyDrill('anomes_emissao', d.label)` |
| `DonutChartCard` mix | mapear categoria: `MÁQUINAS`/`PEÇAS` → `cd_origem`; `SERVIÇOS`/`PRODUTOS` → `cd_tp_movimento` |
| `HorizontalBarChartCard` estados | `applyDrill('cd_estado', d.label)` |
| `BrazilMapCard` mapa | `applyDrill('cd_estado', uf)` (via prop `onItemClick`) |
| `RankingChartCard` revendas | `applyDrill('cd_rev_pedido', revenda)` |
| `RankingTable` revendas | idem (prop `onItemClick` já existe) |
| `TreemapChartCard` obras | `applyDrill('cd_prj', cd_prj)` |
| `RankingTable` obras | idem |
| `DataTableBI` mensal (linha) | `applyDrill('anomes_emissao', linha)` |

Onde algum componente da Biblioteca BI não expuser `onItemClick`/`onClick` hoje, **adicionar a prop** (mudança mínima, opt-in) no componente da biblioteca: `ComboChartCard`, `DonutChartCard`, `BrazilMapCard`. Os demais já suportam.

**Cliques nos cards KPI** — abrem o drawer de detalhes com `escopo` específico:

- Faturamento → `escopo=todas`
- Impostos → `escopo=impostos` (drawer destaca colunas `vl_impostos` + decompostas se backend retornar)
- Devolução → `escopo=devolucao` (filtro local: `vl_devolucao !== 0`)
- Nº Vendas → `escopo=vendas` (drawer mostra notas distintas)
- Nº Clientes → `escopo=clientes` (drawer agrupado por `cd_cliente`)
- Nº Estados → `escopo=estados` (drawer agrupado por `cd_estado`)

KPIs cliques implementados envolvendo `KpiCard` num wrapper `<button>` que dispara `openDetalhes(escopo)`.

### 4. Drawer de detalhes

Usar `DrillSheet` + `useDrillSheet` (já existem em `@/components/bi/drill/DrillSheet`):

- Título: **Detalhamento do Drill**
- Subtítulo: descrição do escopo
- `chips`: filtros ativos (anomes, unidade, estado, cliente, projeto, revenda, etc.)
- Conteúdo: `DataTableBI` com paginação client-side; colunas conforme especificação. Currency: `vl_bruto`, `vl_impostos`, `vl_liquido`, `vl_devolucao`. Número: `qtd_produtos`.
- Estados: `LoadingState`, `ErrorState` ("Não foi possível carregar os dados do drill"), `EmptyState` quando vazio.
- Botão exportar CSV no header do drawer (opcional, simples).

### 5. UX visual

- Cores mantidas via `UNIDADE_STYLE`: GENIUS laranja (`--warning`), ESTRUTURAL ZORTEA azul (`--primary`), CONSOLIDADO cinza/roxo (`--muted-foreground`).
- Tooltip global "Clique para detalhar" via prop nativa `title` ou wrapper `<TooltipProvider>` nas áreas clicáveis.
- Cursor pointer em todos os elementos drilláveis.

### 6. Fora de escopo

- Não alterar endpoints existentes (apenas consumir o novo `/api/bi/comercial/detalhes`).
- Não mexer em outras telas BI.
- Não persistir filtros de drill (estado em memória só).
- `PageDataProvider` continua expondo séries — mas os widgets do usuário não recebem cliques de drill nesta iteração.

### Arquivos afetados

- **Novo**: `src/lib/bi/comercialFilters.ts` (hook + tipos + helpers).
- **Editado**: `src/lib/bi/comercialApi.ts` (novo fetcher detalhes; aceitar filtros de drill nos demais).
- **Editado**: `src/pages/bi/ComercialPage.tsx` (breadcrumb, cliques, drawer, KPIs clicáveis).
- **Editado** (mínimo, adicionar `onItemClick`): `src/components/bi/charts/ComboChartCard.tsx`, `src/components/bi/charts/DonutChartCard.tsx` / `PieChartCard.tsx`, `src/components/bi/charts/BrazilMapCard.tsx`. Sem quebrar consumidores existentes.

### Critério de aceite

- Clicar em qualquer gráfico/tabela aplica filtro e recarrega todos os blocos com o filtro novo.
- Breadcrumb mostra trilha tipo `GENIUS > 202603 > SC > PEÇAS` com X individual e botão **Limpar Drill**.
- Cards KPI abrem o drawer com colunas e dados corretos, respeitando filtros ativos.
- "Limpar Drill" preserva `anomes_ini`, `anomes_fim`, `unidade_negocio`.
- Falha de API mostra "Não foi possível carregar os dados do drill" e botão **Tentar novamente**.
- Funciona nas três unidades (GENIUS, ESTRUTURAL ZORTEA, CONSOLIDADO) com paleta correta.
