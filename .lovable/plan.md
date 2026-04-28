## Bug: KPIs do Relatório Semanal Obra não refletem todos os dados filtrados

### Causa
Hoje os 5 cards (Total Obras, Projetos, Cargas, Peças, Peso Total) são calculados via `useMemo` a partir de `data.dados`, que contém **apenas os 100 registros da página atual** (`tamanho_pagina: 100`). Quando o resultado tem mais de uma página e o backend não envia o objeto `resumo`, os totais ficam congelados nos números da página visível e parecem "não reagir aos filtros". Além disso, ao limpar/refiltrar, o estado anterior dos KPIs continua visível até o novo `data` chegar.

### Correção em `src/pages/producao/RelatorioSemanalObraPage.tsx`
Aplicar o mesmo padrão de consolidação usado em `ExpedidoObraPage.tsx`:

1. **Substituir** o `useMemo` de KPIs por estado `kpiTotals` + `kpiLoading` controlados pelo fluxo de busca.
2. **Adicionar** `consolidationIdRef` (useRef) para cancelar consolidações concorrentes (race condition entre buscas).
3. **Nova função `consolidateKpis`** chamada após cada `search(1)`:
   - Se o backend retornar `resumo` no payload da página 1 → usa direto (caminho rápido).
   - Senão, agrega a página 1 e dispara fetches em lotes de 5 das demais páginas (mesmo endpoint, mesmos filtros), somando totais e mantendo `Set` de obras/projetos distintos.
   - Em caso de erro parcial, exibe toast de aviso e mantém os valores agregados até onde foi possível.
4. **Cards exibem "Calculando..."** enquanto `kpiLoading` está ativo (em vez de números desatualizados).
5. **`clearFilters`** zera `kpiTotals`, `kpiLoading` e incrementa `consolidationIdRef` para cancelar consolidação pendente.
6. Remover o `useMemo` antigo e atualizar `useAiPageContext` para ler do novo estado.

### Recomendação backend (não bloqueia o fix)
O endpoint `/api/producao/relatorio-semanal-obra` deveria retornar um objeto `resumo` no payload com:
```json
{ "total_obras", "total_projetos", "total_cargas", "total_pecas", "peso_total" }
```
Quando presente, o frontend usa direto sem precisar varrer páginas — mais rápido e exato.

### Fora do escopo
- Não altera filtros, colunas da tabela nem layout.
- Não altera a tela "Expedido para Obra".
