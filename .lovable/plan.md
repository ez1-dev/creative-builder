## Objetivo

No drill **Detalhes de Impostos** (BI Comercial), separar corretamente a visualização por **ITEM** e por **NOTA**. Hoje, quando a grid está no nível ITEM, as colunas `Total da Nota` e `Total Líquido da Nota` aparecem repetidas por item e ainda são somadas no rodapé (R$ 650.000 + R$ 650.000 = R$ 1.300.000). Impostos e cálculos por item permanecem inalterados.

## Diagnóstico (verificado)

- `src/lib/bi/comercialDrillApi.ts` já marca `total_nota`/`total_liquido_nota` como `nivel: 'NOTA', agregavel: false` e `withLiquidoAndTotals` já respeita `isAgregavel` para a linha TOTAL do CSV/XLSX. Porém as colunas continuam sendo **exibidas** no nível ITEM.
- `src/components/bi/drill/ComercialDrillDrawer.tsx` renderiza `displayColumns` sem filtrar por `nivel` e não injeta rodapé próprio; o `DataTableBI` mostra o totalizador padrão que hoje ignora `isAgregavel` (daí o R$ 1.300.000 visível no screenshot).
- Drill `DETALHES_IMPOSTOS` é sempre nível ITEM. Não existe ainda um drill agregado por NF (o `NOTA_FISCAL` atual já lista por nota, mas é um drill separado — não é reagrupamento da mesma tela).

## Escopo

Somente frontend. Sem alteração no backend, no cálculo de impostos ou nas dimensões.

Arquivos:
1. `src/lib/bi/comercialDrillApi.ts`
2. `src/components/bi/drill/ComercialDrillDrawer.tsx`

## Mudanças

### 1. Identificar o nível da visualização

Em `comercialDrillApi.ts`, novo helper:

```ts
export type NivelVisualizacao = 'ITEM' | 'NOTA';

export function inferNivelVisualizacao(
  drillType: DrillType,
  columns: DrillColumn[],
  rows: DrillRow[],
): NivelVisualizacao {
  if (drillType === 'NOTA_FISCAL') return 'NOTA';
  if (drillType === 'DETALHES_IMPOSTOS') return 'ITEM';
  // Fallback: se qualquer coluna/linha tiver produto → ITEM.
  const hasItem =
    columns.some((c) => c.key === 'cd_produto' || c.key === 'vl_item') ||
    rows.some((r) => r?.cd_produto != null || r?.vl_item != null);
  return hasItem ? 'ITEM' : 'NOTA';
}
```

### 2. Filtrar colunas conforme o nível (grid + export)

Novo helper compartilhado:

```ts
const COLUNAS_NIVEL_NOTA = new Set([
  'vl_total_nota', 'total_nota', 'vl_nf', 'valor_total_nota',
  'vl_liquido_nota', 'total_liquido_nota', 'valor_liquido_nota', 'vl_total_liquido',
]);

export function filterColumnsByNivel(
  cols: DrillColumn[],
  nivel: NivelVisualizacao,
): DrillColumn[] {
  return cols.filter((c) => {
    if (nivel === 'ITEM' && (c.nivel === 'NOTA' || COLUNAS_NIVEL_NOTA.has(c.key))) return false;
    if (nivel === 'NOTA' && c.nivel === 'ITEM') return false;
    return true;
  });
}
```

`enrichForDisplay` ganha assinatura opcional `enrichForDisplay(resp, nivel?)` e, quando `nivel` é passado, aplica `filterColumnsByNivel` no final. Compatibilidade: sem `nivel`, comportamento atual preservado.

### 3. Rodapé por nível

Substituir a lógica atual de linha TOTAL (`withLiquidoAndTotals`) e o rodapé da grid para respeitarem o nível:

```ts
export function calcularTotal(
  col: DrillColumn,
  rows: DrillRow[],
  nivel: NivelVisualizacao,
): number | null {
  if (!isAgregavel(col)) return null;
  if (nivel === 'ITEM' && col.nivel === 'NOTA') return null;
  // NOTA: deduplica por chave fiscal antes de somar colunas de NOTA.
  const base = nivel === 'NOTA' && col.nivel === 'NOTA' ? getNotasDistintas(rows) : rows;
  return base.reduce((s, r) => s + toNumberSafe(r[col.key]), 0);
}

export function getNotasDistintas(rows: DrillRow[]): DrillRow[] {
  const map = new Map<string, DrillRow>();
  for (const r of rows) {
    const k = getNotaKey(r);
    if (!map.has(k)) map.set(k, r);
  }
  return Array.from(map.values());
}
```

`withLiquidoAndTotals` passa a receber o `nivel` (default inferido) e usa `calcularTotal` — assim colunas não agregáveis ou de nível NOTA em visão ITEM saem vazias no XLSX/CSV, e colunas de nível NOTA em visão NOTA somam sobre notas distintas.

### 4. Grid — `ComercialDrillDrawer.tsx`

- Calcular `const nivel = inferNivelVisualizacao(cur.drill_type, resp.columns, resp.rows);`
- Passar `nivel` ao `enrichForDisplay` → `displayColumns` já vem sem colunas de NOTA no modo ITEM (some totalmente do header do screenshot).
- Adicionar um bloco de rodapé próprio abaixo do `DataTableBI` apenas para `DETALHES_IMPOSTOS` (nível ITEM), usando `calcularTotal`:
  - Itens: `rows.length`
  - Notas: `countDistinctNotas(rows)`
  - Valor dos Itens: soma de `vl_item`
  - Total de Impostos: soma de `vl_total_impostos` (fallback ICMS+PIS+COFINS+IPI+ISS+outros)
  - Líquido dos Itens: soma de `vl_item_liquido`
- Para `NOTA_FISCAL`, rodapé exibe: Notas = `countDistinctNotas`, Total da Nota, Total Líquido, Total de Impostos — sempre via `calcularTotal(..., 'NOTA')`, deduplicando por `getNotaKey`.

### 5. Exportação (CSV/XLSX)

`downloadDrillCsv`/`downloadDrillXlsx` chamam `withLiquidoAndTotals(resp, nivel)` com o mesmo `nivel` calculado — garante que exportação e grid mostrem exatamente as mesmas colunas e o mesmo total. Nenhuma lista de colunas paralela é mantida.

### 6. Backward-compat

- `NOTA_FISCAL` continua funcionando como hoje (agora com dedupe formal no rodapé). Não altera `NEXT_DRILLS`.
- Drills sem indício de item/nota (ACUMULADO, MENSAL, ESTADO, etc.) caem no default `NOTA` mas nada muda porque não têm colunas `nivel: 'ITEM'` nem `nivel: 'NOTA'`.

## Critérios de aceite (NF 20997)

- Grid ITEM (`DETALHES_IMPOSTOS`): **não aparece** `Total da Nota` nem `Total Líquido da Nota`.
- Duas linhas: Item 250000978 = R$ 559.000,00 · Item 250000101 = R$ 91.000,00.
- Rodapé ITEM: Itens=2 · Notas=1 · Valor dos Itens=R$ 650.000,00 · Impostos=R$ 61.838,48 · Líquido dos Itens=R$ 588.161,52. Nada de R$ 1.300.000,00.
- Grid NOTA (`NOTA_FISCAL`): uma única linha por NF; NF 20997 aparece uma vez, Total=R$ 650.000,00, Líquido=R$ 588.161,52.
- CSV/XLSX seguem exatamente as colunas e totais da grid do mesmo nível.
- Impostos por item (ICMS/PIS/COFINS/IPI/ISS) inalterados.

## Detalhes técnicos

- Novos exports em `comercialDrillApi.ts`: `NivelVisualizacao`, `inferNivelVisualizacao`, `filterColumnsByNivel`, `calcularTotal`, `getNotasDistintas`.
- `enrichForDisplay(resp, nivel?)` e `withLiquidoAndTotals(resp, nivel?)` — parâmetro opcional para não quebrar chamadores existentes.
- Rodapé da grid renderizado dentro do `ComercialDrillDrawer` (fora do `DataTableBI`) para evitar acoplar a lib genérica ao contrato de impostos.
- Nenhuma alteração em `comercialDrillContract.ts`, `comercialDrillCatalog.ts`, hooks ou endpoints.
