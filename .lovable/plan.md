# Plano — Módulo Contabilidade → Balanço Patrimonial

## Objetivo
Criar tela `/contabilidade/balanco` consumindo `GET /api/contabilidade/balanco` (e export `/api/export/contabilidade/balanco`) com filtros, KPIs analíticos no topo e tabela paginada com export Excel. Adicionar item no menu lateral e na lista de permissões por tela.

## Arquivos a criar / alterar

### 1. `src/pages/contabilidade/BalancoPatrimonialPage.tsx` (novo)
- Layout com `PageHeader` ("Contabilidade — Balanço Patrimonial").
- `FilterPanel` com:
  - `anomes_ini` / `anomes_fim` (input numérico AAAAMM, default = ano corrente jan→dez)
  - `codigo_empresa`, `codigo_filial` (input numérico opcional)
  - `conta`, `grupo`, `subgrupo` (input texto opcional)
- Botão "Pesquisar" dispara fetch via `api.get('/api/contabilidade/balanco', { params })` com `pagina` / `por_pagina` (default 100).
- `ExportButton` apontando para `/api/export/contabilidade/balanco` repassando os mesmos filtros.
- `KpiGroup` no topo com cards calculados sobre o conjunto retornado da página atual (e total quando o backend devolver agregados):
  - Total Ativo (sum saldo onde grupo ILIKE '%ATIVO%')
  - Total Passivo (sum saldo onde grupo ILIKE '%PASSIVO%')
  - Patrimônio Líquido (sum saldo onde grupo ILIKE '%PATRIM%')
  - Qtde de contas distintas
  - Observação no card: "valores referentes à página/filtro atual" quando paginado.
- `DataTableBI` com colunas: anomes, codigo_empresa, codigo_filial, conta, grupo, subgrupo, saldo (formatado BR, alinhado à direita). Paginação integrada usando `pagina/totalPaginas/totalRegistros` retornados pela API.
- Tratamento de erro padrão via `toast` quando backend offline (mesma mensagem dos outros módulos).

### 2. `src/lib/api.ts`
- Adicionar tipos `BalancoPatrimonialItem` e `BalancoPatrimonialResposta` e função `getBalancoPatrimonial(params)` retornando `{ itens, pagina, total_paginas, total_registros }`.
- Função auxiliar `getBalancoColunas()` chamando `/api/contabilidade/balanco/colunas` (útil para debug; pode ser exposto como botão "Ver colunas da view" apenas para admin — opcional, não incluído no MVP).

### 3. `src/App.tsx`
- Importar `BalancoPatrimonialPage`.
- Adicionar `<Route path="/contabilidade/balanco" element={<ProtectedRoute path="/contabilidade/balanco"><BalancoPatrimonialPage /></ProtectedRoute>} />`.

### 4. `src/components/AppSidebar.tsx`
- Adicionar entrada no array `modules` antes de "Configurações":
  ```ts
  { title: 'Contabilidade — Balanço', url: '/contabilidade/balanco', icon: Landmark },
  ```
  (usa o ícone `Landmark` já importado; se preferir distinguir de Contas a Pagar, troco por `BookOpen` ou `Scale`.)

### 5. `src/lib/screenCatalog.ts`
- Acrescentar em `EXACT`:
  ```ts
  '/contabilidade/balanco': { codigo: 'CONT_BAL', nome: 'Contabilidade — Balanço Patrimonial' },
  ```
- Adicionar entrada `PREFIX` para `/contabilidade` agrupando logs futuros.

### 6. `src/pages/ConfiguracoesPage.tsx`
- Adicionar em `AVAILABLE_SCREENS`:
  ```ts
  { path: '/contabilidade/balanco', name: 'Contabilidade — Balanço Patrimonial' },
  ```
  posicionado logo após "Contas a Receber".

## Não incluído neste MVP
- Aba de Conciliação Comercial × Contábil (`/api/contabilidade/conciliacao-comercial-contabil`) — fica para próxima iteração quando você pedir.
- Endpoint de diagnóstico `/balanco/colunas` não recebe UI dedicada (pode ser chamado via DevTools se precisar validar).
- Nenhuma mudança no backend FastAPI, no Lovable Cloud, ou em tabelas `bi_*` — frontend consome direto a API publicada.
- Sem drill-down/gráficos avançados; só KPIs simples + tabela. Posso evoluir para gráficos (Treemap por grupo, barras por mês) quando você confirmar formato dos dados retornados.

## Pré-requisito de teste
Antes de validar a tela, rodar `GET /api/contabilidade/balanco/colunas` no backend e confirmar que os nomes `anomes, codigo_empresa, codigo_filial, conta, grupo, subgrupo, saldo` batem com a view. Se divergirem, ajusto as `Column` no `DataTableBI` e os agregadores dos KPIs em uma rodada rápida.
