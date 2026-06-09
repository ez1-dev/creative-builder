## Ordenação padrão das grids do BI Comercial

A prop `defaultSort` já existe no `DataTable` e está repassada pelo `DataTableBI`. Faltam dois ajustes: validar a chave quando as colunas mudam e corrigir as chaves passadas em `ComercialPage` (as atuais — `vl_tot_fat` — não existem nos dados, então a ordenação cai no fallback).

### Mudanças

**1. `src/components/erp/DataTable.tsx` — validar `sortKey` quando as colunas mudam**

Hoje, se a coluna ordenada sumir (ex.: `cd_rev_pedido` quando `unidade === 'ESTRUTURAL ZORTEA'`), `sortKey` continua apontando para uma chave inexistente. Adicionar `useEffect` que:

- Verifica se `sortKey` está presente em `columns.map(c => c.key)`.
- Se não estiver, limpa `sortKey`/`sortDir` (cai no fallback automático: 1ª coluna numérica `desc`, comportamento já existente).

Não recriar o estado a cada render — só limpar quando a chave realmente desaparecer.

**2. `src/components/bi/tables/DataTableBI.tsx`**

Sem alterações — já repassa `defaultSort`.

**3. `src/pages/bi/ComercialPage.tsx`**

Corrigir as chaves para refletir os campos que realmente existem nos dados:

- **Mensal** (`colsMensal`): trocar `vl_tot_fat` por `faturamento` (campo principal de faturamento da linha mensal).
- **Detalhamento por Nota Fiscal** (`colsDetalhes`): trocar `vl_tot_fat` por `vl_liquido` (existe na linha; fallback natural seria `vl_bruto`).

Observação: o spec do usuário mencionou `vl_tot_fat`, mas esse campo não existe em nenhum dos dois conjuntos de dados. Mantendo o mesmo intuito (faturamento desc), uso os campos reais já renderizados nas colunas.

### Fora de escopo

- API / backend / contrato de drill.
- Filtros, drill, agrupamentos.
- Outras telas (Passagens etc.).

### Validação

- `/bi/comercial` → aba Mensal abre ordenada por **Faturamento desc**.
- Detalhamento por Nota Fiscal abre ordenado por **Líquido desc** (maiores NFs no topo).
- Mudar unidade para **ESTRUTURAL ZORTEA** (remove coluna Revenda) não quebra a ordenação — se a chave atual sumir, cai no fallback automático.
- Demais grids (sem `defaultSort` explícito) continuam ordenando pela 1ª coluna numérica `desc`.
- Clique no cabeçalho continua alternando `asc → desc → sem ordenação`.
- Sem erro React #310 (não há novos hooks condicionais; o `useEffect` adicionado é incondicional).
