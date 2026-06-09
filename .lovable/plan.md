# Colunas Total da Nota / Total Líquido da Nota nas drills

Adicionar duas colunas calculadas por NF, repetidas em todas as linhas pertencentes à mesma nota, visíveis na grid do drawer e nos exports CSV/Excel.

## Arquivo

`src/lib/bi/comercialDrillApi.ts` — concentra a lógica de enriquecimento já usada pelo drawer e pelos exports (`withLiquidoAndTotals`).

## Mudanças

### 1. Helpers novos em `comercialDrillApi.ts`

- `getNotaKey(row)`: monta chave `cd_empresa|cd_filial|cd_nf|cd_serie`; se empresa+filial vazios, usa `cd_nf|cd_serie` (fallback aceita `nf`/`serie`).
- `toNumberSafe(v)`: aceita number, string com vírgula/ponto e milhar BR; retorna 0 quando inválido.
- `getValorTotalLinha(row)`: ordem `vl_total → vl_tot_fat → vl_bruto → valor_total → vl_contabil`.
- `getValorLiquidoLinha(row)`: ordem `vl_liquido → vl_tot_liq → valor_liquido → liquido → vl_total_liquido`. Reaproveita o `valor_liquido` que já calculamos quando aplicável.

### 2. Função `enriquecerComTotaisNota(columns, rows)`

- Primeiro tenta usar campos já prontos por linha:
  - `total_nota`: `vl_total_nota → total_nota → vl_nf → valor_total_nota`
  - `total_liquido_nota`: `vl_liquido_nota → total_liquido_nota → valor_liquido_nota`
  - Se presentes em qualquer linha, usa direto sem agrupar.
- Caso contrário, percorre `rows`, agrupa por `getNotaKey` e soma `getValorTotalLinha` / `getValorLiquidoLinha` (ignora chaves vazias).
- Devolve `rows` com `total_nota` e `total_liquido_nota` injetados em cada linha + `columns` com duas colunas novas no final (`format: 'currency'`, `align: 'right'`).
- Só adiciona as colunas se a drill tiver indício de NF (`cd_nf`/`nf` em alguma linha ou coluna). Caso contrário, retorna inalterado — evita poluir drills agregadas (ACUMULADO, MENSAL, ESTADO etc.).

### 3. Integração com `withLiquidoAndTotals`

Ordem: `enriquecerComTotaisNota` roda **antes** de gerar a linha TOTAL e **depois** da coluna Valor Líquido. A linha TOTAL existente continua somando colunas `currency/number` linha a linha — `total_nota` e `total_liquido_nota` ficarão **em branco** nessa linha (evita duplicação por NF). Implementação: marcar essas duas chaves num `Set` e, no loop da linha TOTAL, deixar `''` para elas.

### 4. Exposição no drawer (`ComercialDrillDrawer.tsx`)

Hoje o drawer renderiza a grid a partir de `resp.columns`/`resp.rows` brutos e só passa `withLiquidoAndTotals` nos botões CSV/Excel. Para as colunas aparecerem **na tela** também:

- Extrair a parte de enriquecimento de NF para função exportada `enrichRowsWithNotaTotals(resp)` retornando `{ columns, rows }` (sem a linha TOTAL).
- No `useMemo` de `displayColumns`/dados da tabela, aplicar `enrichRowsWithNotaTotals` ao `resp` antes das injeções existentes (nm_cliente, ds_produto etc.).
- Passar `rows` enriquecidas para `DataTableBI`.
- Os botões CSV/Excel continuam chamando `downloadDrillCsv`/`downloadDrillXlsx`, que internamente chamam `withLiquidoAndTotals` (que por sua vez chama o enriquecimento + linha TOTAL com as duas colunas zeradas).

### 5. Formatação

- CSV: `fmtCsvValue` com `format: 'currency'` já converte ponto em vírgula → ok.
- Excel: loop existente aplica `R$ #,##0.00` em colunas `currency` → ok.
- Grid: `fmtCell` já formata `currency` via `formatCurrency`.

## Fora de escopo

- Backend / API.
- Outras drills/módulos (Passagens, Frota, Máquinas).
- Modo "milhões": CSV continua bruto.
- Rodapé do DataTable na tela (sem rodapé de soma automático hoje).

## Aceite

- Drills com NF (`NOTA_FISCAL`, `DETALHES_IMPOSTOS` e qualquer outra que tenha `cd_nf` por linha) mostram "Total da Nota" e "Total Líquido da Nota" na grid e nos exports.
- Linhas da mesma NF repetem os mesmos valores.
- Linha TOTAL do export deixa essas duas colunas vazias (não duplica).
- CSV usa vírgula decimal; Excel mantém número/moeda.
- Datas, códigos, NF e série inalterados.
- Drills sem NF (ACUMULADO, MENSAL, ESTADO etc.) não ganham as colunas.
