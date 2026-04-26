## Objetivo

Exibir, na tela **Compras / Custos do Produto** (`/compras-produto`), o preço unitário da última Ordem de Compra em aberto, ao lado das colunas "Preço Médio" e "Custo Calculado".

## Contexto

A API `GET /api/compras-produto` já retorna esse dado em cada item — campo **`preco_ultima_oc_aberta`** (validado via inspeção da resposta da rede). Hoje a tela não exibe esse valor; mostra apenas:

- `preco_medio` (Preço Médio)
- `custo_calculado` (Custo Calculado)
- `preco_nf_ultima_compra` (Preço NF da última compra)

Não é necessária alteração de backend nem nova requisição.

## Alterações

### 1. `src/pages/ComprasProdutoPage.tsx`
- Adicionar nova coluna **`preco_ultima_oc_aberta`** com header **"Preço Unit. OC"**, alinhada à direita, formatada com `formatCurrency`.
- Posicionar logo após a coluna **"Última OC"** (`numero_oc_ultima`), agrupando informação de OC.
- Sem alterações em filtros, KPIs ou paginação.

```text
Última OC | Preço Unit. OC | OC Aberta? | Qtd. OCs
```

### 2. Exportação Excel
- O endpoint `/api/export/compras-produto` é gerado pelo backend; se já incluir `preco_ultima_oc_aberta`, nada a fazer. Caso contrário, é alteração de backend fora do escopo.

## Testes manuais
1. Acessar `/compras-produto`, clicar em **Pesquisar**.
2. Verificar a nova coluna **"Preço Unit. OC"** populada (R$) para itens com OC em aberto e zero/branco para itens sem.
3. Confirmar que ordenação, busca rápida (Ctrl+K) e paginação continuam funcionando.
