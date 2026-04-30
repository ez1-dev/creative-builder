## Objetivo

Adicionar um **modo de edição de layout** em `/passagens-aereas` onde admins podem **arrastar e redimensionar** todos os blocos do dashboard (KPIs, gráficos, mapa, tabela). O layout salvo é **global** — vale para todos os usuários autenticados E também para o link público compartilhado.

## Decisões (já confirmadas)

- **Quem edita**: apenas admins (`is_admin(auth.uid())`).
- **Escopo**: tudo é arrastável/redimensionável — 4 KPIs, mapa de destinos, 3 gráficos e a tabela de Registros (8 blocos).
- **Mobile**: em telas <1024px o layout customizado é ignorado e o empilhamento responsivo atual continua valendo (mais robusto).

## Arquitetura

### 1. Persistência (Lovable Cloud)

Reusa as tabelas `dashboards` e `dashboard_widgets` que já existem no banco mas ainda não estão em uso. Não é preciso criar tabelas novas — só uma linha:

- 1 linha em `dashboards` com `module='passagens-aereas'`, `owner_id = NULL`, `is_default = true`. As RLS já permitem que admins escrevam e que **qualquer um leia** (incluindo a página pública via RPC nova).
- 8 linhas em `dashboard_widgets` (uma por bloco) com `dashboard_id` apontando para a linha acima, `type` = identificador do bloco (`kpi-total`, `kpi-registros`, `kpi-colaboradores`, `kpi-ticket`, `mapa-destinos`, `chart-evolucao`, `chart-motivo`, `chart-cc`, `tabela-registros`), e `layout` = `{ x, y, w, h }` em coordenadas de grid.

Vantagens: tabela já modelada, RLS já no padrão certo (admin escreve, todos leem), zero migration.

### 2. RPC pública para leitura via token

Criar `get_passagens_layout_via_token(_token text)` SECURITY DEFINER que:
- valida o token via `validate_share_token(_token)`;
- retorna `dashboard_widgets` + `dashboards` da linha `module='passagens-aereas' AND owner_id IS NULL`.

Isso permite a página `/passagens-aereas/compartilhado` carregar o mesmo layout salvo sem exigir auth.

### 3. Biblioteca de drag/resize

Usar **`react-grid-layout`** (`react-grid-layout` + `react-resizable`):
- maduro, suporta drag, resize e responsividade nativa (`WidthProvider`, `Responsive`);
- já tem `onLayoutChange` para persistir;
- handles de resize nos cantos.

Adicionar via `bun add react-grid-layout @types/react-grid-layout` e importar o CSS dele uma única vez em `src/index.css`.

### 4. Componente novo: `PassagensLayoutGrid`

Substitui o JSX hardcoded de blocos no `PassagensDashboard.tsx` por um `<GridLayout>` que recebe:
- `widgets`: array de 8 itens com `id`, `type`, `layout`.
- `editable`: `boolean` (true só quando o admin entra no modo edição).
- `onLayoutChange`: callback que persiste em `dashboard_widgets`.

Cada `type` é mapeado para um componente já extraído do JSX atual:
- `kpi-total` → `<KPICard ...>` Total Geral
- `kpi-registros` → KPI Registros + Select de agrupamento
- `kpi-colaboradores` → `<KPICard ...>` Colaboradores
- `kpi-ticket` → `<KPICard ...>` Ticket Médio
- `mapa-destinos` → `<MapaDestinosCard ...>` (já existe)
- `chart-evolucao` → BarChart Evolução Mensal
- `chart-motivo` → PieChart Por Motivo
- `chart-cc` → BarChart Top Centros de Custo
- `tabela-registros` → Card Registros (com filtros, paginação, export)

Os 4 primeiros blocos hoje já são `KPICard` independentes; os demais são extraídos para sub-componentes em `src/components/passagens/blocks/` para manter o `PassagensDashboard` limpo.

### 5. Modo edição (UI)

Botão **"Editar layout"** (visível só para admins, ao lado do "Compartilhar") alterna `editing`:
- `editing=false` (padrão): grid em modo "estático", sem handles, comportamento idêntico ao atual.
- `editing=true`: handles de drag/resize aparecem, fundo do bloco fica destacado (`ring-2 ring-primary/40`), aparece toolbar fixa no topo com **Salvar** / **Cancelar** / **Resetar para o padrão**.

Em <1024px o botão fica desabilitado com tooltip "Edite o layout em uma tela maior".

### 6. Layout default + seed

Na primeira vez que o admin abrir, se não existir linha em `dashboards` para o módulo, cria automaticamente o registro padrão com layout pré-definido (espelha o layout atual: KPIs em linha, mapa full-width, 2 gráficos lado a lado, top CC full-width, tabela full-width).

Botão "Resetar" deleta os widgets e re-cria a partir do default.

## Fluxo

```text
[admin em /passagens-aereas]
  -> clica "Editar layout"
  -> arrasta/redimensiona blocos no grid
  -> clica "Salvar"
  -> upsert em dashboard_widgets (1 update por bloco com layout JSONB)
  -> recarrega → todos os outros usuários (incl. /compartilhado) veem o novo layout

[usuário comum / link público]
  -> /passagens-aereas (logado) lê a linha default via select
  -> /passagens-aereas/compartilhado lê via RPC get_passagens_layout_via_token
  -> renderiza o mesmo grid em modo readonly
```

## Mudanças por arquivo

**Migration** (`supabase/migrations/...`)
- Cria função `get_passagens_layout_via_token(_token text)` SECURITY DEFINER que retorna widgets do dashboard default do módulo `passagens-aereas`.

**Pacotes**
- `bun add react-grid-layout @types/react-grid-layout`
- Importar `react-grid-layout/css/styles.css` e `react-resizable/css/styles.css` em `src/index.css`.

**Novos arquivos**
- `src/hooks/usePassagensLayout.ts` — carrega layout do banco (autenticado: select direto; público: via RPC), expõe `widgets`, `saveLayout`, `resetToDefault`, `loading`.
- `src/components/passagens/PassagensLayoutGrid.tsx` — wrapper do `<GridLayout>` que renderiza os blocos, controla edit/readonly e cross-filters.
- `src/components/passagens/blocks/KpiTotal.tsx`, `KpiRegistros.tsx`, `KpiColaboradores.tsx`, `KpiTicket.tsx`, `ChartEvolucao.tsx`, `ChartMotivo.tsx`, `ChartCentroCusto.tsx`, `TabelaRegistros.tsx` — extração dos blocos atuais.
- `src/components/passagens/passagensLayoutDefault.ts` — definição do layout padrão (8 widgets com x/y/w/h em grid de 12 colunas).

**Arquivos editados**
- `src/components/passagens/PassagensDashboard.tsx` — substitui o JSX dos blocos pelo `<PassagensLayoutGrid>`. Mantém estado de filtros/cross-filter no topo e injeta como props nos blocos. Adiciona botão "Editar layout" e toolbar de edição (só admin, só ≥1024px).
- `src/pages/PassagensAereasCompartilhadoPage.tsx` — passa `readOnlyLayout` para o dashboard (já é `readOnly=true`, basta o hook usar a RPC pública quando não houver sessão).
- `src/index.css` — imports dos CSS do react-grid-layout.

## Detalhes técnicos

- **Coordenadas**: grid de 12 colunas, altura de linha 60px. KPIs ocupam `w=3, h=2`; gráficos `w=6, h=5`; tabela `w=12, h=8`.
- **Persistência**: ao final do drag (`onLayoutChange` + debounce 800ms ou no clique de "Salvar"), faz `upsert` em `dashboard_widgets` para cada item alterado.
- **Cross-filters**: continuam funcionando porque o estado `selectedMes/selectedMotivo/selectedCC/selectedDestino` permanece no `PassagensDashboard` pai e é passado por props.
- **Mobile fallback**: `usePassagensLayout` retorna `widgets` mesmo em mobile, mas `PassagensLayoutGrid` detecta `window.innerWidth < 1024` e renderiza os blocos em **fluxo vertical** (ignorando layout salvo), na ordem `position` da tabela.
- **Permissão**: o botão "Editar layout" e o save só aparecem/funcionam se `useUserVisuals().isAdmin === true`. As RLS já barram quem não é admin.
- **Memória**: ao final, atualizar `mem://features/passagens-aereas` para registrar que o layout do dashboard agora é editável e global, persistido em `dashboards`/`dashboard_widgets`.

## Riscos e mitigações

- **Refatoração grande do `PassagensDashboard.tsx` (1237 linhas)**: extrair em sub-componentes pequenos um a um, mantendo nomes de props equivalentes. Testar cada bloco no preview antes de seguir.
- **`react-grid-layout` precisa de altura conhecida**: usar `WidthProvider` e `autoSize=true` resolve.
- **Dois admins editando ao mesmo tempo**: o último a salvar vence (sem locking). Aceitável para o caso de uso.

## Resumo do entregável

Após este trabalho, qualquer admin poderá entrar no `/passagens-aereas`, clicar em "Editar layout", arrastar/redimensionar livremente todos os 8 blocos, clicar em "Salvar", e a nova organização será vista por **todos os usuários** (logados ou via link público) imediatamente.
