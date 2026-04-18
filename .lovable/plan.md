
## Plano: Modo Árvore de Rateio em Contas a Pagar e Receber

Adicionar um terceiro modo de visualização ("Árvore de rateio") nas telas de Contas a Pagar e Contas a Receber, exibindo cada título como linha pai e seus rateios (centro de custo / projeto) como linhas filhas expansíveis, no estilo da Estrutura Multinível (BOM).

### 1. Camada de tipos e API (`src/lib/api.ts`)

Adicionar tipos e helpers:
- `LinhaArvoreFinanceira` com campos: `tipo_linha` ("TITULO" | "RATEIO"), `id_linha`, `codigo_pai`, `nivel`, `caminho`, `possui_filhos`, `descricao_resumida`, `numero_projeto`, `codigo_fase_projeto`, `codigo_centro_custo`, `descricao_centro_custo`, `percentual_rateio`, `valor_rateado`, `origem_rateio`, `status_titulo`, `data_vencimento`, e campos numéricos do título (`valor_original`, `valor_aberto`, `valor_vencido`).
- `ContasArvoreResponse` com `dados: LinhaArvoreFinanceira[]`, `total_paginas`, `total_registros`, `resumo?`.
- Endpoints novos consumidos via `api.get`:
  - `GET /api/contas-receber-arvore`
  - `GET /api/contas-pagar-arvore`

### 2. Helpers de árvore (novo arquivo `src/lib/treeFinanceiro.ts`)

- `construirMapaFilhos(dados)` → `Map<string, Linha[]>` indexado por `codigo_pai`.
- `getRaizesArvore(dados)` → linhas com `tipo_linha === "TITULO"` (ou `codigo_pai` nulo).
- `flattenArvore(dados, expandidos: Set<string>)` → lista linear respeitando expansão.
- `toggleNoArvore(estado: Set<string>, idLinha: string)` → novo Set imutável.
- `calcularKpisArvore(dados)` → agrega só itens `TITULO` (qtd, valor original, aberto, vencido).

### 3. Componente de árvore (novo `src/components/erp/FinanceiroTreeTable.tsx`)

Tabela leve baseada nos componentes `ui/table` já existentes, com:
- Colunas: Estrutura, Projeto, Fase, CCU, Descrição CCU, % Rateio, Valor Rateado, Origem, Status, Vencimento.
- Coluna "Estrutura": botão chevron (expandir/recolher) + indentação por `nivel * 16px` + label "Título" / "Rateio" + `descricao_resumida`.
- Status renderizado como `Badge` (reusar mapa `statusVariant`/`statusLabel` de cada página, exportando para `src/lib/format.ts` ou duplicando local).
- Datas via `formatDate`, valores via `formatCurrency`, percentual com 2 casas + "%".
- Sem chamadas extras à API: expansão é só estado local.

### 4. Alterações em `src/pages/ContasReceberPage.tsx`

- Adicionar ao `initialFilters`:
  - `numero_projeto: ''` (renomear/duplicar do atual `projeto` para alinhar ao contrato — manter ambos enviados para retrocompatibilidade).
  - `modo_arvore: false`.
- Filtros já existentes de `centro_custo` e `projeto` continuam; passar a enviar também `numero_projeto` quando preenchido.
- Novo checkbox **"Modo árvore de rateio"** com `id="modoArvoreContasRec"`.
- IDs nos inputs: `numeroProjetoContasRec` (campo Projeto) e `centroCustoContasRec` (campo Centro de Custo).
- Regra: se `modo_arvore && !agrupar_por_cliente`, chamar `/api/contas-receber-arvore`; senão manter fluxo atual.
- Estado `expandidos` (Set<string>) só para o modo árvore.
- KPIs: quando modo árvore ativo, calcular via `calcularKpisArvore` ignorando rateios.
- Renderizar `FinanceiroTreeTable` no lugar de `DataTable` quando modo árvore ativo.
- Desabilitar checkbox "Agrupar por cliente" quando "Modo árvore" estiver ligado (e vice-versa) para evitar combinação inválida.

### 5. Alterações em `src/pages/ContasPagarPage.tsx`

Mesmo conjunto de mudanças, com IDs:
- `numeroProjetoContasPag`, `centroCustoContasPag`, `modoArvoreContasPag`.
- Endpoint `/api/contas-pagar-arvore`.
- Agrupamento por fornecedor mutuamente exclusivo com modo árvore.

### 6. CSS mínimo (`src/index.css`)

Adicionar utilitárias:
```css
.tree-cell { display: flex; align-items: center; gap: 4px; }
.tree-toggle { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.tree-leaf { width: 18px; display: inline-block; }
```

### 7. Compatibilidade e não-regressão

- Modos analítico e agrupado existentes permanecem intactos (mesmas rotas, mesmas colunas, mesmo `DataTable`).
- `ExportButton` continua usando endpoints atuais (`/api/export/contas-pagar` e `/api/export/contas-receber`); modo árvore não exporta nesta entrega.
- Autenticação, `ProtectedRoute`, sidebar e demais módulos não são tocados.
- Documento `docs/backend-contas-centro-custo-projeto.md` é complementado mencionando os endpoints árvore.

### Observação importante

A tarefa pede "arquivo completo já ajustado". A implementação será dividida em múltiplos arquivos (helpers + componente + duas páginas) seguindo a arquitetura do projeto, em vez de inflar uma única página — mas o resultado funcional será exatamente o pedido.
