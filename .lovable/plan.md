## Atualizar colunas da tabela de Notas Fiscais de Recebimento

A tela `src/pages/NotasRecebimentoPage.tsx` não usa `renderTabelaNotasRecebimento` nem `<th colSpan={23}>` — ela usa o componente `DataTable` com um array `columns`. Não há cabeçalho manual nem `colspan` para atualizar. A adaptação fiel ao pedido é apenas estender o array de colunas.

### Mudanças

**`src/pages/NotasRecebimentoPage.tsx`** (array `columns`, ~linha 78–84):

1. Renomear o header da coluna `descricao_item` de `"Descrição"` para `"Descrição Item"`.
2. Adicionar nova coluna logo após `descricao_item`:
   - `{ key: "descricao_lancamento", header: "Descrição Lançamento" }`
3. Adicionar nova coluna logo após:
   - `{ key: "descricao_cadastro_produto_servico", header: "Descrição Cadastro" }`
4. Renomear o header da coluna `descricao_centro_custo` de `"Desc. Centro Custo"` para `"Descrição CCU"`.

Atualizar também `FILTER_LABELS.descricao_item` para `"Descrição Item"` (consistência dos chips).

### Fora de escopo

- `exportarNotasRecebimentoExcel` — não alterar (export é resolvida pelo backend `/api/export/notas-recebimento`).
- Não há `colspan` 23 na tela (DataTable controla colSpan automaticamente via `columns.length`), portanto não há nada a alterar manualmente.
- Sem mudanças em filtros, drill, KPIs, ou backend.
