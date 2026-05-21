## Ajuste: 6 blocos de apontamento por página da Impressão de OP

Hoje cada operação renderiza **3 blocos** de apontamento (linhas de 12mm cada, totalizando ~144mm de tabela). O usuário precisa de **6 blocos por página**. Para caber sem estourar o A4, reduzimos a altura/fonte da linha de cabeçalho (início / data / setup / fim / data / qtd / refugo) e deixamos esse cabeçalho em negrito.

### 1) `src/components/producao/OpPrintSheet.tsx` (linha 268)

Trocar `Array.from({ length: 3 })` por `Array.from({ length: 6 })` no loop que gera os blocos da `op-apontamento-table`.

### 2) `src/components/producao/op-print.css`

Ajustes na `.op-apontamento-table`:

- **Linhas de cabeçalho (`tr.op-apt-head th`)**: altura reduzida (de 12mm para ~5mm), fonte um pouco menor (7.5pt), `font-weight: bold`, padding vertical mínimo. Aplica em tela e em `@media print`.
- **Linhas de preenchimento (`tr.op-apt-fill td`)**: manter altura adequada para escrita manual, mas reduzir de 12mm para ~9mm para que 6 blocos caibam na página. Aplica em tela e em `@media print`.
- Manter `border-bottom` reforçado em `tr.op-apt-row-end` (separador entre blocos).

### Estimativa de altura

- Antes: 3 blocos × 4 linhas × 12mm = **144mm**
- Depois: 6 blocos × (2 × 5mm cabeçalho + 2 × 9mm preenchimento) = 6 × 28mm = **168mm**

Cabe na área útil restante da página (após cabeçalho, dados da operação e narrativas) mantendo a quebra por operação.

### Escopo

- Não altera dados, API, cabeçalho, REV, componentes, desenhos nem destaques de campos (Operação, Centro Rec., Tmp Total, Próx. Oper.).
- Apenas layout da tabela de apontamento manual.
