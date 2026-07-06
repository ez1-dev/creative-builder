## Aplicar o donut moderno também no dashboard de Máquinas

Os gráficos da imagem ("Por Segmento" com OBRA/FROTA/EZORTEA/GENIUS e "Por Tipo de Veículo" com GUINDAUTO/CAVALO MECÂNICO/CARRETA) pertencem ao módulo **Máquinas** (`/maquinas`), que ainda usa `PieChartCard` no formato antigo.

### O que fazer

Em `src/components/maquinas/MaquinasDashboard.tsx`:

- Trocar todos os `PieChartCard` pelo `DonutSideLegendCard` já criado em `src/components/bi/charts/DonutSideLegendCard.tsx`.
- Manter exatamente: `data`, `loading`, `onItemClick`, título, subtítulo, `VisualGate` e qualquer wrapper existente.
- Padronizar `height={380}` (mesmo do Frota).
- Adicionar o import do `DonutSideLegendCard`.

### O que não muda

- Nenhum cálculo, filtro, cross-filter ou layout do grid.
- `PieChartCard` continua disponível para os outros consumidores (Comercial, IA, etc.).
- Zero mudança de dados/backend/migration.

### Arquivos alterados

- `src/components/maquinas/MaquinasDashboard.tsx` — apenas as ocorrências de `PieChartCard`.
