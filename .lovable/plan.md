# Patch FastAPI — Faturamento Genius (consolidado)

📄 **Documento mestre:** [`docs/backend-faturamento-genius-PATCH.md`](../docs/backend-faturamento-genius-PATCH.md)

Cobre, num único arquivo:

1. **CUSMED → PREMED** em `E075DER` (regressão histórica).
2. **Classificação de revenda canônica**: `USU_REVPED` → `USU_REVNF` (≠ '0') → `'OUTROS'`, aplicada em todas as subqueries + `WHERE` + `GROUP BY`.
3. **SELECT agregado canônico** com os 5 campos da view `USU_VMBRUTANFE`:
   - `USU_VLRBRU` → `valor_total`
   - `ABS(SUM(USU_VLRDEV))` → `valor_devolucao`
   - `ABS(SUM(USU_VLRDSC))` → `valor_desconto` (**novo**)
   - `ABS(SUM(USU_VLRICM+USU_VLRIPI+USU_VLRCOF+USU_VLRPIS+USU_VLRISS))` → `valor_impostos`
   - Sinais em **módulo** para evitar inversão dupla.
4. **Coluna `valor_desconto`** no SELECT do detalhe.
5. **Recalcular** em Python (kpis + cada bucket + exportação Excel):
   ```python
   valor_liquido = valor_total - valor_devolucao - abs(valor_impostos) - (valor_desconto or 0)
   ```
6. **JSON expõe ambos** `fat_liquido` e `valor_liquido` (mesmo valor — compatibilidade).
7. **Smoke-test** Mar/2026 GENIUS: 191.603 / 821 / 1.738 / 27.370 / **161.674**.

## Frontend — pronto

`src/pages/FaturamentoGeniusPage.tsx` já usa
`valor_total - valor_devolucao - |valor_impostos| - (valor_desconto ?? 0)`
em `computeKpis`, `kpisFromPorRevenda` e `subtractOutros`. Assim que o backend
publicar, os cards passam a bater **sem novo deploy do frontend**.

## Documentos antigos (referência histórica, marcados como superseded)

- `docs/backend-faturamento-genius-cusmed.md`
- `docs/backend-faturamento-genius-desconto.md`
- `docs/backend-faturamento-genius-desconto-PATCH.md`
