## Objetivo

Nos exports CSV e Excel das drills do BI Comercial:
1. Adicionar **coluna "Valor Líquido"** calculada no frontend.
2. Adicionar **linha "TOTAL"** ao final, somando todas as colunas numéricas.

## Arquivo único afetado

`src/lib/bi/comercialDrillApi.ts` — funções `downloadDrillCsv` e `downloadDrillXlsx`.

(Sem alterações no `ComercialDrillDrawer.tsx`, no backend, na API ou no contrato de drill.)

## Mudanças

### 1. Helper `withLiquidoAndTotals(resp)`

Recebe `DrillResponse` e devolve `{ columns, rows }` enriquecidos:

- **Coluna Valor Líquido**: se as linhas tiverem ao menos `valor_total` (e algum dos redutores `valor_devolucao`/`valor_impostos`/`valor_desconto`), insere logo após `valor_total` uma coluna `valor_liquido` (label "Valor Líquido", format `currency`).
  - Fórmula por linha (mesma do `FaturamentoGeniusPage`):
    ```
    valor_liquido = (valor_total||0)
                  - (valor_devolucao||0)
                  - Math.abs(valor_impostos||0)
                  - (valor_desconto||0)
    ```
  - Se o backend já enviar `valor_liquido` ou `fat_liquido`, usa o backend (não duplica).

- **Linha TOTAL**: append de uma linha extra onde:
  - 1ª coluna textual recebe `"TOTAL"`.
  - Cada coluna `format: 'currency' | 'number'` recebe `SUM` da coluna (ignorando não-numéricos).
  - Demais colunas ficam vazias.

### 2. `downloadDrillCsv` e `downloadDrillXlsx`

Cada uma chama `withLiquidoAndTotals(resp)` antes de gerar o arquivo e usa os `columns`/`rows` retornados. Mantém:
- CSV: separador `;`, BOM, vírgula decimal (lógica atual de `fmtCsvValue` já trata número e numérico-string).
- Excel: tipos numéricos nativos, formato `R$ #,##0.00` para currency, `#,##0.00` para number.

A linha TOTAL deve ser formatada normalmente — números viram número no Excel; no CSV usam vírgula decimal.

## Critérios de aceite

- Drill "Detalhes de Impostos" e qualquer outra com `valor_total`:
  - export contém coluna **Valor Líquido** com `valor_total − devolução − |impostos| − desconto`.
  - última linha mostra **TOTAL** com a soma de todas as colunas monetárias (incluindo Valor Líquido).
- Datas, NF, série, código de produto não são somados nem alterados.
- CSV mantém vírgula decimal; Excel mantém número nativo + formato monetário.
- Nada muda no backend, no drawer ou nas drills exibidas em tela — só no arquivo exportado.

## Fora de escopo

- UI do drawer (sem coluna nova em tela).
- Modo "Milhões" (export continua em valor bruto).
- Outros módulos (Passagens, Frota, Máquinas).