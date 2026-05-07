## Revisão final do Painel de Compras

Validei os 10 pontos no código atual (`src/pages/PainelComprasPage.tsx`, `src/components/compras/PainelDrillView.tsx`, `src/lib/comprasClassificacao.ts`). Resultado:

| # | Critério | Status | Ação |
|---|----------|--------|------|
| 1 | Filtros alteram KPIs/gráficos/tabela | **Parcial** | Os novos filtros (`projeto_macro`, `tipo_despesa`, `mes_competencia`, `condicao_pagamento`) só afetam **Visão Gerencial**, **Análise Gerencial** e **Drill**. KPIs antigos, gráficos antigos e Lista Detalhada ainda leem `data.dados` cru — precisa passar `dadosFiltrados`. |
| 2 | Ordem do drill | OK | `NIVEIS` em `PainelDrillView.tsx` já segue Projeto Macro → Projeto → CC → Tipo Despesa → Mês → Fornecedor → OC → Item. |
| 3 | Breadcrumb volta níveis | OK | `goTo(idx)` corta o stack até o índice clicado; "Voltar nível" e "Limpar drill" funcionam. |
| 4 | Limpar filtros não apaga drill indevidamente | **Falha** | `clearFilters` chama `setData(null)` → o `<PainelDrillView>` desmonta e perde o stack. Precisa **não** zerar `data` (manter resultado atual) ou — preferível — manter o comportamento atual mas remontar uma busca quando o usuário clicar em "Pesquisar". Solução: remover `setData(null)` do `clearFilters`; o usuário aciona "Pesquisar" depois. |
| 5 | Limpar drill não apaga filtros | OK | `setStack([])` no `PainelDrillView` é estado isolado; não toca em `filters`. |
| 6 | Tabela mostra Cond. Pagto / Tipo Despesa / Projeto Macro | **Falha** | `baseColumns` não inclui essas colunas. Adicionar. |
| 7 | Sem dados mockados | OK | Tudo deriva de `api.get('/api/painel-compras')`. |
| 8 | Export respeita filtros | OK | `exportParams` (linhas 430-449) inclui `projeto_macro`, `tipo_despesa`, `mes_competencia`, `condicao_pagamento` (já adicionados). |
| 9 | Layout responsivo | OK | KPIs `grid-cols-2 md:grid-cols-4 xl:grid-cols-8`; gráficos `lg:grid-cols-2 xl:grid-cols-3`. |
| 10 | Não perdeu funcionalidades | OK | Todos os filtros, KPIs, gráficos, paginação, multi-situação e checkbox "Mostrar valor total OC" continuam. |

### Alterações propostas (somente `src/pages/PainelComprasPage.tsx`)

**A. Tabela (item 6) — `baseColumns`:**
Adicionar antes de `Nº OC` as colunas:
- `projeto_macro` ("Projeto Macro")
- `numero_projeto` ("Projeto")
- `centro_custo` ("Centro Custo")
- `tipo_despesa_calc` ("Tipo de Despesa")
- `mes_competencia_calc` ("Mês")

E após `fantasia_fornecedor`:
- `condicao_pagamento` ("Cond. Pagto") com render `cod - descricao_condicao_pagamento`.

**B. Lista Detalhada usa dados enriquecidos+filtrados (item 1):**
Trocar `<DataTable ... data={data.dados} />` por `data={dadosFiltrados}` (já memoizado, contém `projeto_macro` / `tipo_despesa_calc` / `mes_competencia_calc` para as novas colunas funcionarem).

**C. KPIs antigos e gráficos antigos respeitam novos filtros (item 1):**
- `kpis` (useMemo): trocar a fonte do fallback de `data.dados` para `dadosFiltrados` para que totais somem o conjunto filtrado quando os novos filtros estiverem ativos. Manter prioridade `totais > resumo > fallback` (totais do backend continuam ganhando se vierem).
- `chartData` (useMemo): se `data?.graficos` existir e algum dos novos filtros estiver ativo (`projeto_macro`/`tipo_despesa`/`mes_competencia`/`condicao_pagamento` ≠ vazio/'TODOS'), recomputar a partir de `dadosFiltrados` em vez de usar `data.graficos` (porque o backend ainda não conhece esses filtros). Caso contrário, manter o comportamento atual.

**D. `clearFilters` (item 4):**
Remover `setData(null); setPagina(1);` do final. Apenas zera o objeto `filters`. Se o usuário quiser refazer a busca, clica em "Pesquisar". Isso preserva o drill aberto na aba Drill-down (que vive em `dadosFiltrados`/`data`).

**E. Botão "Limpar Filtros Gerenciais" no `FilterPanel` (UX, item 4 e 5):**
Adicionar um pequeno botão `ghost` ao lado dos novos filtros que reseta apenas `projeto_macro`, `tipo_despesa`, `mes_competencia`, `condicao_pagamento` para deixar claro a separação dos novos filtros do drill.

### Validação após mudanças

Após editar, rodo `bunx tsc --noEmit` para garantir build limpa. Não há mudança de banco nem de configuração.
