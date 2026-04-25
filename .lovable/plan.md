## Objetivo

Consolidar num único documento o patch que o time backend (FastAPI, fora deste repo Lovable) precisa aplicar para que `/api/faturamento-genius-dashboard` bata com o relatório oficial Genius (Mar/2026: Fat 191.603, Dev 821, Impostos 27.370, Desconto 1.738, Fat.Líq 161.674).

Como o `.py` do FastAPI não está versionado aqui, **este projeto entrega apenas a documentação do patch** — o backend aplica e faz deploy.

## Estado atual do frontend (já pronto, nada a mudar no código)

`src/pages/FaturamentoGeniusPage.tsx` já calcula em `computeKpis`, `kpisFromPorRevenda` e `subtractOutros`:

```
fat_liquido = valor_total - valor_devolucao - |valor_impostos| - valor_desconto
```

Ou seja, o frontend espera os 4 campos como **valores positivos** (módulo). Assim que o backend publicar nesse formato, os cards passam a bater **sem novo deploy do frontend**.

## O que vai mudar neste projeto

### 1. Criar `docs/backend-faturamento-genius-PATCH.md` (documento mestre)

Substitui e referencia os antigos:
- `backend-faturamento-genius-cusmed.md`
- `backend-faturamento-genius-desconto.md`
- `backend-faturamento-genius-desconto-PATCH.md`

Conteúdo:

**a) Validação prévia SQL** (rodar antes de mexer no Python)

```sql
SELECT
  CAST(SUM(COALESCE(USU_VLRBRU,0)) AS FLOAT) AS faturamento,
  CAST(SUM(COALESCE(USU_VLRDEV,0)) AS FLOAT) AS devolucao,
  CAST(SUM(COALESCE(USU_VLRDSC,0)) AS FLOAT) AS desconto,
  CAST(SUM(COALESCE(USU_VLRICM,0)
         + COALESCE(USU_VLRIPI,0)
         + COALESCE(USU_VLRCOF,0)
         + COALESCE(USU_VLRPIS,0)
         + COALESCE(USU_VLRISS,0)) AS FLOAT) AS impostos
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

**b) Classificação de revenda canônica** (em **toda** subquery: detalhe, kpis, por_revenda, por_origem, por_anomes/por_mes, por_cliente, por_produto, exportação):

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

E aplicar o mesmo `CASE` no `WHERE`/`GROUP BY` quando o filtro `revenda` vier na query string.

**c) SELECT agregado canônico** (kpis, por_revenda, por_origem, por_anomes, por_cliente, por_produto):

```sql
CAST(SUM(COALESCE(VM.USU_VLRBRU,0)) AS FLOAT)  AS valor_total,
CAST(ABS(SUM(COALESCE(VM.USU_VLRDEV,0))) AS FLOAT) AS valor_devolucao,
CAST(ABS(SUM(COALESCE(VM.USU_VLRDSC,0))) AS FLOAT) AS valor_desconto,
CAST(ABS(SUM(COALESCE(VM.USU_VLRICM,0)
            + COALESCE(VM.USU_VLRIPI,0)
            + COALESCE(VM.USU_VLRCOF,0)
            + COALESCE(VM.USU_VLRPIS,0)
            + COALESCE(VM.USU_VLRISS,0))) AS FLOAT) AS valor_impostos,
```

> **Sinais**: o frontend trabalha com **valores positivos** (módulo). Por isso aplicamos `ABS(SUM(...))` nos 3 redutores (devolução, desconto, impostos). Não há "inversão dupla" porque o frontend faz `total - dev - |imp| - desc`.

**d) SELECT do detalhe** (`/api/faturamento-genius`) — adicionar por linha:

```sql
CAST(COALESCE(VM.USU_VLRDSC,0) AS FLOAT) AS valor_desconto,
```

(os demais campos do detalhe já existem hoje).

**e) Cálculo Python (todos os buckets + kpis)**

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

Aplicar em: kpis global, `por_revenda[*]`, `por_origem[*]`, `por_anomes[*]`/`por_mes[*]`, `por_cliente[*]`, `por_produto[*]`, e na rota de exportação Excel.

**f) Schema JSON garantido**

```json
{
  "kpis":        { "valor_total":191603, "valor_devolucao":821, "valor_desconto":1738, "valor_impostos":27370, "fat_liquido":161674, "valor_liquido":161674, ... },
  "por_revenda": [{ "revenda":"GENIUS", "valor_desconto":1738, "fat_liquido":161674, ... }],
  "por_anomes":  [{ "anomes":"202603",  "valor_desconto":1738, "fat_liquido":161674, ... }],
  "por_origem":  [{ "...":"...",        "valor_desconto":"..." }],
  "dados":       [{ "...":"...",        "valor_desconto":12.34 }]
}
```

> Manter `fat_liquido` (compatibilidade) **e** adicionar `valor_liquido` como alias.

**g) Lembrete CUSMED → PREMED**

Manter a observação histórica: substituir `DER.CUSMED` por `DER.PREMED` no JOIN com `E075DER`. `grep -i CUSMED` deve retornar zero.

**h) Smoke-test**

```
GET /api/faturamento-genius-dashboard?anomes_ini=202603&anomes_fim=202603&revenda=GENIUS
```

| Campo | Esperado |
|---|---:|
| kpis.valor_total | ≈ 191.603 |
| kpis.valor_devolucao | ≈ 821 |
| kpis.valor_desconto | ≈ 1.738 |
| kpis.valor_impostos | ≈ 27.370 |
| kpis.fat_liquido / valor_liquido | ≈ 161.674 |
| por_revenda[GENIUS].* | mesmos números |
| por_anomes[202603].* | mesmos números |

Repetir para Jan/Fev/Abr 2026 (targets em `mem://features/faturamento-genius-targets`).

### 2. Atualizar docs antigos com aviso de "superseded"

Topo de `backend-faturamento-genius-cusmed.md`, `backend-faturamento-genius-desconto.md`, `backend-faturamento-genius-desconto-PATCH.md`:

> ⚠️ Substituído por `docs/backend-faturamento-genius-PATCH.md` (patch consolidado).

### 3. Atualizar `.lovable/plan.md`

Apontar para o novo documento mestre.

## O que NÃO muda

- Nenhuma alteração de código no `src/` (frontend já está pronto).
- Nenhuma migração Supabase (esse fluxo é 100% FastAPI externo).
- Testes existentes (`FaturamentoGeniusPage.kpis.test.tsx`) continuam válidos — a fórmula deles já é a mesma do patch.

## Próximo passo

Aprovar para eu sair do modo plano e criar/atualizar os 4 arquivos `.md` listados acima. Nenhum código TS/TSX será tocado.
