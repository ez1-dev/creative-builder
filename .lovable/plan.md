## Mudança

No `CargaDashboardPage.tsx`, o segundo donut (hoje "Distribuição por tipo de recurso") mostra apenas `PRODUCAO 100%` porque a base atual só tem esse tipo. Trocar a métrica para **Carga por centro de custo (`codccu`)**, que é mais granular e revela concentração real.

## Implementação

1. **`src/pages/producao/CargaDashboardPage.tsx`**
   - Substituir `porTipo = useMemo(() => aggByKey(rows, 'tipo_recurso'), [rows])` por `porCcu = useMemo(() => aggByKey(rows, 'codccu'), [rows])`.
   - Pegar os **Top 8** `codccu` por carga e agrupar o restante em `"Outros"` (evita donut ilegível com muitas fatias).
   - Substituir o `<DonutCard>` correspondente:
     - título: `"Distribuição por centro de custo"`
     - subtítulo: `"Top 8 centros · demais agrupados em Outros"`
     - dados: `[{ name: codccu, value: carga_min }, …, { name: 'Outros', value: soma }]`

2. **Sem alterações** em `aggregations.ts`, `DonutCard.tsx` ou no backend — `codccu` já vem da API.

3. Remover importação não usada se sobrar (`porTipo`).

Nenhuma outra parte do dashboard muda.