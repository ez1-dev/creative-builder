## Diagnóstico

Investiguei o código (`ApplyComponentButton`, `ApplyComponentDialog`, `UserWidgetsSlot`, `PageDataContext`, `componentRegistry`, integrações em `PainelComprasPage`, `NotasRecebimentoPage`, `ProducaoDashboardPage`, `BiComponentsDemoPage`) e a tabela `bi_user_widgets` (0 registros). A engrenagem existe e o dialog/insert/RLS estão corretos, mas há **4 razões reais** para parecer "não funcionar":

1. **Botões "Aplicar" escondidos no hover** — em `BiComponentsDemoPage.tsx`, o componente `WithApply` envolve quase todos os gráficos com `opacity-0 group-hover/apply:opacity-100`. O usuário não vê o botão até passar o mouse exatamente sobre o card. Em telas touch nem aparece.
2. **Cobertura incompleta** — apenas alguns blocos têm `applyId`/`WithApply`. Tabelas, mapas, hierarquia, vários KPIs e charts não têm botão nenhum.
3. **Sem feedback no estado vazio** — `UserWidgetsSlot` está com `emptyHint={false}` em todas as páginas piloto. Quando nenhum widget existe (caso atual: tabela vazia) **nada aparece**, então o usuário acha que "não funcionou" mesmo após salvar.
4. **Erro silencioso de autenticação** — `createUserWidget` lança "Não autenticado" se a sessão expirou, mas o usuário hoje está em `/login`. O dialog mostra toast de erro mas o botão "Aplicar" no catálogo abre normalmente, dando a impressão que algo deveria acontecer.

## Plano de correção

### 1. Tornar o botão "Aplicar" sempre visível
- `WithApply` (em `BiComponentsDemoPage.tsx`): remover `opacity-0/group-hover` e ancorar o botão como pill no canto superior-direito do card, **sempre visível**, com tamanho discreto (`h-6 text-[10px]`).
- `ApplyComponentButton`: pequeno polish de estilo para combinar (badge azul-soft).

### 2. Cobrir 100% do catálogo
Adicionar `applyId` ou `<WithApply>` em todos os blocos cujo componente já está no `COMPONENT_REGISTRY`:
- KPIs faltantes (`kpi-target`, variantes do `KpiCard`).
- Charts faltantes do registry (sparkline standalone).
- Bloco da tabela `DataTableBI` → `applyId="data-table"`.
- Estender o registry com 4 componentes que já estão no catálogo mas faltam: `stacked-bar`, `combo-chart`, `gauge`, `progress-list` — wrappers simples reaproveitando os componentes existentes da `@/components/bi`.

### 3. Estado vazio útil nas páginas piloto
- `PainelComprasPage`, `NotasRecebimentoPage`, `ProducaoDashboardPage`: trocar `emptyHint={false}` por `emptyHint={true}` apenas no **primeiro slot de cada página** (KPIs), com hint compacto explicando "Vá em Biblioteca BI → clique em Aplicar". Demais slots permanecem ocultos quando vazios.
- Adicionar um banner discreto de "modo personalizado ativo: N widgets" quando houver widgets, com botão "Gerenciar" levando a `/biblioteca-bi`.

### 4. Diagnóstico de autenticação no dialog
- `ApplyComponentDialog`: ler `supabase.auth.getUser()` ao abrir; se não autenticado, mostrar aviso visível ("Faça login para aplicar componentes") e desabilitar o botão Aplicar (ao invés de deixar quebrar no submit).
- `createUserWidget`: já lança erro; deixar a mensagem mais clara ("Sessão expirada — entre novamente").

### 5. Aba "Meus Widgets" no Biblioteca BI
Nova seção no topo de `/biblioteca-bi` mostrando todos os widgets do usuário (lista por página/seção) com botões "Abrir página" e "Remover". Assim o usuário consegue ver imediatamente o que aplicou, mesmo sem navegar para a página alvo.

### 6. Smoke-test pós-implementação
Em modo build, navegar via browser tools para `/biblioteca-bi`, clicar em "Aplicar" num KPI, salvar, abrir `/painel-compras` e screenshot confirmando o widget renderizado.

## Arquivos a editar

- `src/pages/BiComponentsDemoPage.tsx` — `WithApply` sempre visível, cobertura completa, nova seção "Meus Widgets".
- `src/components/bi/runtime/ApplyComponentButton.tsx` — polish visual.
- `src/components/bi/runtime/ApplyComponentDialog.tsx` — checagem de auth + UI de aviso.
- `src/lib/bi/componentRegistry.tsx` — adicionar 4 componentes faltantes.
- `src/pages/PainelComprasPage.tsx`, `src/pages/NotasRecebimentoPage.tsx`, `src/pages/producao/ProducaoDashboardPage.tsx` — `emptyHint` no primeiro slot + banner de gerenciamento.
- `src/hooks/useUserWidgets.ts` — mensagem de erro mais clara.

Sem mudanças de schema (tabela `bi_user_widgets` e RLS já estão corretas).

## Resultado esperado

Depois das mudanças: o botão "Aplicar" fica visível em todos os componentes do catálogo; o dialog avisa se você está deslogado; ao salvar, um toast confirma e a página alvo passa a mostrar o widget no slot correspondente; existe uma tela "Meus Widgets" para gerenciar tudo num lugar só.
