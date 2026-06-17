# GET /api/bi/contabilidade/dre-matriz

Endpoint usado pela tela **Contabilidade — DRE (matriz)** (`src/pages/bi/contabilidade/DrePage.tsx`).

A implementação deve ser **100% em SQL no Postgres do FastAPI** (mesmo cluster que hospeda as tabelas `bi_*`), via RPC `public.rpc_bi_dre_realizado_regras`.
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
| `ano`     | string | sim    | Ex.: `2026`. Endpoint converte para `p_anomes_ini = '<ano>01'` / `p_anomes_fim = '<ano>12'`. |
| `unidade` | string | não    | Vazio / ausente / `TODOS` / `TODAS` / `ALL` (case-insensitive) → tratar como `NULL`. A RPC atual ainda não filtra por unidade (ver TODO). |

## Fontes de dados (somente `public.*` no Postgres do FastAPI)

| Tabela                       | Papel                                                                  |
|------------------------------|------------------------------------------------------------------------|
| `public.bi_vm_lanc_contabil` | Lançamentos contábeis (realizado). Já traz `cd_mascara`, `cd_centro_custos`, `cd_centro_custos_3`, `cd_origem_lcto`, `cd_tns`, `vl_realizado`, `anomes_referente`, `unidade_negocio`. |
| `public.bi_dre_regras`       | Regras de classificação do realizado em `codigo_linha` da DRE, com `sinal` e `prioridade`. |
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
- `l.unidade_negocio` (para filtro futuro de unidade)

**NÃO usar** `cd_conta`, `centro_custo`, `extras->>'cd_origem_lcto'`, `extras->>'cd_tns'`, `vl_debito`, `vl_credito`, `vl_saldo`, nem JOIN com `bi_dre_mascara`. Tentativas anteriores estavam causando **502** porque a SQL/RPC antiga referenciava colunas inexistentes nesta tabela.

## Classificação por `public.bi_dre_regras`

| Coluna                 | Match                                                              |
|------------------------|--------------------------------------------------------------------|
| `codigo_linha`         | Linha-alvo da DRE quando a regra casar.                             |
| `cd_mascara_like`      | `l.cd_mascara         LIKE r.cd_mascara_like`                       |
| `cd_centro_custos_3`   | `l.cd_centro_custos_3 =    r.cd_centro_custos_3`                    |
| `cd_centro_custos_like`| `l.cd_centro_custos   LIKE r.cd_centro_custos_like`                 |
| `cd_origem_lcto`       | `l.cd_origem_lcto     =    r.cd_origem_lcto`                        |
| `cd_tns_like`          | `l.cd_tns             LIKE r.cd_tns_like`                           |
| `sinal`                | Multiplicador aplicado a `vl_realizado` (default 1).                |
| `prioridade`           | Menor vence (`ORDER BY prioridade LIMIT 1`).                        |
| `ativo`                | Apenas regras `ativo = true` participam.                            |

Colunas `NULL` significam "não restringe por esse critério". Todos os critérios preenchidos precisam casar simultaneamente (AND).

Lançamentos sem regra casada são **descartados** (`WHERE codigo_linha IS NOT NULL`) — não há fallback por `cd_mascara` aqui.

## RPC de referência (instalar no Postgres do FastAPI)

Esta RPC já foi validada manualmente e produz os valores oficiais (ver "Valores validados" abaixo). Aplicar **no Postgres do FastAPI**, **não** no Lovable Cloud:

```sql
CREATE OR REPLACE FUNCTION public.rpc_bi_dre_realizado_regras(
    p_anomes_ini text,
    p_anomes_fim text
)
RETURNS TABLE (
    codigo_linha text,
    anomes_referente text,
    vl_realizado numeric
)
LANGUAGE sql
STABLE
AS $$
    WITH classificado AS (
        SELECT
            l.anomes_referente,
            r.codigo_linha,
            l.vl_realizado * COALESCE(r.sinal, 1) AS vl_realizado
        FROM public.bi_vm_lanc_contabil l
        LEFT JOIN LATERAL (
            SELECT r.*
            FROM public.bi_dre_regras r
            WHERE r.ativo = true
              AND (r.cd_mascara_like IS NULL OR l.cd_mascara LIKE r.cd_mascara_like)
              AND (r.cd_centro_custos_3 IS NULL OR l.cd_centro_custos_3 = r.cd_centro_custos_3)
              AND (r.cd_centro_custos_like IS NULL OR l.cd_centro_custos LIKE r.cd_centro_custos_like)
              AND (r.cd_origem_lcto IS NULL OR l.cd_origem_lcto = r.cd_origem_lcto)
              AND (r.cd_tns_like IS NULL OR l.cd_tns LIKE r.cd_tns_like)
            ORDER BY r.prioridade
            LIMIT 1
        ) r ON true
        WHERE l.anomes_referente BETWEEN p_anomes_ini AND p_anomes_fim
    )
    SELECT
        c.codigo_linha,
        c.anomes_referente,
        ROUND(SUM(c.vl_realizado), 2) AS vl_realizado
    FROM classificado c
    WHERE c.codigo_linha IS NOT NULL
    GROUP BY
        c.codigo_linha,
        c.anomes_referente;
$$;
```

Observações:

- Parâmetros `p_anomes_ini` / `p_anomes_fim` são `text` no formato `YYYYMM` (ex.: `'202601'`, `'202612'`).
- `sinal` vem de `public.bi_dre_regras.sinal` (default 1).
- A função `public.bi_dre_matriz_anual` no Cloud é legado e **não é mais chamada** pela tela.

### TODO — filtro por unidade

A RPC atual não recebe `p_unidade`. Quando for necessário filtrar por `unidade_negocio`, adicionar parâmetro opcional:

```sql
CREATE OR REPLACE FUNCTION public.rpc_bi_dre_realizado_regras(
    p_anomes_ini text,
    p_anomes_fim text,
    p_unidade    text DEFAULT NULL
) ...
WHERE l.anomes_referente BETWEEN p_anomes_ini AND p_anomes_fim
  AND (p_unidade IS NULL OR l.unidade_negocio = p_unidade)
```

Por ora o endpoint aceita o parâmetro `unidade` mas o ignora.

## Valores validados (sanity check)

Totais por linha retornados pela RPC para o período de teste — usar para conferir o endpoint:

```
DEPRECIACAO                  -1.376.904,62
DESPESAS_ADMINISTRATIVAS     -2.983.931,76
DESPESAS_COMERCIAIS          -2.161.234,31
DESPESAS_FINANCEIRAS           -421.513,13
DESPESAS_NAO_OPERACIONAIS      -217.783,04
FAZENDA                         -68.999,11
RECEITAS_FINANCEIRAS          1.090.062,11
RECEITAS_NAO_OPERACIONAIS     1.161.400,81
```

Se o endpoint retornar 502 ou valores diferentes, o problema está no **código Python do endpoint** (provavelmente ainda chamando uma RPC antiga que referenciava `cd_conta`/`centro_custo`/`extras`), **não** no SQL. Reaplicar a RPC acima e reapontar o endpoint para `public.rpc_bi_dre_realizado_regras` resolve.

## Pseudocódigo FastAPI

```python
@router.get("/api/bi/contabilidade/dre-matriz")
def dre_matriz(ano: str, unidade: str | None = None):
    u = (unidade or "").strip().upper()
    p_unidade = None if u in ("", "TODOS", "TODAS", "ALL") else unidade  # reservado p/ futuro

    p_ini = f"{ano}01"
    p_fim = f"{ano}12"

    realizado = pg.fetch(
        "SELECT * FROM public.rpc_bi_dre_realizado_regras(%(ini)s, %(fim)s)",
        {"ini": p_ini, "fim": p_fim},
    )
    orcado = pg.fetch(SQL_ORCADO, {"ano": ano, "unidade": p_unidade})

    # pivotar realizado/orçado por (codigo_linha, mes) → jan..dez
    # juntar com public.bi_dre_estrutura (ordem, descricao, nivel, totalizadora, sinal)
    # calcular A.V. contra a linha de Receita Líquida
    return rows
```

## SQL do orçamento (inalterado)

```sql
SELECT o.mascara AS codigo_linha,
       (o.anomes_referente::int % 100)::int AS mes,
       SUM(COALESCE(o.vl_orcado, 0))        AS valor
FROM public.bi_vm_orc_dre o
WHERE (o.anomes_referente::int / 100)::int = %(ano)s::int
  AND (%(unidade)s::text IS NULL
       OR o.unidade_negocio IS NULL
       OR o.unidade_negocio = %(unidade)s::text)
GROUP BY 1, 2;
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
- Não manter regra fixa por `cd_mascara` no código Python — toda classificação vem de `bi_dre_regras` via RPC.
- Não referenciar `cd_conta`, `centro_custo`, `extras->>'cd_origem_lcto'`, `extras->>'cd_tns'`, `vl_debito`, `vl_credito` nem `vl_saldo` na SQL deste endpoint.
- Não criar essa RPC no Lovable Cloud — ela vive no Postgres do FastAPI.

## CORS

Liberar origem do preview Lovable como nos demais endpoints `/api/bi/*`.
