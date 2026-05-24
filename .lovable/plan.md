## Mudança

Substituir o `FilaSituacaoMock` por um card real que consulta `/api/producao/carga/detalhe` e agrega por `sitop`, respeitando os filtros do dashboard (exceto o próprio filtro de situação, que precisa ficar aberto pra mostrar a distribuição).

## Implementação

1. **Novo componente** `src/components/producao/carga-dashboard/FilaSituacaoCard.tsx`
   - Props: `filtros: CargaFiltros`.
   - Usa `useCargaDetalhe({ ...filtros, situacoes: undefined, pagina: 1, tamanho_pagina: 5000 })`.
   - Deduplica linhas por `(codori, numop)` antes de contar (uma OP aparece em várias operações).
   - Agrupa por `sitop` (mapa de rótulo: A→Aberta, L→Liberada, C→Confirmada, F→Finalizada, S→Suspensa, etc — fallback ao próprio código).
   - Renderiza `<DonutCard title="Fila de OPs por situação" subtitle="Distribuição respeitando filtros (exceto situação)" …>`.
   - Skeleton enquanto carrega; aviso pequeno se `total_registros > 5000` ("amostra parcial — solicitar endpoint agregado").
   - Sem badge "Dados de exemplo".

2. **`CargaDashboardPage.tsx`**
   - Remover import de `FilaSituacaoMock`.
   - Trocar `<FilaSituacaoMock />` por `<FilaSituacaoCard filtros={filtros} />`.

3. **Excluir** `FilaSituacaoMock.tsx` (não é mais usado).

4. **`docs/backend-carga-dashboard.md`**
   - Atualizar a seção da fila por situação: trocar "mock" por "hoje calculado no frontend via /detalhe com tamanho_pagina=5000 — pedir endpoint agregado `/api/producao/carga/situacoes` que devolva `[{ sitop, qtd_ops }]` respeitando filtros, pra eliminar a paginação grande".

Nada mais muda. O heatmap continua mock (já documentado).