## Objetivo
Aumentar o destaque visual da separação entre cada bloco de apontamento na tabela impressa.

## Alteração

**`src/components/producao/op-print.css`** — regra `.op-apontamento-table tr.op-apt-row-end td` (tela e `@media print`):
- Tela: trocar `border-bottom: 2px solid #000` por `border-bottom: 4px solid #000`.
- Print: trocar `border-bottom: 1pt solid #000` por `border-bottom: 2.5pt solid #000`.

Sem outras mudanças.
