## Objetivo

Corrigir totalização, colunas duplicadas e exportação do drill **Detalhes de Impostos** (BI Comercial), respeitando novos metadados do backend (`agregavel`, `nivel`) e novas colunas por item (`vl_item`, `vl_item_liquido`). Nada muda nos impostos ou no backend.

## Diagnóstico (verificado)

- `src/lib/bi/comercialDrillApi.ts` hoje **inventa** as colunas `total_nota` e `total_liquido_nota` via `enrichRowsWithNotaTotals()`, somando linha a linha — daí a duplicação (backend também envia essas colunas agora) e o rodapé dobrado (R$ 1.300.000,00 na NF 20997).
- `withLiquidoAndTotals()` só ignora `SKIP_TOTAL_SUM_KEYS = {total_nota, total_liquido_nota}`; não lê `column.agregavel` nem `column.nivel`.
- Grid usa `DataTableBI` em `ComercialDrillDrawer.tsx`; hoje não há rodapé visível dedicado ao drill de impostos (só CSV/XLSX totalizam).

## Escopo

Somente frontend. Arquivos:

1. `src/lib/bi/comercialDrillApi.ts`
2. `src/components/bi/drill/ComercialDrillDrawer.tsx`

## Mudanças

### 1. Contrato (`comercialDrillApi.ts`)

Estender `DrillColumn`:

```ts
export interface DrillColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: 'currency' | 'number' | 'date' | 'text';
  agregavel?: boolean;      // novo
  nivel?: 'ITEM' | 'NOTA';  // novo
}
```

Helper novo:

```ts
export function isAgregavel(c: DrillColumn) {
  return c.agregavel !== false && c.nivel !== 'NOTA';
}
```

Helper de chave fiscal e contagem distinta:

```ts
function getNotaKey(row): string { /* codemp|codfil|numnfv|codsnf, com fallback p/ cd_empresa|cd_filial|cd_nf|cd_serie */ }
export function countDistinctNotas(rows): number { /* Set(getNotaKey) */ }
```

### 2. Deduplicar colunas por `key`

Adicionar `uniqueColumns(cols)` (Map por `c.key`) e aplicar dentro de `fetchComercialDrill` antes de retornar. Isso elimina "Total da Nota / Total Líquido" duplicados quando o backend passar a enviá-los.

### 3. Ajustar `enrichRowsWithNotaTotals`

- Se backend já envia colunas `vl_total_nota`/`total_nota` ou `vl_total_liquido`/`total_liquido_nota` **não injetar**.
- Ao injetar (fallback legado), marcar as colunas como `{ agregavel: false, nivel: 'NOTA' }`.
- Manter o cálculo de valor apenas para exibição por linha (não por soma no rodapé).

### 4. Colunas novas "Valor do Item" e "Líquido do Item"

Nova função `injectItemColumns({columns, rows})`:

- Se qualquer linha tem `vl_item`/`valor_item` e a coluna ainda não existe, injetar após `cd_produto`/`ds_produto`:
  ```ts
  { key: 'vl_item', label: 'Valor do Item', align: 'right', format: 'currency', agregavel: true, nivel: 'ITEM' }
  ```
- Idem para `vl_item_liquido` → `"Líquido do Item"`.
- Leitura defensiva: `row.vl_item ?? row.valor_item ?? null`. Nunca usar `vl_total_nota` como fallback.
- Se ausentes, não injetar (colunas somem — não mostrar `—` genérico como pediu o item 16).

Chamar em sequência: `uniqueColumns → enrichRowsWithNotaTotals → injectItemColumns`. Exportar `enrichForDisplay()` unificada usada tanto pela grid quanto pelo XLSX/CSV.

### 5. Rodapé/Totais (grid + exportação)

Nova função `computeFooterRow(cols, rows)`:

```ts
for (const c of cols) {
  if (!isAgregavel(c)) { footer[c.key] = null; continue; } // renderiza "—"
  if (c.format === 'currency' || c.format === 'number') {
    footer[c.key] = sum(rows, c.key);
  }
}
```

- **CSV/XLSX** (`withLiquidoAndTotals`): trocar `SKIP_TOTAL_SUM_KEYS` por `!isAgregavel(c)`; célula desses campos vira `""` (Excel) / `—` (visual). Manter cálculo de "Valor Líquido" só se backend não enviar; **não** somar `vl_total_nota` nem `vl_total_liquido`.
- **Grid** (`ComercialDrillDrawer.tsx`): adicionar rodapé próprio para o drill `DETALHES_IMPOSTOS` (bloco abaixo do `DataTableBI`) com:
  - Quantidade de itens: `rows.length`
  - Quantidade de notas: `countDistinctNotas(rows)`
  - Valor total dos itens: soma de `vl_item`
  - Total de impostos: soma de `vl_total_impostos` (ou soma de ICMS+PIS+COFINS+IPI+ISS+outros se ausente)
  - Valor líquido dos itens: soma de `vl_item_liquido`
- Tooltip nas colunas `vl_total_nota` / `vl_total_liquido` (nivel NOTA) e `vl_item` / `vl_item_liquido` (nivel ITEM) conforme item 15.

### 6. Agrupamentos e sort/filtro

- `Valor do Item` e `Líquido do Item` entram nas colunas normais → `DataTableBI` já provê sort/filtro numérico (formato `currency`).
- Regra de agrupamento (quando existir) reaproveita `isAgregavel`. Nenhum agrupador soma `vl_total_nota` por item.

## Critérios de aceite (NF 20997)

- Grid mostra 2 linhas com `Valor do Item` = R$ 559.000 e R$ 91.000.
- Rodapé: itens=2, notas=1, valor itens=R$ 650.000,00, impostos=R$ 61.838,48, líquido=R$ 588.161,52.
- Colunas `Total da Nota` / `Total Líquido da Nota` aparecem uma única vez e mostram `—` no rodapé.
- CSV/XLSX seguem exatamente as mesmas colunas e totais da grid; sem duplicatas.
- Impostos (ICMS/PIS/COFINS/IPI/ISS) inalterados.

## Detalhes técnicos

- Tipagem: `DrillColumn.agregavel?: boolean; nivel?: 'ITEM'|'NOTA'`.
- Backward-compat: colunas sem `agregavel` continuam agregando (default `true`), exceto se `nivel === 'NOTA'`.
- Sem alterações em `comercialDrillContract.ts`, `comercialDrillCatalog.ts` ou hooks.
- Reset de estado / restart do dev server não necessário; após deploy, o usuário reinicia a API na 8070 para os novos campos aparecerem.
