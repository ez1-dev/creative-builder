# PATCH FastAPI — Faturamento Genius (consolidado)

> **Documento mestre.** Substitui:
> - `backend-faturamento-genius-cusmed.md`
> - `backend-faturamento-genius-desconto.md`
> - `backend-faturamento-genius-desconto-PATCH.md`
>
> **Endpoints afetados:**
> - `GET /api/faturamento-genius-dashboard` (agregado: kpis, por_revenda, por_origem, por_anomes/por_mes, por_cliente, por_produto)
> - `GET /api/faturamento-genius` (detalhe + exportação Excel)
>
> **Fonte oficial:** view `dbo.USU_VMBRUTANFE` — já consumida pelo backend via `OBJ_VM_FATURAMENTO`.

---

## 0. Resultado esperado (Mar/2026 · revenda GENIUS)

| Campo | Valor |
|---|---:|
| Faturamento (`valor_total`) | ≈ **191.603** |
| Devolução (`valor_devolucao`) | ≈ **821** |
| Desconto (`valor_desconto`) | ≈ **1.738** |
| Impostos (`valor_impostos`, módulo) | ≈ **27.370** |
| **Fat. Líquido (`fat_liquido` / `valor_liquido`)** | ≈ **161.674** |

Fórmula oficial (frontend e backend devem usar a mesma):

```
valor_liquido = valor_total − valor_devolucao − |valor_impostos| − valor_desconto
```

---

## 1. Validação prévia no SQL Server

Rode antes de mexer no Python — confirma que a view tem os números certos:

```sql
SELECT
  CAST(SUM(COALESCE(USU_VLRBRU,0)) AS FLOAT) AS faturamento,
  CAST(ABS(SUM(COALESCE(USU_VLRDEV,0))) AS FLOAT) AS devolucao,
  CAST(ABS(SUM(COALESCE(USU_VLRDSC,0))) AS FLOAT) AS desconto,
  CAST(ABS(SUM(COALESCE(USU_VLRICM,0)
              + COALESCE(USU_VLRIPI,0)
              + COALESCE(USU_VLRCOF,0)
              + COALESCE(USU_VLRPIS,0)
              + COALESCE(USU_VLRISS,0))) AS FLOAT) AS impostos
FROM dbo.USU_VMBRUTANFE
WHERE USU_CODEMP = 1
  AND USU_ANO    = 2026
  AND MONTH(USU_DATA) = 3
  AND (
    CASE
      WHEN NULLIF(LTRIM(RTRIM(USU_REVPED)),'') IS NOT NULL
        THEN LTRIM(RTRIM(USU_REVPED))
      WHEN NULLIF(LTRIM(RTRIM(USU_REVNF)),'') IS NOT NULL
       AND LTRIM(RTRIM(USU_REVNF)) <> '0'
        THEN LTRIM(RTRIM(USU_REVNF))
      ELSE 'OUTROS'
    END
  ) = 'GENIUS';
-- Esperado: 191.603 / 821 / 1.738 / 27.370
```

Se algum valor não bater, replicar no `WHERE` o mesmo filtro do endpoint atual (provavelmente inclui `USU_VENFAT = 'S'` e `USU_ORIGEM IN (...)`).

---

## 2. Classificação canônica de revenda

Usar **em todas** as subqueries: detalhe, kpis, por_revenda, por_origem, por_anomes/por_mes, por_cliente, por_produto, exportação Excel.

Regra:
1. Se `USU_REVPED` tem conteúdo → usar `USU_REVPED`.
2. Senão, se `USU_REVNF` tem conteúdo e é `<> '0'` → usar `USU_REVNF`.
3. Caso contrário → `'OUTROS'`.

```sql
CASE
  WHEN NULLIF(LTRIM(RTRIM(VM.USU_REVPED)),'') IS NOT NULL
    THEN LTRIM(RTRIM(VM.USU_REVPED))
  WHEN NULLIF(LTRIM(RTRIM(VM.USU_REVNF)),'') IS NOT NULL
   AND LTRIM(RTRIM(VM.USU_REVNF)) <> '0'
    THEN LTRIM(RTRIM(VM.USU_REVNF))
  ELSE 'OUTROS'
END AS revenda
```

Aplicar o mesmo `CASE` no `WHERE` quando o filtro `revenda=GENIUS` vier na query string, e no `GROUP BY` do bucket `por_revenda`.

---

## 3. SELECT agregado canônico

Em **toda** subquery / CTE que monta `kpis`, `por_revenda`, `por_origem`, `por_anomes`/`por_mes`, `por_cliente`, `por_produto`:

```sql
CAST(SUM(COALESCE(VM.USU_VLRBRU,0)) AS FLOAT)        AS valor_total,
CAST(ABS(SUM(COALESCE(VM.USU_VLRDEV,0))) AS FLOAT)   AS valor_devolucao,
CAST(ABS(SUM(COALESCE(VM.USU_VLRDSC,0))) AS FLOAT)   AS valor_desconto,
CAST(ABS(SUM(COALESCE(VM.USU_VLRICM,0)
            + COALESCE(VM.USU_VLRIPI,0)
            + COALESCE(VM.USU_VLRCOF,0)
            + COALESCE(VM.USU_VLRPIS,0)
            + COALESCE(VM.USU_VLRISS,0))) AS FLOAT)  AS valor_impostos,
```

> **Sinais (importante):** o frontend já usa a fórmula com `|valor_impostos|`
> e subtrai devolução e desconto como positivos. Por isso entregamos os 3
> redutores (`valor_devolucao`, `valor_desconto`, `valor_impostos`) **em módulo**
> (`ABS(SUM(...))`). Assim **não há inversão dupla** em nenhum cenário,
> independente de a view armazenar com sinal `+` ou `−`.

---

## 4. SELECT do detalhe (`/api/faturamento-genius`)

Adicionar a coluna por linha no SELECT que monta o array `dados`:

```sql
CAST(COALESCE(VM.USU_VLRDSC, 0) AS FLOAT) AS valor_desconto,
```

Os campos `valor_total`, `valor_devolucao`, `valor_icms`, `valor_ipi`, `valor_pis`, `valor_cofins` já existem hoje — manter.

---

## 5. Cálculo Python (kpis + cada bucket)

Procurar a fórmula atual:

```python
valor_liquido = valor_total - valor_devolucao - abs(valor_impostos)
```

e trocar por:

```python
valor_liquido = (
    valor_total
    - valor_devolucao
    - abs(valor_impostos)
    - (valor_desconto or 0)
)
margem_bruta      = valor_liquido - valor_custo
margem_percentual = (margem_bruta / valor_liquido * 100) if valor_liquido > 0 else 0
```

Aplicar em **todos** os pontos:
- montagem do `kpis` global
- loop que monta cada item de `por_revenda`
- idem `por_origem`, `por_anomes` / `por_mes`, `por_cliente`, `por_produto`
- rota / serviço de **exportação Excel**

> **Compatibilidade:** expor **dois aliases** no JSON, `fat_liquido` (legado, já
> usado pelo frontend) **e** `valor_liquido` (nome solicitado no patch).
> Ambos com o mesmo valor.

---

## 6. Schema JSON garantido

```json
{
  "kpis": {
    "valor_total":     191603,
    "valor_devolucao":    821,
    "valor_desconto":    1738,
    "valor_impostos":  27370,
    "fat_liquido":    161674,
    "valor_liquido":  161674,
    "margem_bruta":    "...",
    "margem_percentual": "..."
  },
  "por_revenda": [
    { "revenda":"GENIUS", "valor_total":191603, "valor_devolucao":821,
      "valor_desconto":1738, "valor_impostos":27370,
      "fat_liquido":161674, "valor_liquido":161674 }
  ],
  "por_anomes": [
    { "anomes":"202603", "valor_total":191603, "valor_devolucao":821,
      "valor_desconto":1738, "valor_impostos":27370,
      "fat_liquido":161674, "valor_liquido":161674 }
  ],
  "por_origem": [
    { "origem":"...", "valor_desconto":"...", "valor_liquido":"..." }
  ],
  "dados": [
    { "numero_nf":"...", "valor_total":"...", "valor_desconto":12.34,
      "valor_icms":"...", "valor_ipi":"...", "valor_pis":"...",
      "valor_cofins":"..." }
  ]
}
```

---

## 7. Lembrete CUSMED → PREMED (regressão histórica)

A coluna `CUSMED` **não existe** em `E075DER`. Substituir globalmente:

```diff
- DER.CUSMED
+ DER.PREMED
```

`grep -i CUSMED` no projeto FastAPI deve retornar zero. JOIN canônico:

```sql
LEFT JOIN dbo.E075DER DER
  ON DER.CODEMP = <empresa>
 AND DER.CODPRO = IPV.CODPRO
 AND DER.CODDER = IPV.CODDER
```

Caso o backend ainda referencie `CUSMED`, o endpoint devolve
`Nome de coluna 'CUSMED' inválido` e o frontend exibe erro cru.

---

## 8. Smoke-test do endpoint

```
GET /api/faturamento-genius-dashboard?anomes_ini=202603&anomes_fim=202603&revenda=GENIUS
```

Conferir:

| Campo | Esperado |
|---|---:|
| `kpis.valor_total` | ≈ 191.603 |
| `kpis.valor_devolucao` | ≈ 821 |
| `kpis.valor_desconto` | ≈ 1.738 |
| `kpis.valor_impostos` | ≈ 27.370 |
| `kpis.fat_liquido` = `kpis.valor_liquido` | ≈ 161.674 |
| `por_revenda[GENIUS].*` | mesmos números |
| `por_anomes[202603].*` | mesmos números |

Repetir os 4 meses oficiais (Jan/Fev/Mar/Abr 2026) — targets em
`mem://features/faturamento-genius-targets`.

---

## 9. Frontend — sem alteração necessária

`src/pages/FaturamentoGeniusPage.tsx` já calcula em `computeKpis`,
`kpisFromPorRevenda` e `subtractOutros`:

```ts
const fat_liquido =
  valor_total - valor_devolucao - Math.abs(valor_impostos) - (valor_desconto ?? 0);
```

Assim que este patch subir em produção, os cards "Impostos", "Descontos" e
"Fat. Líquido" passam a bater com o relatório oficial Genius
**automaticamente**, sem novo deploy do frontend.

---

## Checklist final

- [ ] CUSMED → PREMED em todo o projeto FastAPI (`grep -i CUSMED` = 0)
- [ ] `CASE` de revenda canônico aplicado em **todas** as subqueries + `WHERE` + `GROUP BY`
- [ ] Validação SQL prévia (item 1) bate ≈ 191.603 / 821 / 1.738 / 27.370 para Mar/2026
- [ ] SELECT agregado canônico (item 3) com `ABS(SUM(...))` nos 3 redutores
- [ ] Coluna `valor_desconto` adicionada no SELECT do detalhe
- [ ] `valor_liquido` recalculado em Python (kpis + cada bucket + exportação Excel)
- [ ] `margem_bruta` / `margem_percentual` recalculados a partir do novo líquido
- [ ] JSON expõe `valor_desconto` em `kpis` + cada bucket + `dados`
- [ ] JSON expõe **ambos** `fat_liquido` e `valor_liquido` (mesmo valor)
- [ ] Smoke-test bate os 4 meses oficiais (Jan/Fev/Mar/Abr 2026) para GENIUS
- [ ] Avisar o frontend (já está pronto, só precisa do redeploy do FastAPI)
