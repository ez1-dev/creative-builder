## Objetivo

No diálogo "Configurar gráfico" da Manutenção de Frota, quando a série escolhida é `Placa · ...` (ex.: `por_placa__valor`, `por_placa__pct`, `por_placa__qtd` etc.), o preview mostra apenas a placa (ex.: `MGB3558`). Já no bloco renderizado no dashboard ("Top Veículos"), o rótulo aparece enriquecido (`MGB3558 — CAMINHÃO IVECO - ANO 2007`). Vamos padronizar: o preview e qualquer bloco que consuma `por_placa__*` deve mostrar `PLACA — DESCRIÇÃO`.

## Mudança

Arquivo único: `src/components/frota/FrotaDashboard.tsx`

1. No `seriesPayload` (linhas ~332–356), após montar `out[`por_placa__${m.key}`]`, enriquecer o `name` de cada ponto para `"PLACA — DESCRIÇÃO"`, reaproveitando a mesma lógica já usada em `topVeiculos` (descrição mais frequente por placa em `crossFiltered`).

   Implementação:
   - Construir um `Map<placa, topDesc>` a partir de `crossFiltered` (contando `veiculo_descricao` não-vazio por placa e escolhendo o mais frequente).
   - Para cada métrica `m`, mapear `out[`por_placa__${m.key}`]` gerando `{ name: topDesc ? `${placa} — ${topDesc}` : placa, value }`.
   - O alias legado `out.top_veiculos = toLegacy(out['por_placa__valor'])` passa a herdar o rótulo enriquecido automaticamente.

2. Cross-filter continua funcionando: o handler genérico em `PaginaDashboardTemplate` (linhas ~691–714) já faz `String(name).split(' — ')[0]` para dimensão `placa`? Verificar. Se não fizer, ajustar o dispatch em `placa` para extrair a placa antes do ` — ` (mesmo padrão já usado em `onItemClick` do bloco "Top Veículos", linha ~534). Caso o handler genérico use `name` cru, adicionar `name.split(' — ')[0].trim()` no dispatch `placa`.

## Fora do escopo

- Outras páginas (Máquinas, Passagens, RH, Comercial): não solicitadas.
- Alterações no `RankingChartCard` ou no `componentRegistry`: desnecessárias, o rótulo já vem pronto na série.
- Backend / ETL.

## Validação

1. Abrir `/frota`, clicar em "Configurar" no bloco Top Veículos → confirmar preview mostra `PLACA — DESCRIÇÃO`.
2. Trocar série para `Placa · Quantidade` / `Placa · % do total` → confirmar mesmo enriquecimento.
3. Clicar em uma barra do bloco renderizado → confirmar que o filtro cruzado por placa ainda aplica (extraindo a placa antes do ` — `).
