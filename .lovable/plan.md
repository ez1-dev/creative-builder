

# Adicionar botoes "Limpar Filtros" e "Limpar Resultados" nas paginas de Producao

## O que muda

Hoje o botao "Limpar" faz tudo junto: zera os filtros E remove os resultados/KPIs. A proposta e separar em dois botoes:

- **Limpar Filtros** -- zera os campos de filtro, remove resultados e KPIs (comportamento atual)
- **Limpar Resultados** -- remove apenas a tabela e os KPIs, mantendo os filtros preenchidos

## Alteracoes

### 1. `FilterPanel.tsx`
- Adicionar nova prop `onClearResults` (opcional, para nao quebrar outras telas fora de producao)
- Renderizar dois botoes quando `onClearResults` for fornecido:
  - "Limpar Filtros" (icone X) -- chama `onClear`
  - "Limpar Resultados" (icone Eraser ou similar) -- chama `onClearResults`
- Quando `onClearResults` nao for passado, manter apenas o botao "Limpar" atual

### 2. Paginas de producao (6 arquivos)
- `ProduzidoPeriodoPage.tsx`
- `ExpedidoObraPage.tsx`
- `SaldoPatioPage.tsx`
- `NaoCarregadosPage.tsx`
- `ProducaoDashboardPage.tsx`
- `LeadTimeProducaoPage.tsx`

Em cada uma:
- Manter `clearFilters` existente (zera filtros + dados)
- Criar `clearResults` que limpa apenas `data`, `pagina`, `kpiTotals`, `kpiLoading` sem tocar nos filtros
- Passar ambas callbacks ao `FilterPanel`

