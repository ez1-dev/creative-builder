## Objetivo

Sempre que mostrarmos um código (recurso, operação, produto, origem), exibir **código + descrição** juntos — tanto nas células das tabelas quanto, principalmente, nos cabeçalhos das **linhas-pai do agrupador** (hoje aparece só `01`, `MAQ-23`, etc., sem contexto).

## Onde aplicar

### 1. Linhas-pai do agrupador (`GroupedRows.tsx`)
Hoje o header mostra apenas `Recurso: 01 · 12 linhas`. Vai passar a mostrar `Recurso: 01 — Torno CNC #1 · 12 linhas`.

Como o `useTableGrouping` agrupa por uma chave (`codcre`, `codccu`, …), preciso resolver a descrição correspondente. Estratégia:

- O `GroupNode` ganha um campo opcional `label?: string` (default = `value`).
- Em `useTableGrouping`, quando construir um nó de um campo conhecido (`codcre`), pego a `descre` da primeira `row` daquele bucket e monto `label = "<codcre> — <descre>"`.
- Mapa fixo de campos que ganham descrição:
  - `codcre` → `descre`
  - `codccu` → (não há descrição no backend; usa só o código)
  - `unidade_negocio` / `tipo_recurso` → já são rótulos, sem mudança.

### 2. Células de código nas tabelas
Renderizar `código — descrição` em uma única célula (mais compacto, evita poluição visual). Aplicar:

- **`PorRecursoTable`**: coluna "Recurso" passa a mostrar `codcre — descre` e **remover** a coluna separada "Descrição" (redundante). Ajustar colspan do header de grupo de `5` → `4` e colspan da linha "Total geral" de `5` → `4`.
- **`CentrosRecursoTab`**: 
  - coluna "Centro recurso" → `codcre — descre`, remover coluna "Descrição recurso".
  - coluna "Operação" → `codopr — desopr`, remover coluna "Descrição operação".
  - Ajustar colspan de grupo de `7` → `5` e o `colSpan={12}` dos rows de loading/empty para `10`.
- **`DetalheOpsTab`**:
  - coluna "Recurso" → `codcre — descre`, remover "Descrição".
  - coluna "Operação" → `codopr — descricao_operacao`, remover "Descrição operação".
  - coluna "Produto" → `codpro — descricao_produto`, remover "Descrição produto".
  - coluna "Origem" (`codori`) — backend não retorna descrição; permanece código apenas.
  - Ajustar colspan de grupo de `15` → `12`, `colSpan={22}` → `19`.

### 3. Chips do `GroupByBar`
Sem mudança (continuam mostrando apenas o nome do campo, ex.: "Recurso"). O detalhe (código+descrição) aparece dentro de cada linha-pai gerada.

## Formato visual da célula combinada

```
<span class="font-mono">01</span>
<span class="text-muted-foreground"> — Torno CNC #1</span>
```

(código em fonte monoespaçada para alinhar, descrição em cor secundária.)

## Limitação

`codccu` (Centro de Custo) **não vem com descrição** no backend atual. Vai continuar mostrando só o código. Se quiser, posso pedir ao backend para incluir `desccu` numa próxima rodada.

## Arquivos

- `src/components/producao/carga-dashboard/useTableGrouping.ts` — adicionar `label` ao `GroupNode` + resolver descrição via `row[descKey]`.
- `src/components/producao/carga-dashboard/GroupedRows.tsx` — usar `node.label ?? node.value`.
- `src/components/producao/carga-dashboard/PorRecursoTable.tsx` — colunas + colspans.
- `src/components/producao/carga/CentrosRecursoTab.tsx` — colunas + colspans.
- `src/components/producao/carga/DetalheOpsTab.tsx` — colunas + colspans.