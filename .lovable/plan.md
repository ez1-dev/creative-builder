## Objetivo
Reduzir a largura do "motivo do desvio" e aumentar a de "obs" na tabela de apontamento.

## Alteração

**`src/components/producao/OpPrintSheet.tsx`** — `<colgroup>` da tabela `op-apontamento-table`. Trocar larguras atuais (11/11/14/11/11/21/21) por:

| col | atual | nova |
|---|---|---|
| 1 (inicio) | 11% | 7% |
| 2 (data) | 11% | 8% |
| 3 (tempo setup) | 14% | 10% |
| 4 (fim) | 11% | 16% |
| 5 (data) | 11% | 16% |
| 6 (qtd produzida) | 21% | 22% |
| 7 (refugo) | 21% | 21% |

Resultado nas linhas com colSpan:
- motivo do desvio (col 1-3): 36% → **25%**
- obs (col 4-5): 22% → **32%**
- operador (col 6): 21% → 22%
- check (col 7): 21% (mantém)

Sem outras mudanças.
