

# Remover botão "Limpar Resultados" das páginas de produção

## Alterações

### 1. `src/components/erp/FilterPanel.tsx`
- Remover a prop `onClearResults` e o botão "Limpar Resultados"
- Manter apenas "Pesquisar" e "Limpar Filtros"

### 2. Páginas de produção (7 arquivos)
- Remover a função `clearResults` e a prop `onClearResults` do `<FilterPanel>`
- Arquivos: `ProduzidoPeriodoPage`, `ExpedidoObraPage`, `SaldoPatioPage`, `NaoCarregadosPage`, `ProducaoDashboardPage`, `LeadTimeProducaoPage`, `EngenhariaProducaoPage`

