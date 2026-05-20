## Objetivo

Adicionar filtro **Produto** (autocomplete pesquisável) na tela `/producao/impressao-op`, integrando-o ao endpoint `/api/producao/ordem-producao/opcoes` e propagando `cod_pro` para as cargas combinadas e para a impressão em lote.

## Mudanças

### 1. `src/lib/producao/opcoesImpressao.ts`
- Adicionar tipo `OpcaoProduto`:
  ```ts
  { codigo: string; value: string; descricao?: string; label?: string; qtd_ops?: number }
  ```
- Adicionar `produtos?: OpcaoProduto[]` em `OpcoesImpressao`.
- Adicionar `cod_pro?: string` em `OpcoesImpressaoParams`.

### 2. `src/hooks/useOpcoesImpressaoOp.ts`
- Novo estado `produtos: OpcaoProduto[]` (setado em `reloadBase` e nas demais cargas que retornarem `produtos`).
- Em `fetchOpcoes`: passar `cod_pro` quando presente.
- Estender `RefinementCtx` para aceitar `cod_pro?: string`.
- Estender `SearchOpsContext` com `cod_pro`.
- Adicionar:
  - `reloadByProduto(cod_emp, cod_pro, ctx?)` chamando `opcoes?cod_emp=..&cod_pro=..&limite_ops=200` (combinando com `cod_ori`, `sit_orp`, `cod_cre`, `cod_etg` quando presentes). Atualiza `ops`, `origens` e mantém estágios/CR conforme padrão atual.
  - `searchProdutos(q, ctx?)` → `GET opcoes?cod_emp=..&q=..&limite_ops=200`, retorna `res.produtos ?? []`.
- Demais `reloadBy*` recebem opcionalmente `cod_pro` no `ctx` e o repassam ao `fetchOpcoes` (para combinar Produto + Pedido/Origem/Situação/Estágio/CR).
- `searchOps` aceita `cod_pro` no contexto.

### 3. `src/components/producao/ProdutoAutocomplete.tsx` (novo)
Componente análogo a `OpAutocomplete`:
- Props: `value`, `displayLabel`, `onSelect(produto | null)`, `fetcher(q) => Promise<OpcaoProduto[]>`, `disabled`, `placeholder`.
- Debounce 300ms; ao abrir vazio, dispara `fetcher('')` (lista inicial).
- Renderiza `label` ou `${codigo} - ${descricao}` (com `qtd_ops` ao lado quando disponível).
- Botão "X" para limpar (`onSelect(null)`).

### 4. `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Estender `ImpressaoOpFiltros` (em `src/lib/producao/opImpressao.ts`) com `cod_pro?: string`; incluir `cod_pro: ''` em `EMPTY`.
- Novo estado `produtoLabel`.
- Adicionar handler `onChangeProduto(prod | null)`:
  - Atualiza `filtros.cod_pro` e limpa `num_orp`/`opLabel`.
  - Se limpou: refaz a carga conforme filtros remanescentes (mesma cascata de `onChangeOrigem` sem `cod_ori`).
  - Se selecionou: chama `opcoes.reloadByProduto(cod_emp, cod_pro, { cod_ori, sit_orp, cod_cre, cod_etg })`. Não combina com `num_ped`/`rel_prd` (mantém regra alternativa: limpar `num_ped`/`rel_prd` ao escolher produto? — **manter ambos**: produto pode ser combinado com pedido/relatório; apenas pedido↔relatório continuam mutuamente exclusivos).
- Propagar `cod_pro` nos demais handlers (`onChangeOrigem`, `onChangeSituacao`, `onChangeCentroRecurso`, `onChangeEstagio`) ao montar `ref`/`ctx`.
- `searchOpsFetcher`: incluir `cod_pro` no contexto.
- `searchProdutosFetcher` (novo `useCallback`): `(q) => opcoes.searchProdutos(q, { cod_emp: filtros.cod_emp })`.
- `useEffect` de limpeza de `selectedKeys`: incluir `filtros.cod_pro`.
- `showGrid`: incluir `filtros.cod_pro` na condição (`cod_pro` sozinho já deve mostrar a grid).
- `imprimirTodas`:
  - Permitir disparo quando há `cod_pro` (ajustar guard).
  - Passar `cod_pro` em `fetchImpressaoLote`.
- `limpar`: já cobre via `EMPTY`.

### 5. UI do formulário (mesmo arquivo)
- Adicionar `Field "Produto"` no **Grupo 2 — Contexto da Produção** (entre Origem e Ordem de Produção), usando `ProdutoAutocomplete`. Mantém grid 2 colunas (Produto ocupa uma coluna; reorganizar para: Origem | Produto | Situação | Ordem de Produção | Estágio).
- Desabilitar quando `!filtros.cod_emp`.

### 6. `src/lib/producao/opImpressaoLote.ts`
- Adicionar `cod_pro?: string` em `ImpressaoOpLoteParams`.
- Em `fetchImpressaoLote`: `if (params.cod_pro) q.cod_pro = params.cod_pro;`.

### 7. Regras preservadas
- Filtro continua excluindo `cod_ori === '100'` e `sit_orp === 'C'`.
- `num_ped` ↔ `rel_prd` continuam alternativos entre si.
- Produto pode aparecer combinado com Origem, Pedido, Relatório, Situação, Estágio, Centro de Recurso.
- Grid: mantém colunas atuais (já incluem todas as listadas no pedido). Sem auto-seleção de primeira OP. Ações "Visualizar"/"Imprimir" por linha continuam funcionando. "Imprimir todas" passa a respeitar `cod_pro`.

## Fora de escopo
- Backend / endpoints novos.
- Mudanças no layout de impressão.
- Mudanças no `useImpressaoOrdemProducao` (fetch individual de OP).
