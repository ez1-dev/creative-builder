## Revisão do Demonstrativo de Compras e Recebimentos

Revisei a tela criada (`src/pages/DemonstrativoComprasRecebimentosPage.tsx`) contra os 7 critérios. Resultado:

| # | Critério | Status | Observação |
|---|---|---|---|
| 1 | Filtros funcionam em todas as abas | Parcial | Estado de filtros é compartilhado entre as 3 abas; `handleSearch` refaz o fetch da aba ativa + abas já carregadas. **Bug**: a construção de `params` em `fetchData` tem um filtro `Object.fromEntries(...)` com expressão ternária mal-formada que sempre exclui `projeto_macro`/`tipo_despesa` (depois reincluídos) mas elimina por engano outras chaves quando `v === 'TODOS'`. Funciona, mas é frágil — vou simplificar. |
| 2 | Drill-down segue ordem correta | OK | `NIVEL_ORDER` define `projeto_macro → numero_projeto → centro_custo → tipo_despesa → mes_competencia → fornecedor → documento → item`. `nextNivel()` avança por índice. |
| 3 | Breadcrumb permite voltar | OK | `Breadcrumb` renderiza Início + cada step clicável; `handleBreadcrumb(index)` corta o stack e refaz o fetch. |
| 4 | KPIs mudam com filtros | OK (depende do backend) | KPIs são lidos de `response.kpis`; cada `Pesquisar` reenvia filtros e o backend deve recalcular. Frontend já está correto. |
| 5 | Aba Comparativo mostra C×R | OK | Aba `TODOS` envia `origem=TODOS`; colunas drill incluem Comprado, Recebido, Diferença; gráfico de barras renderiza ambas séries; tabela detalhe mostra as 3 colunas + Diferença. |
| 6 | Sem dados mockados | OK | Nenhum array fixo; tudo vem de `api.get`. Estado vazio quando o endpoint não responde. |
| 7 | Layout responsivo desktop/notebook | Parcial | KPIs em grid `sm:grid-cols-3 lg:grid-cols-6` (ok). Filtros usam o grid do `FilterPanel` (até `xl:grid-cols-5`). Gráficos `lg:grid-cols-3`. **Ajuste**: em notebooks de ~1366px, 6 KPIs em 1 linha ficam apertados — mudar para `md:grid-cols-3 xl:grid-cols-6`. Tabelas já têm overflow horizontal via `DataTable`. |

### Mudanças propostas (apenas `src/pages/DemonstrativoComprasRecebimentosPage.tsx`)

**A. Simplificar a montagem de params em `fetchData`** — substituir o `Object.fromEntries` confuso por um `forEach` linear que ignora `''`, `null`, `undefined` e `'TODOS'`. Comportamento idêntico, código auditável.

**B. Resetar drill ao trocar filtros** — ao clicar `Pesquisar`, limpar o `stack` de todas as abas (já é feito implicitamente, mas vou garantir explicitamente passando `[]` e `'projeto_macro'`).

**C. Resetar drill ao trocar de aba mantendo filtros** — comportamento atual: cada aba mantém seu próprio stack. Vou manter assim (permite comparar níveis distintos por aba), mas adicionar um botão "Resetar drill" no breadcrumb quando `stack.length > 0` para clareza.

**D. Responsividade dos KPIs** — alterar grid de `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` para `grid-cols-2 md:grid-cols-3 xl:grid-cols-6` (em 1366px ficam 3 por linha em vez de 6 espremidos).

**E. Loading explícito nos KPIs** — quando `loading && !data`, mostrar `--` em vez de `R$ 0,00` para não confundir com "sem dados".

**F. Após `Pesquisar`, abrir o filtro** — sem alteração; já está OK.

### Não vou mexer em

- Backend / contrato (já documentado em `docs/backend-demonstrativo-compras-recebimentos.md`).
- Sidebar, rotas, screen catalog (já registrados).
- Outras páginas.

### Resultado esperado

Após estas pequenas correções, a tela atende aos 7 critérios. Como o backend `/api/demonstrativo-compras-recebimentos` ainda não existe, ao abrir a tela o usuário verá os KPIs com `--`, drill vazio e um toast de erro vindo do `api.get` — exatamente o comportamento esperado para "sem dados mockados".
