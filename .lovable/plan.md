# Formatação do drill Detalhes de Impostos

## Problema
No drill `DETALHES_IMPOSTOS`, várias colunas de valor (ICMS, PIS, COFINS, IPI, base de cálculo, valor bruto/líquido, etc.) aparecem como números crus — sem `R$` e sem separador de milhar/decimal padrão pt-BR. O backend nem sempre marca `format: 'currency'` nas colunas, e o inferidor atual do drawer só reconhece um conjunto fixo de chaves.

## O que vou ajustar

### `src/components/bi/drill/ComercialDrillDrawer.tsx`
Reforçar `inferFormat(key, format)` para que reconheça automaticamente como moeda/numero/percentual qualquer coluna de impostos, mantendo o que o backend mandar como prioridade:

1. **Currency (R$ com separadores pt-BR)** — qualquer chave que:
   - comece com `vl_`, `valor_`, `vlr_`, `total_`
   - contenha `imposto`, `icms`, `pis`, `cofins`, `ipi`, `iss`, `difal`, `fcp`, `csll`, `irpj`, `inss`, `iof`, `st_`, `_st`, `base_calculo`, `base_icms`, `vl_bruto`, `vl_liquido`, `vl_nf`, `vl_total`, `frete`, `seguro`, `desconto`, `acrescimo`, `outros`
   - já esteja no `CURRENCY_KEYS` atual
2. **Number (formatNumber pt-BR)** — chaves de contagem/quantidade existentes + `qtd_*`, `num_*`, `numero_*`.
3. **Percent** — `aliquota`, `aliq_*`, chaves que começam com `pct_` ou terminam em `_pct` (renderizar com `formatNumber` + `%` se ainda não houver `formatPercent` disponível no módulo BI).

Alinhamento (`right`) continua sendo derivado a partir do formato inferido, então todas as colunas monetárias passam a ficar alinhadas à direita também.

## Critério de aceite
- Todas as colunas de valor em Detalhes de Impostos exibem `R$` com separadores pt-BR (`R$ 1.234,56`).
- Colunas de alíquota mostram percentual.
- Demais drills (Nota Fiscal, Cliente, Revenda, etc.) continuam funcionando — a inferência só acrescenta casos, nunca derruba os existentes.
- Backend que envia `format` explícito continua tendo prioridade.

## Fora de escopo
Backend FastAPI, exportação CSV, outros módulos do BI.