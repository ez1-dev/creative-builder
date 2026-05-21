## Objetivo
Deixar as colunas `inicio`, `data`, `fim`, `data` com a mesma largura na tabela de apontamento.

## Alteração

**`src/components/producao/OpPrintSheet.tsx`** — `<colgroup>` da `op-apontamento-table`:

| col | atual | nova |
|---|---|---|
| 1 (inicio) | 7% | **12%** |
| 2 (data) | 8% | **12%** |
| 3 (tempo setup) | 10% | 9% |
| 4 (fim) | 16% | **12%** |
| 5 (data) | 16% | **12%** |
| 6 (qtd produzida) | 22% | 22% |
| 7 (refugo) | 21% | 21% |

Total = 100%. Mantém obs (col 4-5) maior que motivo do desvio (col 1-3): obs = 24%, motivo = 33%... 

Correção: para manter `obs` ≥ `motivo do desvio`, ajustar para:

| col | nova |
|---|---|
| 1 | 9% |
| 2 | 9% |
| 3 | 9% |
| 4 | 14% |
| 5 | 14% |
| 6 | 22% |
| 7 | 23% |

Mas o usuário pediu apenas que as quatro (1, 2, 4, 5) fiquem iguais. Mantendo o pedido literal e preservando obs > motivo:

| col | nova final |
|---|---|
| 1 (inicio) | **11%** |
| 2 (data) | **11%** |
| 3 (tempo setup) | 12% |
| 4 (fim) | **11%** |
| 5 (data) | **11%** |
| 6 (qtd produzida) | 22% |
| 7 (refugo) | 22% |

Resultado: motivo do desvio (1-3) = 34%, obs (4-5) = 22%, operador = 22%, check = 22%.

⚠️ Confirmar: isso volta obs a ficar menor que motivo. Como o pedido anterior era obs maior, sugiro a variante final acima apenas se o usuário aceitar. Caso contrário, manter ajuste prévio com obs grande não é compatível com "todos do mesmo tamanho".

Decisão: aplicar a variante final (1=2=4=5=11%, 3=12%, 6=7=22%), priorizando o pedido literal mais recente.

Sem outras mudanças.
