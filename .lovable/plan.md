## Reorganizar disposição dos filtros do Painel de Compras

Hoje o painel mostra ~25 filtros achatados num único grid de 5 colunas, sem qualquer agrupamento — fica difícil escanear, e a linha das checkboxes ("Somente pendentes" / "Mostrar valor total da OC") ficou solta no meio dos campos gerenciais (vide screenshot enviado).

### Solução

Agrupar os filtros em **seções com cabeçalho discreto** (uppercase, tracking, separador) dentro do mesmo `FilterPanel`, mantendo todos os campos atuais, comportamento e estado.

#### Novo componente
- **`src/components/erp/FilterSection.tsx`** — wrapper reutilizável que renderiza um título de seção + grid interno. `col-span-full` para ocupar toda a largura do grid do `FilterPanel`. Configurável (`cols={3|4|5|6}`).

#### Reorganização em `src/pages/PainelComprasPage.tsx`

Ordem das seções (do mais usado/gerencial → operacional → opções):

1. **Visão Gerencial** (5 col) — Projeto Macro, Tipo de Despesa, Mês (YYYY-MM), Cond. Pagamento, Situação da OC
2. **Período** (4 col) — Emissão de, Emissão até, Entrega de, Entrega até
3. **Identificação** (5 col) — Nº OC, Item, Código Produto, Descrição Item, Tipo OC
4. **Entidades & Local** (5 col) — Fornecedor, Projeto, Centro de Custo, Família, Origem, Depósito (vai pra 6 cols nesta seção)
5. **Classificação & Desconto** (4 col) — Tipo Item, Transação, Desconto, Obs./Valor Desconto
6. **Opções** (linha simples) — checkboxes "Somente pendentes" e "Mostrar valor total da OC", separados por divisor para não competir com os campos.

Cada seção usa `<FilterSection title="..." icon={<Lucide />}>` com ícones já importados (`Briefcase`, `Calendar`, `FileText`, `Building2`, `Layers`, `Settings`).

Nenhum estado, handler, validação ou request sofre mudança — só a ordem visual e o agrupamento via wrapper.

### Aplicar o mesmo padrão a `NotasRecebimentoPage`?

Sim, em sequência (mesma técnica), para manter consistência visual entre os dois dashboards principais. Seções: Gerencial / Período / NF / Entidades / Item / Valores.

### Arquivos
- **criar** `src/components/erp/FilterSection.tsx`
- **editar** `src/pages/PainelComprasPage.tsx` (apenas o bloco entre `<FilterPanel ...>` e `</FilterPanel>`)
- **editar** `src/pages/NotasRecebimentoPage.tsx` (mesmo escopo, opcional — confirmo aplicar)

Sem mudanças de comportamento, exportação, drill, KPI, paginação ou backend.
