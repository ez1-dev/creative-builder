## Problema

No dashboard `/passagens-aereas`, o botão "Configurar" (engrenagem) aparece só para os gráficos listados em `CONFIGURABLE_CANONICAL` (linha 665 de `PassagensDashboard.tsx`). O gráfico **`chart-mapa-brasil`** (Mapa do Brasil) está fora dessa lista e por isso não mostra o botão no modo "Editar layout".

Os outros itens do renderMap que também estão fora (`kpis-row`, `tabela-registros`) não são gráficos e não fazem sentido reconfigurar via `ConfigureChartDialog` — ficam de fora.

## Mudança

1. **`src/components/passagens/PassagensDashboard.tsx`** (linha 665) — adicionar `'chart-mapa-brasil'` ao array `CONFIGURABLE_CANONICAL`.

Depois desta mudança, todos os gráficos do dashboard passam a expor o botão "Configurar" no modo Editar layout, permitindo trocar componente (catálogo BI), renomear, ajustar Top N, labels e percentual quando o componente escolhido suportar.

## Validação

1. Abrir `/passagens-aereas` → "Editar layout".
2. Passar o mouse em cada card de gráfico (Evolução Mensal, Motivo Viagem, Por Produto, Top CC, Top Cidades, Top UF, Top Destinos Valor, Mapa Brasil) e confirmar que o botão de configuração aparece em todos.
3. Abrir o dialog no "Mapa Brasil" e confirmar que carrega sem erro.