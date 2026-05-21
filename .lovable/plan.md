## Objetivo
Reduzir a célula "motivo do desvio" para a mesma largura da coluna `inicio` (col 1), ampliando `obs`.

## Alteração

**`src/components/producao/OpPrintSheet.tsx`** — linhas das duas tr inferiores de cada bloco (cabeçalho e dados de "motivo do desvio / obs / operador / check"):

- motivo do desvio: `colSpan={3}` → **`colSpan={1}`** (largura = col 1 = 11%)
- obs: `colSpan={2}` → **`colSpan={4}`** (cols 2-5 = 45%)
- operador: mantém col 6 (22%)
- check: mantém col 7 (22%)

Aplicar em ambas as tr (`op-apt-head` da segunda metade e `op-apt-fill op-apt-row-end`).

Sem outras mudanças.
