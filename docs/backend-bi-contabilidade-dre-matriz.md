# GET /api/bi/contabilidade/dre-matriz

Endpoint usado pela tela **Contabilidade — DRE (matriz)** (`src/pages/bi/contabilidade/DrePage.tsx`).

A implementação deve ser **100% em SQL no Postgres do FastAPI** (mesmo cluster que hospeda as tabelas `bi_*`).
**NÃO usar** Oracle / UpQuery, **NÃO consultar** `EZORTEA.V_DRE_V1`, e **NÃO** manter regra fixa por `cd_mascara` dentro do código Python.
A classificação do realizado é totalmente orientada pela tabela `public.bi_dre_regras`.

## Request

```
GET /api/bi/contabilidade/dre-matriz?ano=2026&unidade=
```

Headers:
- `ngrok-skip-browser-warning: true` (enviado pelo front).

### Query params

| Param     | Tipo   | Obrig. | Observações                                                                                |
|-----------|--------|--------|--------------------------------------------------------------------------------------------|
| `ano`     | string | sim    | Ex.: `2026`.                                                                                |
| `unidade` | string | não    | Vazio / ausente / `TODOS` / `TODAS` / `ALL` (case-insensitive) → tratar como `NULL`.       |

## Fontes de dados (somente `public.*` no Postgres do FastAPI)

| Tabela                       | Papel                                                                  |
|------------------------------|------------------------------------------------------------------------|
| `public.bi_vm_lanc_contabil` | Lançamentos contábeis (realizado). Já traz `cd_mascara`, `cd_centro_custos`, `cd_centro_custos_3`, `cd_origem_lcto`, `cd_tns`, `vl_realizado`, `anomes_referente`, `unidade_negocio`. |
| `public.bi_dre_regras`       | Regras de classificação do realizado em `codigo_linha` da DRE.         |
| `public.bi_vm_orc_dre`       | Orçamento por `mascara × anomes`.                                      |
| `public.bi_dre_estrutura`    | Estrutura/ordem/descrição/nivel/totalizadora das linhas da DRE.        |

### Colunas usadas de `public.bi_vm_lanc_contabil`

Usar **somente as colunas diretas** abaixo:

- `l.cd_mascara`
- `l.cd_centro_custos`
- `l.cd_centro_custos_3`
- `l.cd_origem_lcto`
- `l.cd_tns`
- `l.vl_realizado`
- `l.anomes_referente`
- `l.unidade_negocio` (para o filtro de unidade)

**NÃO usar** `cd_conta`, `centro_custo`, `extras->>'cd_origem_lcto'`, `extras->>'cd_tns'`, `vl_debito`, `vl_credito`, `vl_saldo`, nem fazer JOIN com `bi_dre_mascara` para resolver a máscara (a máscara já está em `l.cd_mascara`). Tentativas anteriores estavam causando **502** porque a SQL referenciava colunas inexistentes nesta tabela.

## Classificação por `public.bi_dre_regras`

Schema esperado (ajuste nomes se diferentes na sua base, mantendo a semântica):

| Coluna                 | Tipo  | Match                                                              |
|------------------------|-------|--------------------------------------------------------------------|
| `codigo_linha`         | text  | Linha-alvo da DRE quando a regra casar.                             |
| `cd_mascara_like`      | text  | `l.cd_mascara         LIKE r.cd_mascara_like`                       |
| `cd_centro_custos_3`   | text  | `l.cd_centro_custos_3 =    r.cd_centro_custos_3`                    |
| `cd_centro_custos_like`| text  | `l.cd_centro_custos   LIKE r.cd_centro_custos_like`                 |
| `cd_origem_lcto`       | text  | `l.cd_origem_lcto     =    r.cd_origem_lcto`                        |
| `cd_tns_like`          | text  | `l.cd_tns             LIKE r.cd_tns_like`                           |
| `prioridade`           | int   | Menor vence (`ORDER BY prioridade ASC, id`).                        |
| `ativo`                | bool  | Apenas regras `ativo = true` participam.                            |

Regras com colunas `NULL` significam "não restringe por esse critério". Todos os critérios preenchidos precisam casar simultaneamente (AND).

## Algoritmo

1. Para cada lançamento de `bi_vm_lanc_contabil` no ano filtrado:
   - `LEFT JOIN LATERAL` em `bi_dre_regras` filtrando `ativo = true` e aplicando os predicados acima diretamente sobre as colunas de `l`.
   - `ORDER BY r.prioridade ASC, r.id LIMIT 1` → **primeira regra vence**.
2. `codigo_linha_efetivo := COALESCE(r.codigo_linha, l.cd_mascara)` — fallback para a própria máscara do lançamento quando nenhuma regra casa.
3. Agregar `SUM(COALESCE(l.vl_realizado, 0))` por `codigo_linha_efetivo` e `(l.anomes_referente % 100)`.
4. Pivotar por mês (jan..dez) e juntar com:
   - Orçamento: `public.bi_vm_orc_dre` por `mascara × mês`.
   - Estrutura: `public.bi_dre_estrutura` (ordem, descrição, nivel, totalizadora, sinal).
5. Calcular `A.V.` em relação ao mês de **Receita Líquida** (mesma base da implementação anterior).

## SQL de referência

```sql
WITH lanc AS (
  SELECT
    COALESCE(r.codigo_linha, l.cd_mascara)        AS codigo_linha,
    (l.anomes_referente % 100)::int               AS mes,
    SUM(COALESCE(l.vl_realizado, 0))              AS valor
  FROM public.bi_vm_lanc_contabil l
  LEFT JOIN LATERAL (
    SELECT r.codigo_linha, r.prioridade
    FROM public.bi_dre_regras r
    WHERE r.ativo
      AND (r.cd_mascara_like       IS NULL OR l.cd_mascara         LIKE r.cd_mascara_like)
      AND (r.cd_centro_custos_3    IS NULL OR l.cd_centro_custos_3 =    r.cd_centro_custos_3)
      AND (r.cd_centro_custos_like IS NULL OR l.cd_centro_custos   LIKE r.cd_centro_custos_like)
      AND (r.cd_origem_lcto        IS NULL OR l.cd_origem_lcto     =    r.cd_origem_lcto)
      AND (r.cd_tns_like           IS NULL OR l.cd_tns             LIKE r.cd_tns_like)
    ORDER BY r.prioridade ASC, r.id
    LIMIT 1
  ) r ON true
  WHERE (l.anomes_referente / 100)::int = %(ano)s::int
    AND (%(unidade)s::text IS NULL
         OR l.unidade_negocio IS NULL
         OR l.unidade_negocio = %(unidade)s::text)
  GROUP BY 1, 2
),
orc AS (
  SELECT o.mascara AS codigo_linha,
         (o.anomes_referente % 100)::int AS mes,
         SUM(COALESCE(o.vl_orcado, 0))    AS valor
  FROM public.bi_vm_orc_dre o
  WHERE (o.anomes_referente / 100)::int = %(ano)s::int
    AND (%(unidade)s::text IS NULL
         OR o.unidade_negocio IS NULL
         OR o.unidade_negocio = %(unidade)s::text)
  GROUP BY 1, 2
)
-- pivot mensal + join com public.bi_dre_estrutura (ordem, descricao, nivel, totalizadora, sinal)
-- e cálculo de A.V. contra a linha de Receita Líquida — mesmo formato de resposta abaixo.
```

> A função `public.bi_dre_matriz_anual` no Cloud é legado e **não é mais chamada** pela tela.
> A nova lógica deve viver no FastAPI (Postgres direto, sem RPC).

## Pseudocódigo FastAPI

```python
@router.get("/api/bi/contabilidade/dre-matriz")
def dre_matriz(ano: str, unidade: str | None = None):
    u = (unidade or "").strip().upper()
    p_unidade = None if u in ("", "TODOS", "TODAS", "ALL") else unidade
    rows = pg.fetch(SQL_DRE_MATRIZ, {"ano": ano, "unidade": p_unidade})
    return rows
```

## Response

`200 OK` — array JSON com as linhas no **mesmo contrato atual** (não mudar o shape para não quebrar o front):

```json
[
  {
    "ordem": 10,
    "codigo_linha": "RECEITA_BRUTA",
    "mascara": "RECEITA_BRUTA",
    "descricao": "Receita Bruta de Vendas",
    "totalizadora": false,
    "nivel": 1,
    "jan_realizado": 1234567.89, "jan_av": 100.0, "jan_orcado": 1200000.0,
    "fev_realizado": 0, "fev_av": 0, "fev_orcado": 0,
    "...": "...",
    "dez_realizado": 0, "dez_av": 0, "dez_orcado": 0,
    "total_realizado": 9876543.21, "total_av": 100.0, "total_orcado": 12000000.0
  }
]
```

Campos esperados por linha:
- `ordem`, `codigo_linha`, `mascara`, `descricao`, `totalizadora`, `nivel`
- Para cada mês `jan..dez`: `<mes>_realizado`, `<mes>_av`, `<mes>_orcado`
- Totais: `total_realizado`, `total_av`, `total_orcado`

### Erros

- `400` — `ano` inválido.
- `5xx` — `{ "detail": "mensagem" }`. O front exibe `detail`/`message` quando disponível.

## Proibições (resumo)

- Não usar Oracle / UpQuery, nem `EZORTEA.V_DRE_V1`.
- Não manter regra fixa por `cd_mascara` no código Python — toda classificação vem de `bi_dre_regras`.
- Não referenciar `cd_conta`, `centro_custo`, `extras->>'cd_origem_lcto'`, `extras->>'cd_tns'`, `vl_debito`, `vl_credito` nem `vl_saldo` na SQL deste endpoint.

## CORS

Liberar origem do preview Lovable como nos demais endpoints `/api/bi/*`.
