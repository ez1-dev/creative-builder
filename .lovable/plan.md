# Demonstrativo de Compras e Recebimentos — Refatoração

A tela já existe (`src/pages/DemonstrativoComprasRecebimentosPage.tsx`). O backend evoluiu: novos parâmetros, novos níveis de drill, bloco `graficos`, `kpis_dashboard`, novas colunas em `drill` e `detalhe`, e novos campos no schema do detalhe. Vou alinhar o frontend a esse contrato sem remover Painel de Compras nem Recebimento.

## Escopo

1. Atualizar tipos da resposta e do request.
2. Trocar inputs livres por autocompletes ERP em Fornecedor, Centro de Custo, Depósito e Transação (reusando `AutocompleteAsync` + `useCadastrosErp` já criados).
3. Acrescentar filtros novos: Depósito, Família, Origem material, Documento, Nº OC, Nº NF, Tipo de item (Produto/Serviço), Nível do drill.
4. Substituir gráficos atuais pelos do bloco `graficos` retornado pela API.
5. Atualizar KPIs para usar exclusivamente `kpis` da API (7 cards exigidos).
6. Drill-down passa a usar fluxo: `projeto_macro → numero_projeto → centro_custo → tipo_despesa → fornecedor → documento → item` (a transição preenche o filtro correspondente e troca o nível). Adicionar botão "Voltar nível".
7. "Ver detalhe": toggle que chama API com `incluir_detalhe=true&limite_detalhe=500`. Quando vier `detalhe`, mostrar grid com todas as colunas do schema novo.
8. Estados loading/erro/vazio padronizados (componentes BI `LoadingState`, `ErrorState`, `EmptyState`).
9. Service `getDemonstrativoComprasRecebimentos(params)` em `src/lib/api.ts`.

## Detalhes técnicos

### `src/lib/api.ts`
Adicionar interfaces:
- `DemonstrativoFilters` com todos os params listados.
- `DemonstrativoKpis`, `DemonstrativoGraficos` (com cada série tipada como `{ chave, label, valor_comprado, valor_recebido, valor_pendente }[]` e `por_mes` com `mes`), `DemonstrativoDrillRow` (chave, label, valor_comprado, valor_recebido, valor_pendente, diferenca_comprado_recebido, qtd_linhas, qtd_fornecedores, qtd_documentos), `DemonstrativoDetalheRow` (campos do passo 14).
- `DemonstrativoResposta` com `atualizado_em, kpis, kpis_dashboard?, graficos, drill, nivel, proximo_nivel?, detalhe, filtros_aplicados, observacao`.
- `getDemonstrativoComprasRecebimentos(params)` chamando `api.get('/api/demonstrativo-compras-recebimentos', clean(params))`.

### `src/pages/DemonstrativoComprasRecebimentosPage.tsx`
- Substituir 3 abas (COMPRAS / RECEBIMENTOS / TODOS) por **um único contexto** controlado por filtro `origem` (mantendo Tabs apenas como atalho visual para alternar). Reaproveitar lógica `stack/currentNivel` já existente.
- `NIVEL_ORDER` passa a incluir `transacao` e `deposito` no enum (mas o fluxo padrão do drill segue a sequência do passo 10).
- Adaptar `mergeFiltersWithStack` para gravar a chave no campo certo (`projeto_macro` quando nível `projeto_macro`, etc.).
- Trocar 4 inputs/combos por `<AutocompleteAsync>` com fetchers de `useCadastrosErp` (Fornecedor, CC, Depósito, Transação). Para Família, Origem material, Documento, Nº OC, Nº NF, Descrição: inputs texto. Tipo de item: `Select` (Todos/Produto/Serviço). Nível: `Select` com os 10 níveis.
- KPIs: grid 7 cards (`KpiGrid cols={7}` da lib BI) usando `kpis` direto. Sem cálculos no frontend.
- Gráficos (lib `@/components/bi/charts`):
  - `BarChartCard` Comprado x Recebido x Pendente (a partir de `graficos.comprado_recebido_pendente`).
  - `LineChartCard` `graficos.por_mes`.
  - `PieChartCard` `graficos.por_tipo_despesa`.
  - `BarChartCard` horizontal `graficos.por_fornecedor` (top N).
  - `BarChartCard` horizontal `graficos.por_centro_custo`.
  - `BarChartCard` `graficos.por_projeto_macro`.
- Tabela drill: colunas conforme passo 9 (chave, label, valor_comprado, valor_recebido, valor_pendente, diferenca_comprado_recebido, qtd_linhas, qtd_fornecedores, qtd_documentos). Linha clicável dispara `handleDrillClick`.
- Botão "Voltar nível" (desabilitado quando stack vazio) e "Limpar filtros" (mantém data_ini, data_fim, origem=TODOS).
- Toggle "Ver detalhe" → re-fetch com `incluir_detalhe=true&limite_detalhe=500`.
- Grid de detalhe usa `DataTableBI` com todas as colunas do passo 14, valores monetários via `formatCurrency`.
- Loading/erro/vazio: `LoadingState`/`ErrorState`/`NoDataState` da lib BI; toast já existente para erro de rede.
- Remover `useFornecedores`, `BiAutoSlots` e helpers locais agora obsoletos.

### Não muda
- Roteamento, sidebar, permissões (a tela já está cadastrada).
- Painel de Compras, Recebimento e demais módulos.
- `ExportButton` segue apontando para `/api/export/demonstrativo-compras-recebimentos` com os params atuais.

### Fora de escopo
- Implementação dos endpoints `/api/cadastros/*` (assumidos já existentes; o autocomplete degrada para vazio quando 404/500).
- Persistência de preferências de filtro / layout do dashboard.

## Arquivos afetados
- `src/lib/api.ts` (acrescentar tipos + função).
- `src/pages/DemonstrativoComprasRecebimentosPage.tsx` (refatoração principal).
- `docs/backend-demonstrativo-compras-recebimentos.md` (atualizar contrato — novos params e novo shape de resposta).
