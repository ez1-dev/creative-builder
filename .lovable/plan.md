## Objetivo

Permitir esconder o percentual `(xx,x%)` do gráfico "Por Produto" via configuração.

## Situação atual

- `ConfigureChartDialog` já expõe o toggle "Mostrar percentual (%)" (`options.showPercent`).
- O card `chart-por-produto` em `PassagensDashboard.tsx` (linhas 1284–1349) renderiza o gráfico nativo e imprime o percentual **hardcoded** no `LabelList` (linha 1338) e no `RTooltip` (linha 1308), ignorando `options.showPercent`.

## Mudança

1. **`src/components/passagens/PassagensDashboard.tsx`** — no bloco `'chart-por-produto'`:
   - Ler `const showPercent = effectiveWidgets.find(w => w.type === 'chart-por-produto')?.options?.showPercent !== false;` (default: ligado, para não quebrar o visual atual).
   - No `LabelList` (linha 1338): renderizar `formatCurrency(item.value)` + ` (${pct}%)` só quando `showPercent`.
   - No `RTooltip` (linha 1308): idem — omitir o `(pct%)` quando `showPercent` for false.

Nada muda para quem não abrir a configuração; quem desligar o toggle deixa de ver o percentual no rótulo e no tooltip.

## Validação

1. `/passagens-aereas` → Editar layout → engrenagem do "Por Produto" → desligar "Mostrar percentual (%)" → salvar.
2. Confirmar que os rótulos passam a mostrar só `R$ …` (sem `(x,x%)`) e o tooltip também.
3. Reativar o toggle e confirmar que o percentual volta.