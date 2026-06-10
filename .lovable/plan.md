## Objetivo
Hoje, ao filtrar por **Pedido** ou **Relatório de Produção** na tela `/producao/impressao-ordem-producao`, o hook `useOpcoesImpressaoOp` envia `limite_ops=200` para `GET /api/producao/ordem-producao/opcoes`. Resultado: agrupamento 74453 mostra apenas 200 OPs em vez das 401 reais.

## Mudança

### `src/hooks/useOpcoesImpressaoOp.ts`
Trocar todos os `limite_ops` numéricos para **1000**, em todas as funções de recarga e busca:

- `reloadBase` → `limite_ops: 1000` (era 80)
- `reloadByPedido`, `reloadByRelatorio`, `reloadByOrigem`, `reloadBySituacao`, `reloadByCentroRecurso`, `reloadByProduto` → `limite_ops: 1000` (era 200)
- `searchOps`, `searchProdutos` → `limite_ops: 1000` (era 200)

Manter a passagem condicional já existente em `fetchOpcoes` (`if (params.limite_ops !== undefined) q.limite_ops = params.limite_ops`) — só os valores defaults mudam.

### Resto do código
- `opcoes.ops` já é usado integralmente em `opsFiltradas` (`src/pages/producao/ImpressaoOrdemProducaoPage.tsx`) — não há `.slice(0, 200)` nem `pageSize` fixo na lista principal. O contador exibido (`opsFiltradas.length`) já reflete o total retornado.
- `SelectBuscavel` (slice 0,200) e `OpAutocomplete`/`ProdutoAutocomplete` (slice 0,100) são limites de **renderização de combobox**, não da lista principal de OPs, e ficam fora do escopo desta mudança.

## Critério de aceite
1. Selecionar Empresa = 1 + Relatório de Produção 74453 dispara
   `GET /api/producao/ordem-producao/opcoes?cod_emp=1&rel_prd=74453&limite_ops=1000`.
2. O contador "X OP(s) encontradas" mostra **401** (após drop de canceladas/ori 100, conforme `sanitizeOps`) ou o total efetivamente retornado por `ordens_producao` quando todos os filtros vierem em branco.
3. Demais filtros (Pedido, Origem, Situação, Centro de Recurso, Produto, busca de OPs/produtos) também passam a usar `limite_ops=1000`.
