## Aplicar o mesmo donut moderno ao "Por Segmento" e demais pizzas do Frota

Os gráficos da imagem ("Por Segmento" com OBRA/FROTA/EZORTEA/GENIUS e "Por Tipo de Veículo") ainda estão no formato antigo (`PieChartCard` com labels flutuantes). Vou trocar todos os `PieChartCard` restantes do Frota pelo `DonutSideLegendCard` (mesmo componente moderno já usado em `chart-categoria` e `chart-tipo-veiculo`).

### Onde muda

Em `src/components/frota/FrotaDashboard.tsx`:

- Bloco `chart-segmento` (linhas ~491-499) — "Distribuição por Segmento (FROTA/GENIUS/OBRA)" — hoje ainda é `PieChartCard donut`.

Vou trocar por `DonutSideLegendCard` com o mesmo `data={porSegmento}`, `onItemClick` e `loading`, `height={380}`, mantendo título e subtítulo atuais e o `VisualGate`.

Se restar algum outro `PieChartCard` no arquivo (verificação final via grep), aplico a mesma troca.

### O que não muda

- Nenhum cálculo, filtro, cross-filter, dados ou layout do grid.
- Nenhuma alteração no `PieChartCard` (segue disponível para os outros módulos: Máquinas, Comercial, IA).
- Nenhuma migration ou mudança de backend.

### Arquivos alterados

- `src/components/frota/FrotaDashboard.tsx` — apenas o bloco `chart-segmento`.
