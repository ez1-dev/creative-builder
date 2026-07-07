## Problema

O gráfico "Por Produto" no dashboard `/passagens-aereas` não mostra o botão de configuração (engrenagem) no modo de edição de layout porque seu tipo canônico não está listado como configurável.

## Causa

Em `src/components/passagens/PassagensDashboard.tsx` (linha ~664), o array `CONFIGURABLE_CANONICAL` inclui:

- `chart-evolucao-mensal`
- `chart-motivo-viagem`
- `chart-top-cc`
- `chart-top-cidades`
- `chart-top-uf`
- `chart-top-destinos-valor`

Mas **não inclui** `chart-por-produto`, então o `WidgetsGrid` não renderiza o botão "Configurar" para esse widget.

## Mudança

1. **`src/components/passagens/PassagensDashboard.tsx`** — adicionar `'chart-por-produto'` ao array `CONFIGURABLE_CANONICAL`.

Isso libera o botão de configuração do "Por Produto" (permitindo trocar o componente por outro do catálogo BI, ajustar título/Top N, ativar/desativar labels e percentual quando o componente escolhido suportar).

## Validação

1. Abrir `/passagens-aereas` → ativar "Editar layout" → passar o mouse no card "Por Produto".
2. Confirmar que o botão de configuração aparece e abre o `ConfigureChartDialog`.
3. Trocar por um `ranking-chart` e verificar que as opções (Top N, percentual, etc.) funcionam como nos demais gráficos.
