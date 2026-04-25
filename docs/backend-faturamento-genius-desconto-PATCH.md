# PATCH FastAPI — `valor_desconto` no Faturamento Genius

> ⚠️ **Substituído por `docs/backend-faturamento-genius-PATCH.md`** (patch consolidado e definitivo, que cobre também a regra de revenda `USU_REVPED`/`USU_REVNF`/`OUTROS`, sinais com `ABS(SUM(...))`, alias `valor_liquido` e CUSMED→PREMED). Mantido como referência histórica.

> **Fonte oficial:** view `dbo.USU_VMBRUTANFE` (já consumida pelo backend via
> `OBJ_VM_FATURAMENTO`). A view **já agrega** `USU_VLRDSC` por linha — não é
> preciso ir até `E140IPV.VLRDSC`.

Endpoints afetados:

- `GET /api/faturamento-genius-dashboard`
- `GET /api/faturamento-genius` (detalhe)

---

## 0. Validação prévia no SQL Server

Rode antes de mexer no Python — confirma que a view tem o desconto certo:

```sql
SELECT
  CAST(SUM(COALESCE(USU_VLRDSC, 0)) AS FLOAT) AS desconto_genius_mar26,
  CAST(SUM(COALESCE(USU_FATLIQ, 0)) AS FLOAT) AS fatliq_view_mar26,
  CAST(SUM(COALESCE(USU_VLBRU2, 0)) AS FLOAT) AS fatbru_mar26
FROM dbo.USU_VMBRUTANFE
WHERE USU_CODEMP = 1
  AND USU_ANO    = 2026
  AND MONTH(USU_DATA) = 3
  AND USU_ORIGEM IN ('110','120','130','135','140','150',
                     '205','208',
                     '210','220','230','235','240','245','250');
-- Esperado:
--   desconto_genius_mar26 ≈ 1.738
--   fatliq_view_mar26     ≈ 161.674
```

Se algum valor não bater, replique no `WHERE` o mesmo filtro do endpoint atual
(provavelmente inclui `USU_VENFAT = 'S'`).

---

## 1. SELECT do detalhe (`/api/faturamento-genius`)

Adicionar a coluna por linha no SELECT que monta `dados`:

```sql
CAST(COALESCE(VM.USU_VLRDSC, 0) AS FLOAT) AS valor_desconto,
```

> Use o alias real da view no seu SQL (provavelmente `VM`, `F` ou `USU_VMBRUTANFE`).

---

## 2. SELECT dos agregados (`/api/faturamento-genius-dashboard`)

Em **toda** subquery / CTE / `GROUP BY` que monta `kpis`, `por_revenda`,
`por_origem`, `por_anomes`, `por_cliente`, `por_produto`, adicionar:

```sql
CAST(SUM(COALESCE(VM.USU_VLRDSC, 0)) AS FLOAT) AS valor_desconto,
```

Não é necessário o `CASE WHEN TNS IN (devolução)` — a view já trata isso
internamente em `USU_VLRDSC` (e o componente de devolução fica em `USU_VLRDEV`).

---

## 3. Recalcular `valor_liquido` em Python

Procure a fórmula atual:

```python
valor_liquido = valor_total - valor_devolucao - abs(valor_impostos)
```

e troque por:

```python
valor_liquido = (
    valor_total
    - valor_devolucao
    - abs(valor_impostos)
    - (valor_desconto or 0)
)
```

Aplicar em **todos** os pontos:

- montagem do `kpis` global
- loop que monta cada item de `por_revenda`
- idem `por_origem`, `por_anomes`, `por_cliente`, `por_produto`
- e onde calcula `margem_bruta` / `margem_percentual` (que dependem do líquido)

---

## 4. Schema da resposta

Garantir que o JSON devolvido contenha `valor_desconto` em cada bucket:

```json
{
  "kpis": {
    "valor_total":     191603,
    "valor_devolucao":    821,
    "valor_impostos":  -27370,
    "valor_desconto":    1738,
    "fat_liquido":     161674,
    "...": "..."
  },
  "por_revenda": [
    { "revenda": "GENIUS", "valor_desconto": 1738, "fat_liquido": 161674, "...": "..." }
  ],
  "por_anomes": [
    { "anomes": "202603", "valor_desconto": 1738, "fat_liquido": 161674, "...": "..." }
  ],
  "por_origem": [
    { "...": "...", "valor_desconto": "..." }
  ],
  "dados": [
    { "...": "...", "valor_desconto": 12.34 }
  ]
}
```

---

## 5. Smoke-test do endpoint

```
GET /api/faturamento-genius-dashboard?anomes_ini=202603&anomes_fim=202603&revenda=GENIUS
```

Conferir:

| Campo                                | Esperado    |
|--------------------------------------|------------:|
| `kpis.valor_total`                   | ≈ 191.603   |
| `kpis.valor_devolucao`               | ≈     821   |
| `kpis.valor_impostos` (abs)          | ≈  27.370   |
| `kpis.valor_desconto`                | ≈   1.738   |
| `kpis.fat_liquido`                   | ≈ 161.674   |
| `por_revenda[GENIUS].valor_desconto` | ≈   1.738   |
| `por_anomes[202603].valor_desconto`  | ≈   1.738   |

Repetir para Jan/Fev/Abr 2026 (ver targets em
`mem://features/faturamento-genius-targets`).

---

## 6. Frontend — sem alteração necessária

`src/pages/FaturamentoGeniusPage.tsx` já lê `valor_desconto ?? 0` em
`computeKpis`, `kpisFromPorRevenda` e `subtractOutros`. Assim que este patch
subir em produção, os cards "Impostos" e "Fat. Líquido" passam a bater
**automaticamente** com o relatório oficial Genius — sem novo deploy do
frontend.

---

## Checklist final

- [ ] Validação SQL prévia retornou ≈ 1.738 para Mar/2026
- [ ] Coluna `valor_desconto` adicionada no SELECT do detalhe
- [ ] `SUM(USU_VLRDSC) AS valor_desconto` adicionado em **todos** os agregados
- [ ] `valor_liquido` recalculado em Python (kpis + cada bucket)
- [ ] `margem_bruta` / `margem_percentual` recalculados a partir do novo líquido
- [ ] Resposta JSON expõe `valor_desconto` em `kpis` + cada bucket + `dados`
- [ ] Smoke-test `GET /api/faturamento-genius-dashboard` bate os 4 meses oficiais
- [ ] Avisar o frontend (já está pronto, só precisa do redeploy do FastAPI)
