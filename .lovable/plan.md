

# Corrigir botão "Limpar" em todas as páginas

## Problema
O botão "Limpar" reseta apenas os filtros (`setFilters`), mas não limpa o estado `data`, então a tabela, KPIs e paginação continuam visíveis na tela após clicar em Limpar.

## Solução
Em cada página que usa `FilterPanel`, alterar o `onClear` para também limpar `data` (setar `null`) e resetar `pagina` para `1`.

## Arquivos afetados

### `src/pages/OndeUsaPage.tsx`
- Alterar `onClear` para: `() => { setFilters({ codcmp: '', dercmp: '', codmod: '' }); setData(null); setPagina(1); }`

### `src/pages/ComprasProdutoPage.tsx`
- Alterar `onClear` para incluir `setData(null); setPagina(1);`

### `src/pages/EstoquePage.tsx`
- Alterar `onClear` para incluir `setData(null); setPagina(1);`

### `src/pages/BomPage.tsx`
- Alterar `onClear` para incluir `setData(null); setPagina(1);` (mantendo o `setCollapsedRows(new Set())` existente)

