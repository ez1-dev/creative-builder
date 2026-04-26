# Top 15 Centros de Custo

Trocar o ranking de centros de custo de Top 10 para Top 15 no dashboard de Passagens Aéreas.

## Mudanças em `src/components/passagens/PassagensDashboard.tsx`

1. Linha ~101: alterar `.slice(0, 10)` → `.slice(0, 15)` no `useMemo` `porCentroCusto`.
2. Linha ~172: alterar título do card de **"Top 10 Centros de Custo"** → **"Top 15 Centros de Custo"**.
3. Aumentar altura do gráfico de 300px → 420px para acomodar bem as 15 barras horizontais sem cortar rótulos.

Demais filtros, KPIs e gráficos permanecem inalterados.
