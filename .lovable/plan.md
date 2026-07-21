## Objetivo

Adicionar uma coluna extra ao final da grid da DRE — **"Acumulado ano"** — ao lado da coluna existente "Total visível". Ela soma **todos os períodos mensais do snapshot** (ignora o filtro de meses visíveis).

Escopo: apenas a grid da tela de visualização (`DreStudioVisualizacaoPage.tsx`). Não altera backend, exportação, ou modo Nível 3/Balanço nesta iteração.

## Alterações

1. **Helper de rótulo** (`src/lib/anomes.ts`)  
   Adicionar `isAcumuladoAnoCol(col)` e reconhecer `"ACUMULADO_ANO"` em `formatAnomes` → retorna `"Acumulado"`.

2. **Estado derivado** (`DreStudioVisualizacaoPage.tsx`)  
   - `calcAcumuladoAno(obj)`: soma `obj[c]` para todo `c ∈ periodosMensais` (variável já derivada na linha 449 a partir de `q.data.periodos`), ignorando null.  
   - `colunasGrid = [...colunas, "ACUMULADO_ANO"]` usado somente na renderização.

3. **Cabeçalho `<thead>`** (linha ~2508)  
   Iterar sobre `colunasGrid`. Para a coluna `ACUMULADO_ANO`: label "Acumulado", `title="Soma de todos os meses do ano no snapshot"`, mesmo destaque visual do TOTAL_ANO (`bg-slate-100`).

4. **Renderização das células**  
   - `renderSingleCell` e `renderCompCell`: quando `isAcumuladoAnoCol(col)` → usa `calcAcumuladoAno` no lugar de `calcTotalVisivel`; caso `visao === "VARP"`, `v = null` (mesmo tratamento atual do TOTAL_ANO).  
   - Linha do rodapé `TOTAL_GERAL`/subtotais existentes seguem o mesmo padrão.  
   - `openDrill`: para a coluna `ACUMULADO_ANO`, usa `anomes_ini`/`anomes_fim` cobrindo `min…max` dos `periodosMensais`.

5. **Modo NIVEL3** e **exportação Excel**: fora do escopo desta correção. Permanecem apenas com "Total visível".

## Validação

- Abrir `/contabilidade/dre-studio/:id/visualizacao` (DRE) → surge nova coluna "Acumulado" após "Total visível".  
- Alternar o seletor de meses visíveis: "Total visível" muda, "Acumulado" permanece constante (soma de todos os períodos do snapshot).  
- Clicar em uma célula da coluna "Acumulado" → drill abre com intervalo do ano todo.  
- Modos Sintético/Analítico/Comparativo continuam funcionais; Balanço inalterado.
