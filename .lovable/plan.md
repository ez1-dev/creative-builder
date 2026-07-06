## Reduzir espaçamento entre gráficos em /frota

Passar `density="compact"` para o `PassagensLayoutGrid` do `FrotaDashboard`, que já suporta essa prop (reduz `margin` de `[16,16]` para `[12,12]` e `rowHeight` de `60` para `44`).

### Alteração
- `src/components/frota/FrotaDashboard.tsx` (linha ~914): adicionar `density="compact"` no `<PassagensLayoutGrid ...>`.

Nenhuma mudança em dados, filtros ou lógica — apenas espaçamento visual do grid.