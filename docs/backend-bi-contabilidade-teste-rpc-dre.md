# GET /api/bi/contabilidade/teste-rpc-dre  *(temporário / diagnóstico)*

Endpoint **temporário** para isolar se o 502 de `/api/bi/contabilidade/dre-matriz`
está na **chamada da RPC** `public.rpc_bi_dre_realizado_regras` ou na **montagem da
matriz** (pivot por mês, orçamento, AV, linhas sintéticas).

Deve ser o mais burro possível: chama a RPC com argumentos **posicionais idênticos**
ao SELECT que o usuário já validou direto no Postgres, devolve o JSON cru e nada mais.
**Remover assim que `/dre-matriz` voltar a responder 200.**

## Request

```
GET /api/bi/contabilidade/teste-rpc-dre
```

- Sem query params.
- Período fixo: `'202601'` → `'202612'` (mesmo intervalo já validado no Postgres).
- Headers: `ngrok-skip-browser-warning: true` (padrão dos demais `/api/bi/*`).
- Auth: igual aos demais endpoints `/api/bi/*` (nada extra).

## SQL executado (literal)

Exatamente o mesmo SELECT que o usuário rodou direto no Postgres e funcionou —
**argumentos posicionais**, sem nomeação (`p_anomes_ini =>`), sem named params do driver:

```sql
SELECT codigo_linha, anomes_referente, vl_realizado
FROM public.rpc_bi_dre_realizado_regras('202601', '202612')
ORDER BY codigo_linha, anomes_referente;
```

Se o driver exigir bind, usar placeholders posicionais com tupla, mantendo a chamada
da função posicional:

```python
SQL = (
    "SELECT codigo_linha, anomes_referente, vl_realizado "
    "FROM public.rpc_bi_dre_realizado_regras(%s, %s) "
    "ORDER BY codigo_linha, anomes_referente"
)
PARAMS = ("202601", "202612")
```

Não usar `%(p_anomes_ini)s` / `p_anomes_ini =>` aqui — o objetivo é reproduzir o
SELECT validado byte a byte.

## Handler FastAPI

```python
import traceback
from fastapi import HTTPException

# TEMP DIAG — remover após corrigir /api/bi/contabilidade/dre-matriz
@router.get("/api/bi/contabilidade/teste-rpc-dre")
def teste_rpc_dre():
    try:
        rows = pg.fetch(
            "SELECT codigo_linha, anomes_referente, vl_realizado "
            "FROM public.rpc_bi_dre_realizado_regras(%s, %s) "
            "ORDER BY codigo_linha, anomes_referente",
            ("202601", "202612"),
        )
        linhas = [
            {
                "codigo_linha": r["codigo_linha"],
                "anomes_referente": r["anomes_referente"],
                "vl_realizado": float(r["vl_realizado"]) if r["vl_realizado"] is not None else None,
            }
            for r in rows
        ]
        return {
            "periodo": {"ini": "202601", "fim": "202612"},
            "total_linhas": len(linhas),
            "linhas": linhas,
        }
    except Exception as e:
        print("[ERRO TESTE-RPC-DRE]", repr(e), flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(e))
```

## Response

`200 OK` — JSON bruto, na mesma ordem do `ORDER BY`:

```json
{
  "periodo": { "ini": "202601", "fim": "202612" },
  "total_linhas": 312,
  "linhas": [
    { "codigo_linha": "DEPRECIACAO",              "anomes_referente": "202601", "vl_realizado": -123456.78 },
    { "codigo_linha": "DESPESAS_ADMINISTRATIVAS", "anomes_referente": "202601", "vl_realizado": -234567.89 }
  ]
}
```

`502` — `{ "detail": "<mensagem real da exceção Python/SQL>" }`, com o traceback
completo impresso no stdout do uvicorn.

> **Decimal → float:** converter `vl_realizado` (`numeric` → `Decimal`) para `float`
> antes de serializar. `Decimal` cru quebra o `json.dumps` do FastAPI e dispara 502
> com `TypeError: Object of type Decimal is not JSON serializable`.

## Proibições (reforçar)

O handler **não pode** conter:

- Qualquer referência a `public.bi_vm_orc_dre` (orçamento).
- Qualquer referência a `public.bi_dre_estrutura`.
- Qualquer SQL inline contra `public.bi_vm_lanc_contabil` — só a RPC.
- Pivot por mês / construção de matriz.
- Cálculo de `A.V.`, `%`, totais ou subtotais.
- Linhas sintéticas / pais / totalizadoras.
- `WHERE`, `LIMIT`, joins adicionais.
- Cache, autenticação extra, query params.
- Mensagem de erro genérica — sempre `detail=str(e)`.

## CORS

Liberar a mesma origem do preview Lovable usada pelos demais `/api/bi/*`.

## Critério de validação

- **`200 OK` com `linhas` não vazio** → FastAPI executa a RPC sem problema. O 502
  do `/dre-matriz` está na **montagem da matriz** (pivot por mês, join com
  orçamento `bi_vm_orc_dre`, cálculo de AV, linhas sintéticas, serialização de
  `Decimal` em outro campo).
- **`502` com `detail` preenchido** → o bug está **na própria chamada da RPC**. O
  `detail` + o traceback no stdout do uvicorn apontam a causa exata (nome de
  parâmetro, driver, `search_path`, permissão, cast de tipo, etc.).

## Ciclo de vida

Endpoint **estritamente temporário de diagnóstico**. Remover do router assim que
`/api/bi/contabilidade/dre-matriz` voltar a responder `200`. Manter o comentário
`# TEMP DIAG — remover após corrigir /dre-matriz` no handler até a remoção.
