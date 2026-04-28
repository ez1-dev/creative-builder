## Plano para corrigir os cards zerados no Relatório Semanal Obra

### Objetivo
Fazer com que os cards de Total de Obras, Projetos, Cargas, Peças e Peso Total sempre reflitam o resultado da pesquisa aplicada.

### O que vou ajustar
1. Revisar a priorização do `resumo` retornado pela API no `RelatorioSemanalObraPage`.
2. Adicionar uma validação para não confiar em um `resumo` zerado/inconsistente quando a busca trouxe linhas em `dados`.
3. Fazer fallback automático para agregação no frontend usando os registros retornados e, se necessário, as demais páginas.
4. Garantir que os estados `kpiTotals`, `kpiLoading` e `consolidatedRows` sejam atualizados de forma consistente após cada nova pesquisa.
5. Preservar os gráficos e o drill-down já implementados, usando a mesma base consolidada dos filtros atuais.

### Resultado esperado
- Se a API enviar um `resumo` válido, os cards usarão esse resumo.
- Se a API enviar `resumo` zerado ou incompatível com os dados filtrados, os cards serão recalculados automaticamente a partir dos registros da pesquisa.
- Os cards deixarão de exibir `0` quando a tabela/gráficos tiverem dados do filtro aplicado.

### Detalhes técnicos
- Arquivo principal: `src/pages/producao/RelatorioSemanalObraPage.tsx`
- Ajuste na função `consolidateKpis` para detectar `resumo` inválido antes de fazer:
  - `setKpiTotals(...)`
  - `setKpiLoading(false)`
- Regra de fallback prevista:
  - se `dados.length > 0` e o `resumo` vier vazio/zerado, recalcular via `aggregateRows(page1)` e consolidar páginas restantes.
- Manter proteção contra race condition com `consolidationIdRef`.
- Não alterar integração automática nem arquivos gerados.

### Validação após implementação
- Executar uma pesquisa com retorno de linhas e confirmar que os 5 cards deixam de ficar zerados.
- Confirmar que limpar filtros reseta os cards corretamente.
- Confirmar que ao clicar em gráfico por obra os cards também acompanham o novo filtro.
- Confirmar que paginação não sobrescreve os totais do filtro atual.
