## Descoberta importante a partir do arquivo enviado

A view `dbo.USU_VMBRUTANFE` (fonte do `OBJ_VM_FATURAMENTO` no FastAPI) **já expõe**:

- `USU_VLRDSC` — desconto agregado (linha 150 do SQL enviado: `Sum(USU_VLRDSC) USU_VLRDSC`)
- `USU_FATLIQ` — fat. líquido pré-calculado pela view (linha 42)
- `USU_FATBRU` — fat. bruto pré-calculado (linha 43)
- `USU_VLRDEV`, `USU_VLRICM`, `USU_VLRIPI`, `USU_VLRPIS`, `USU_VLRCOF` — devolução e impostos por TNS

Ou seja, **não é preciso ir buscar `E140IPV.VLRDSC`** — basta consumir `USU_VLRDSC` da view que o FastAPI já lê. Isso simplifica muito o patch.

---

## Patch a aplicar no FastAPI (`/api/faturamento-genius-dashboard` e `/api/faturamento-genius`)

### 1. SELECT do detalhe — adicionar a coluna por linha

No SELECT que monta o array `dados`:

```sql
CAST(COALESCE(VM.USU_VLRDSC, 0) AS FLOAT) AS valor_desconto,
```

### 2. SELECT dos agregados — adicionar em cada bucket

Em **toda** subquery/CTE que gera `kpis`, `por_revenda`, `por_origem`, `por_anomes`, `por_cliente`, `por_produto`:

```sql
CAST(SUM(COALESCE(VM.USU_VLRDSC, 0)) AS FLOAT) AS valor_desconto,
```

> Não precisa do CASE de TNS de devolução: `USU_VLRDSC` já é o agregado da view.

### 3. Recalcular `valor_liquido` em Python

Onde hoje está:

```python
valor_liquido = valor_total - valor_devolucao - abs(valor_impostos)
```

trocar por:

```python
valor_liquido = (
    valor_total
    - valor_devolucao
    - abs(valor_impostos)
    - (valor_desconto or 0)
)
```

Repetir o mesmo cálculo onde é montado o KPI por linha (`por_revenda`, `por_origem`, `por_anomes`, etc.) e onde se calcula `margem_bruta` / `margem_percentual`.

### 4. Garantir o campo na resposta JSON

```json
{
  "kpis":     { "...": "...", "valor_desconto": 1738, "fat_liquido": 161674 },
  "por_revenda": [ { "revenda": "GENIUS", "valor_desconto": 1738, ... } ],
  "por_anomes":  [ { "anomes": "202603",  "valor_desconto": 1738, ... } ],
  "por_origem":  [ { "...": "...",        "valor_desconto": ... } ],
  "dados":       [ { "...": "...",        "valor_desconto": 12.34 } ]
}
```

### 5. (Opcional) Aproveitar `USU_FATLIQ` da própria view

Se quiser uma rota mais conservadora, em vez de recalcular `fat_liquido` em Python, basta retornar `SUM(VM.USU_FATLIQ)`. Recomendo manter o cálculo em Python para não depender da fórmula interna da view (que pode mudar) e por consistência com o frontend.

---

## Validação SQL prévia (rodar antes de mexer no Python)

```sql
SELECT
  CAST(SUM(COALESCE(USU_VLRDSC,0)) AS FLOAT) AS desconto_genius_mar26,
  CAST(SUM(COALESCE(USU_FATLIQ,0)) AS FLOAT) AS fatliq_view
FROM dbo.USU_VMBRUTANFE
WHERE USU_CODEMP = 1
  AND USU_ANO    = 2026
  AND MONTH(USU_DATA) = 3
  AND USU_ORIGEM IN ('110','120','130','135','140','150',
                     '205','208','210','220','230','235','240','245','250');
-- esperado: desconto ≈ 1.738   |   fatliq ≈ 161.674
```

Se bater, o patch funciona. Se não bater, o ajuste precisa olhar `USU_VENFAT='S'` (filtro de faturamento) — replicar o mesmo `WHERE` que o endpoint já usa hoje.

---

## Smoke-test do endpoint após o deploy

```
GET /api/faturamento-genius-dashboard?anomes_ini=202603&anomes_fim=202603&revenda=GENIUS
```

Conferir:
```
kpis.valor_desconto                ≈ 1738
kpis.fat_liquido                   ≈ 161674
por_revenda[GENIUS].valor_desconto ≈ 1738
por_anomes[202603].valor_desconto  ≈ 1738
```

---

## Frontend — já está pronto

`src/pages/FaturamentoGeniusPage.tsx` já lê `valor_desconto ?? 0` em `computeKpis`, `kpisFromPorRevenda` e `subtractOutros`. Assim que o backend publicar o campo, os cards passam a bater **sem novo deploy do frontend**.

---

## Limitação

O FastAPI não está versionado neste projeto Lovable — eu não consigo editar o `.py` daqui. Vou entregar a documentação do patch e você (ou o time backend) cola no repositório do FastAPI.

---

## Próximo passo (após aprovação)

Em modo build, vou:

1. Atualizar `docs/backend-faturamento-genius-desconto.md` substituindo a abordagem `E140IPV.VLRDSC` pela correta `USU_VMBRUTANFE.USU_VLRDSC` (mais simples).
2. Criar `docs/backend-faturamento-genius-desconto-PATCH.md` com:
   - SQL de validação (acima),
   - trechos exatos para colar no SELECT do detalhe e dos agregados,
   - ajuste do cálculo Python,
   - checklist de smoke-test.
3. (Opcional, me confirme) adicionar card "Descontos" no bloco de KPIs do frontend, ao lado de "Impostos", já consumindo `kpis.valor_desconto`.

Aprovo?
