## Evolução da tela de Notas Fiscais de Recebimento

Mantendo `src/pages/NotasRecebimentoPage.tsx` (sem remover nada — todos os filtros, colunas e KPIs atuais permanecem), adicionar um dashboard gerencial completo com filtros, KPIs, gráficos e drill-down — espelhando o padrão já criado para o Painel de Compras.

### Reuso

- `src/lib/comprasClassificacao.ts` (já existe) — `enrichRow`, `getProjetoMacro`, `getTipoDespesa`, `getMesCompetencia` funcionam para qualquer linha (NF de recebimento usa `data_recebimento`/`data_emissao` no `mes_competencia`). Adiciono opção de origem do mês via fallback `data_recebimento || data_emissao` no `getMesCompetencia` se já não cobrir (já cobre — usa `data_emissao`; ajusto para também aceitar `data_recebimento` como alternativa).

### Novo

- `src/components/recebimento/NotasDrillView.tsx` — análogo ao `PainelDrillView`, mas níveis fixos `projeto_macro → numero_projeto → codigo_centro_custo → tipo_despesa_calc → mes_competencia_calc → nome_fornecedor → numero_nf → codigo_item`. Cada linha mostra Valor Recebido, Qtd NFs, Qtd Itens. Breadcrumb com "Voltar nível" / "Limpar drill" (estado isolado, não toca filtros).

### Alterar `src/pages/NotasRecebimentoPage.tsx`

- **Filtros novos** no `FilterPanel` (opcionais; só vão ao backend quando preenchidos): `projeto_macro` (Select Todos/Genius/Estrutural/Outros), `tipo_despesa` (Select), `mes_competencia` (Input `YYYY-MM`), `condicao_pagamento` (Input texto), `familia` (Input texto). Os existentes (NF, série, fornecedor, OC origem, transação, depósito, datas, etc.) são mantidos.
- **search()**: adicionar dispatch dos novos params + remover quando vazios/`TODOS`.
- **Enrichment + filtragem client-side**: `dadosEnriquecidos = data.dados.map(enrichRow)`; `dadosFiltrados` aplica `projeto_macro`, `tipo_despesa`, `mes_competencia`, `condicao_pagamento` (com fallback a `descricao_condicao_pagamento`).
- **Colunas adicionais** em `columns` (sem remover existentes): Projeto Macro, Tipo de Despesa (`tipo_despesa_calc`), Mês (`mes_competencia_calc`), Cond. Pagto (`condicao_pagamento` + `descricao_condicao_pagamento`), e melhorar `numero_oc_origem` para exibir badge "S/ OC" quando vazio (item 11).
- **KPIs gerenciais** (novo bloco "Visão Gerencial" acima/junto dos atuais — não remove os atuais):
  - Total recebido (Σ `valor_liquido`)
  - Qtd NFs (set `(empresa|filial|nf|serie)`)
  - Qtd itens
  - Qtd fornecedores
  - Valor médio por NF (total / qtd NFs)
  - Maior fornecedor (top1 por valor)
  - Total NFs com OC vinculada × Sem OC (mini-card duplo)
- **Gráficos** (nova seção "Análise Gerencial" — aparece quando há dados):
  - Bar — Recebimentos por mês (`mes_competencia_calc`)
  - Pie — por Tipo de Despesa
  - Bar horizontal — Top 10 fornecedores
  - Bar horizontal — por Centro de Custo (top 10)
  - Bar horizontal — por Projeto (top 10)
  - Bar — por Transação NF (top 10)
- **Tabs** "Lista Detalhada" / "Drill-down Gerencial" — `<NotasDrillView dados={dadosFiltrados} />`. Tabs aparecem só quando `data` carregado.
- **clearFilters**: remover `setData(null); setPagina(1)` para preservar drill aberto (mesmo padrão usado no Painel de Compras).
- **Export**: estender `params` do `<ExportButton>` com os novos filtros.
- **AI page context**: adicionar os novos KPIs ao snapshot.

### Estados

Loading/erro/vazio já tratados via `toast`/`DataTable.emptyMessage`. Sem mocks — tudo deriva de `/api/notas-recebimento`.

### Documentação
- `docs/backend-notas-recebimento-gerencial.md` — campos extras esperados (`projeto_macro`, `tipo_despesa`, `mes_competencia`, `condicao_pagamento`, `descricao_condicao_pagamento`, `nome_projeto`) e parâmetros novos para o backend evoluir.

### Não inclui
- Não removo nenhuma coluna ou filtro existente.
- Não toco no endpoint nem nas tabelas do banco.
- Não altero o design system (uso `KPICard`, `DataTable`, `FilterPanel`, `Tabs`, recharts — mesmas dependências).
