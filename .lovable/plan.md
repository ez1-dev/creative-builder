

# Adicionar Filtros Projeto e Centro de Custo em Compras/Custos do Produto

## O que sera feito
Adicionar dois novos campos de filtro na pagina `ComprasProdutoPage.tsx`: **Projeto** e **Centro de Custo**. Serao campos `Input` de texto livre, seguindo o mesmo padrao dos filtros existentes (Codigo, Descricao, Derivacao).

## Parametros da API
Como nao ha confirmacao dos nomes exatos no backend, usarei nomes convencionais:
- `projeto` — para o filtro de projeto
- `centro_custo` — para o filtro de centro de custo

Se o backend usar nomes diferentes, basta ajustar os nomes das chaves no objeto `filters`.

## Alteracoes no arquivo `src/pages/ComprasProdutoPage.tsx`

1. **State `filters`**: Adicionar `projeto: ''` e `centro_custo: ''` ao estado inicial e ao `onClear`
2. **FilterPanel**: Adicionar dois novos campos `Input` com `Label` para Projeto e Centro de Custo, posicionados apos o campo Descricao
3. Nenhuma alteracao em colunas ou KPIs

## Arquivo afetado
- `src/pages/ComprasProdutoPage.tsx` (unico arquivo)

