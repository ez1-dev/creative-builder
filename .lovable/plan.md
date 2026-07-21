## Objetivo
Adicionar coluna **"Acumulado ano"** ao final da grid da DRE (após "Total visível"), somando **apenas os meses selecionados no filtro de meses visíveis** — recalcula dinamicamente quando o usuário altera o período.

Escopo: apenas `DreStudioVisualizacaoPage.tsx` (DRE, modos Sintético/Analítico/Comparativo). Balanço, Nível 3 e exportação Excel ficam fora desta iteração.

> Observação: como o cálculo é sobre os meses visíveis, o valor coincide com o "Total visível" atual. A coluna serve como reforço visual de fechamento acumulado ao lado direito da grid, com destaque próprio.

## Alterações

1. **`src/lib/anomes.ts`**
   - Adicionar `isAcumuladoAnoCol(col)` e reconhecer `"ACUMULADO_ANO"` em `formatAnomes` → retorna `"Acumulado"`.

2. **`DreStudioVisualizacaoPage.tsx`**
   - `calcAcumuladoPeriodo(obj)`: soma `obj[c]` para todo `c ∈ periodosVisiveis` (mesmos meses que alimentam "Total visível"), ignorando `null`.
   - `colunasGrid = [...colunas, "ACUMULADO_ANO"]` (apenas UI).
   - `<thead>`: renderizar o novo cabeçalho "Acumulado" com destaque próprio (`bg-sky-50` para diferenciar do TOTAL_ANO) e `title="Acumulado dos meses selecionados no filtro"`.
   - `renderSingleCell` / `renderCompCell`: quando `isAcumuladoAnoCol(col)` usar `calcAcumuladoPeriodo`; em `visao === "VARP"`, retornar `null` (mesmo padrão do TOTAL_ANO).
   - `openDrill`: para a coluna `ACUMULADO_ANO`, usar `anomes_ini` = min e `anomes_fim` = max dos `periodosVisiveis`.
   - Reatividade: como usa `periodosVisiveis`, o recálculo já ocorre automaticamente ao trocar o filtro de meses.

## Validação
- Abrir `/contabilidade/dre-studio/:id/visualizacao` (DRE) → nova coluna "Acumulado" ao lado direito de "Total visível", em destaque azul-claro.
- Alterar o filtro de meses → valor de "Acumulado" atualiza junto com "Total visível".
- Clicar em célula "Acumulado" → drill abre com intervalo `min…max` dos meses visíveis.
- Modos Sintético / Analítico / Comparativo continuam funcionando; Balanço inalterado.