## Evolução do Painel de Compras

Mantendo o `src/pages/PainelComprasPage.tsx` atual (não removo nada — todos os KPIs, gráficos e a "Lista Detalhada" continuam funcionando), vou **adicionar** uma nova aba "Drill-down Gerencial" e ampliar filtros, KPIs e colunas para atender a análise por Projeto Macro / Projeto / CC / Tipo de Despesa / Mês / Fornecedor / OC / Item.

### Arquivos

**Novo:**
- `src/lib/comprasClassificacao.ts` — funções puras `getProjetoMacro(row)` e `getTipoDespesa(row)`. Usam `row.projeto_macro` / `row.tipo_despesa` quando vierem da API; caso contrário aplicam regras provisórias:
  - Projeto macro: nome do projeto contendo `GENIUS|GENI` → Genius, `ESTRUT` → Estrutural, senão Outros.
  - Tipo de despesa: `tipo_item === 'SERVICO'|'S'` → Serviços; `origem_material/familia` em lista de matéria-prima → Matéria-prima; descrição contendo `EPI|FERRAMENTA|BROCA|DISCO|LIXA|MANUTEN|CONSUMO` → Uso e consumo; senão Despesas gerais.
- `src/components/compras/PainelDrillView.tsx` — componente que recebe `dados: any[]`, mantém `stack: CrumbStep[]`, monta breadcrumb + tabela agregada do nível atual; níveis fixos `projeto_macro → numero_projeto → centro_custo → tipo_despesa → mes_competencia → fornecedor → numero_oc → item`. Cada linha mostra Comprado, Pendente, Qtd OCs, Qtd itens. Botões "Voltar nível" e "Limpar drill".

**Alterar:**
- `src/pages/PainelComprasPage.tsx`:
  - **Filtros novos** no `FilterPanel` (campos opcionais; só são enviados ao backend quando preenchidos):
    - `projeto_macro` (Select: Todos/Genius/Estrutural/Outros) — também aplicado client-side via `getProjetoMacro` para compatibilidade.
    - `tipo_despesa` (Select: Todos/Matéria-prima/Uso e consumo/Despesas gerais/Serviços) — idem, client-side via `getTipoDespesa`.
    - `mes_competencia` (Input `YYYY-MM`).
    - `condicao_pagamento` (Input texto).
  - **Pré-processamento** dos `data.dados`: enriquecer cada linha com `projeto_macro` e `tipo_despesa_calc` antes de alimentar tabela/charts/drill (memoizado).
  - **Filtragem client-side** adicional por `projeto_macro` e `tipo_despesa` aplicada sobre `dadosEnriquecidos` antes de montar gráficos/drill (garante que filtros funcionem mesmo se backend ainda não suportar).
  - **Novo grupo de KPIs "Visão Gerencial"** (sem remover os atuais): Total comprado (`valor_liquido_total`), Total pendente (`valor_pendente_total`), Total recebido (placeholder vindo de `kpis.valor_recebido_total` — mostra `--` se ausente), Qtd OCs, Qtd itens, Qtd fornecedores, Ticket médio/OC (`valor_liquido_total / total_ocs`), Maior fornecedor (top de `chartData.top_fornecedores`).
  - **Colunas novas na tabela** (entre as atuais, sem quebrar): Projeto macro, Mês (derivado de `data_emissao` `YYYY-MM`), Tipo de despesa, Condição pagto (`condicao_pagamento` + `descricao_condicao_pagamento`).
  - **Nova aba** "Drill-down Gerencial" entre "Dashboard" e "Lista Detalhada", renderizando `<PainelDrillView dados={dadosFiltradosEnriquecidos} />`.
  - **Gráficos novos** dentro do "Dashboard" (após os atuais, respeitando `dadosFiltradosEnriquecidos`):
    - Compras por mês (BarChart sobre `data_emissao` agrupado por `YYYY-MM`).
    - Compras por tipo de despesa (Pie sobre `tipo_despesa_calc`).
    - Compras por centro de custo (BarChart vertical top 10).
    - Compras por projeto (BarChart vertical top 10).
    - Top 10 fornecedores por valor comprado já existe — mantido.
  - **Export**: incluir os novos filtros (`projeto_macro`, `tipo_despesa`, `mes_competencia`, `condicao_pagamento`) em `exportParams` e na chamada `search` (params enviados ao backend para quando ele suportar; client-side já filtra para a UI).

### Drill-down (na nova aba)

Estado local ao componente `PainelDrillView`:
- `nivelOrder = ['projeto_macro','numero_projeto','centro_custo','tipo_despesa','mes_competencia','fornecedor','numero_oc','codigo_item']`
- `stack: { nivel, chave, label }[]` controla o caminho.
- Para cada nível, agrupa `dadosFiltrados` pela chave do nível e calcula totais.
- Clicar uma linha → push step + avança para o próximo nível.
- Breadcrumb: `Início > Genius > Projeto 663 > CC 1201 > ...` (cada item clicável → corta o stack até aquele índice).
- Botão **Voltar nível** (pop) e **Limpar drill** (zera stack).

### Estados

Loading/erro/vazio já são tratados pelo `search()` atual. Mantenho `ErpConnectionAlert`, toasts e `DataTable` com `emptyMessage`.

### Regras importantes mantidas

- Não removo nada do que já existe (KPIs, gráficos, lista, paginação, multi-situação, "Mostrar valor total OC").
- Sem dados mockados — tudo deriva de `data.dados` retornado por `/api/painel-compras`.
- Filtros novos `projeto_macro`/`tipo_despesa`/`mes_competencia`/`condicao_pagamento` são enviados ao backend (só quando preenchidos) **e** aplicados no client para garantir que funcionem antes do backend implementar.
- Padrão visual: tokens semânticos do design system (sem cores hardcoded), `KPICard`, `DataTable`, `FilterPanel`, `Tabs`, `recharts` — mesma stack já usada na página.
- Responsivo: KPIs `grid-cols-2 md:grid-cols-4 xl:grid-cols-6`; gráficos `lg:grid-cols-2 xl:grid-cols-3` (já é o padrão).

### Documentação
- `docs/backend-painel-compras-gerencial.md` — descreve os campos extras esperados no payload (`projeto_macro`, `tipo_despesa`, `mes_competencia`, `condicao_pagamento`, `descricao_condicao_pagamento`, `valor_recebido_total`) para o time de backend evoluir o endpoint.
