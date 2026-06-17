# GET /api/bi/contabilidade/teste-rpc-dre  *(temporário / diagnóstico)*

Endpoint **temporário** para isolar se o FastAPI consegue executar a RPC
`public.rpc_bi_dre_realizado_regras` no Postgres. Existe apenas para diagnosticar o 502 de
`/api/bi/contabilidade/dre-matriz` — **remover assim que aquele endpoint estabilizar**.

## Request

```
GET /api/bi/contabilidade/teste-rpc-dre
```

- Sem query params.
- Período fixo: `p_anomes_ini = '202601'`, `p_anomes_fim = '202606'`.
- Headers: `ngrok-skip-browser-warning: true` (padrão dos demais `/api/bi/*`).
- Auth: igual aos demais endpoints `/api/bi/*` (nada extra).

## Handler FastAPI

```python
import traceback
from fastapi import HTTPException

@router.get("/api/bi/contabilidade/teste-rpc-dre")
def teste_rpc_dre():
    try:
        rows = pg.fetch(
            "SELECT codigo_linha, anomes_referente, vl_realizado "
            "FROM public.rpc_bi_dre_realizado_regras(%(p_anomes_ini)s, %(p_anomes_fim)s)",
            {"p_anomes_ini": "202601", "p_anomes_fim": "202606"},
        )
        return [
            {
                "codigo_linha": r["codigo_linha"],
                "anomes_referente": r["anomes_referente"],
                "vl_realizado": float(r["vl_realizado"]) if r["vl_realizado"] is not None else None,
            }
            for r in rows
        ]
    except Exception as e:
        print("[ERRO TESTE RPC DRE]", repr(e), flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(e))
```

## Response

`200 OK` — array JSON **bruto**, exatamente como a RPC devolve:

```json
[
  { "codigo_linha": "DEPRECIACAO",              "anomes_referente": "202601", "vl_realizado": -123456.78 },
  { "codigo_linha": "DESPESAS_ADMINISTRATIVAS", "anomes_referente": "202601", "vl_realizado": -234567.89 }
]
```

`502` — `{ "detail": "<mensagem real da exceção Python/SQL>" }`, com o traceback completo
impresso no stdout do uvicorn.

> **Nomes dos parâmetros:** usar exatamente `p_anomes_ini` e `p_anomes_fim`. Não usar `ini`, `fim`, `anomes_ini`, `anomes_fim`, `ano`, `mes_ini` ou `mes_fim`.
> **JSON:** converter `vl_realizado numeric`/`Decimal` para `float` antes do retorno.

## Proibições

- **Não** juntar com `public.bi_vm_orc_dre` (orçamento).
- **Não** juntar com `public.bi_dre_estrutura`.
- **Não** pivotar por mês.
- **Não** calcular `A.V.`.
- **Não** criar linhas sintéticas / totalizadoras.
- **Não** montar SQL inline contra `public.bi_vm_lanc_contabil` — só a RPC.
- **Não** mascarar erro com string genérica — sempre `detail=str(e)`.

## CORS

Liberar a mesma origem do preview Lovable usada pelos demais `/api/bi/*`.

## Validação esperada

- `200 OK` com array → FastAPI consegue chamar a RPC; o 502 do `/dre-matriz` está
  na montagem da matriz (orçamento, pivot, AV, estrutura), não na RPC.
- `502` com `detail` → traceback no stdout do uvicorn aponta a causa real (driver,
  cast de tipos, permissão, search_path, etc.).
