
## Diagnóstico

O erro `invalid input syntax for type bigint: "VM_FATURAMENTO"` vem do Supabase novo (`razvdopgxoiqucupmpxq`) que o FastAPI usa. Lá `etl_acoes.id_acao` é `bigint`. O frontend manda o código textual "VM_FATURAMENTO" na URL, e o backend está fazendo `.eq("id_acao", acao_ref)` direto — explodindo no cast.

Este projeto Lovable (frontend + Cloud `cpgyhjqu...`) está correto:
- `testarSqlAcao(acaoRef: string | number)` já existe em `src/lib/etl/api.ts` com `encodeURIComponent(String(acaoRef))`.
- `EditarSqlModal` já manda `acao.id` (UUID).
- **Nada para mudar no frontend.**

A correção é 100% no FastAPI (fora deste repo).

## Entregável: patch para o FastAPI

Roteamento: número → coluna `id_acao` (bigint); texto → coluna `codigo_acao` (text). Pré-requisito: a coluna `codigo_acao` precisa existir no Supabase `razvdo...` (se não existir, criar antes via `ALTER TABLE public.etl_acoes ADD COLUMN IF NOT EXISTS codigo_acao text;` + índice único opcional).

```python
# app/routers/etl.py (ou onde estiver o endpoint)
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
from app.deps import get_supabase  # client com SUPABASE_SERVICE_ROLE_KEY

router = APIRouter()


class TestarSqlRequest(BaseModel):
    parametros: dict[str, Any] = {}
    limite: int = 100
    sql_template: str | None = None  # opcional, se já suportado


def buscar_acao_supabase(acao_ref: str) -> dict:
    """
    Busca uma ação ETL aceitando:
      - id numérico  -> coluna id_acao (bigint)
      - código texto -> coluna codigo_acao (text), ex: "VM_FATURAMENTO"
    """
    supabase = get_supabase()
    acao_ref = str(acao_ref).strip()

    base = (
        supabase
        .table("etl_acoes")
        .select("*")
        .eq("ativo", True)   # ajuste para "ativa" se o schema usar esse nome
        .limit(1)
    )

    if acao_ref.isdigit():
        resp = base.eq("id_acao", int(acao_ref)).execute()
    else:
        resp = base.eq("codigo_acao", acao_ref).execute()

    if not resp.data:
        raise HTTPException(
            status_code=404,
            detail=f"Ação ETL não encontrada: {acao_ref}",
        )
    return resp.data[0]


@router.post("/api/etl/acoes/{acao_ref}/testar-sql")
async def testar_sql_acao(acao_ref: str, body: TestarSqlRequest):
    acao = buscar_acao_supabase(acao_ref)

    sql_template = body.sql_template or acao.get("sql_template")
    if not sql_template:
        raise HTTPException(status_code=400, detail="sql_template ausente")

    # ... segue o pipeline já existente:
    #   - bloquear DML/DDL (somente SELECT/WITH)
    #   - aplicar parâmetros (body.parametros)
    #   - LIMIT máximo 500
    #   - timeout 15s
    #   - executar no SQL Server e retornar amostra
    return executar_select_seguro(
        sql_template=sql_template,
        parametros=body.parametros,
        limite=min(body.limite or 100, 500),
        timeout_s=15,
    )
```

## Checklist pré-deploy

1. Confirmar no Supabase `razvdo...` que `etl_acoes` tem coluna `codigo_acao text`. Se não tiver, criar.
2. Conferir nome real do flag ativo (`ativo` vs `ativa`) e ajustar o `.eq()`.
3. Garantir que `get_supabase()` está usando `SUPABASE_SERVICE_ROLE_KEY` do `.env`.
4. Smoke test com:
   - `POST /api/etl/acoes/VM_FATURAMENTO/testar-sql` → deve resolver via `codigo_acao`.
   - `POST /api/etl/acoes/123/testar-sql` → deve resolver via `id_acao`.

## Fora de escopo

- Frontend deste projeto (já correto).
- `src/integrations/supabase/{client,types}.ts` e `.env` (proibido editar).
- Migrações no Cloud `cpgyhjqu...` (problema é no outro projeto).
