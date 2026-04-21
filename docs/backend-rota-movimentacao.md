# Rota: `GET /api/estoque/movimentacao`

Implementação **copy-paste** para o backend FastAPI do ERP Senior, seguindo o mesmo padrão da rota `/api/estoque` já existente (`Depends(validar_token)`, `get_connection()`, paginação `pagina`/`tamanho_pagina`/`total_registros`/`total_paginas`/`dados`).

> ⚠️ **Ajuste de campos**: os nomes prováveis da tabela `E210MVP` no Senior são `DATMOV`, `QTDMOV`, `NUMDOC`, `TIPMOV`, `CODTRA`. Se o seu dicionário usar `DATEMI`, `QTD`, `NUMDCT`, etc., **ajuste apenas o nome da coluna no SELECT** — não altere a estrutura da rota nem o contrato de resposta consumido pelo frontend (`src/pages/SugestaoMinMaxPage.tsx`).

---

## 1) `routers/estoque_movimentacao.py`

```python
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from datetime import date
from auth import validar_token          # mesmo import usado em /api/estoque
from db import get_connection           # mesmo import usado em /api/estoque

router = APIRouter()


# ---------- Models ----------
class MovimentacaoItem(BaseModel):
    codemp: Optional[int] = None
    codfil: Optional[int] = None
    codpro: Optional[str] = None
    codder: Optional[str] = None
    coddep: Optional[str] = None
    despro: Optional[str] = None
    codfam: Optional[str] = None
    codori: Optional[str] = None
    unimed: Optional[str] = None
    data_movimento: Optional[date] = None
    tipo_movimento: Optional[str] = None        # E (entrada) / S (saída)
    transacao: Optional[str] = None             # CODTRA
    deposito: Optional[str] = None              # CODDEP
    quantidade: Optional[float] = None
    documento: Optional[str] = None
    fornecedor: Optional[str] = None
    origem: Optional[str] = None
    saldo_atual: Optional[float] = None


class PaginatedMovimentacao(BaseModel):
    pagina: int
    tamanho_pagina: int
    total_registros: int
    total_paginas: int
    dados: List[MovimentacaoItem]


# ---------- Endpoint ----------
@router.get("/movimentacao", response_model=PaginatedMovimentacao)
def listar_movimentacao(
    codpro: Optional[str] = Query(None),
    despro: Optional[str] = Query(None),
    codfam: Optional[str] = Query(None),
    codori: Optional[str] = Query(None),
    codder: Optional[str] = Query(None),
    coddep: Optional[str] = Query(None),
    data_ini: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    pagina: int = Query(1, ge=1),
    tamanho_pagina: int = Query(100, ge=1, le=1000),
    _user: dict = Depends(validar_token),
):
    offset = (pagina - 1) * tamanho_pagina

    sql = """
    SELECT
        COUNT(*) OVER()                                 AS total_registros,
        MVP.CODEMP                                      AS codemp,
        MVP.CODFIL                                      AS codfil,
        MVP.CODPRO                                      AS codpro,
        MVP.CODDER                                      AS codder,
        MVP.CODDEP                                      AS coddep,
        PRO.DESPRO                                      AS despro,
        PRO.CODFAM                                      AS codfam,
        PRO.CODORI                                      AS codori,
        PRO.UNIMED                                      AS unimed,
        MVP.DATMOV                                      AS data_movimento,   -- ajuste se for DATEMI
        MVP.TIPMOV                                      AS tipo_movimento,
        MVP.CODTRA                                      AS transacao,
        MVP.CODDEP                                      AS deposito,
        MVP.QTDMOV                                      AS quantidade,        -- ajuste se for QTD
        MVP.NUMDOC                                      AS documento,         -- ajuste se for NUMDCT
        NULL                                            AS fornecedor,        -- preencher via JOIN E140FOR se necessário
        NULL                                            AS origem,
        ISNULL(EST.SALDO, 0)                            AS saldo_atual
    FROM E210MVP MVP
    LEFT JOIN E075PRO PRO
        ON PRO.CODEMP = MVP.CODEMP
       AND PRO.CODPRO = MVP.CODPRO
    LEFT JOIN (
        SELECT CODEMP, CODPRO, CODDER, CODDEP, SUM(QTDEST) AS SALDO
        FROM E210EST
        GROUP BY CODEMP, CODPRO, CODDER, CODDEP
    ) EST
        ON EST.CODEMP = MVP.CODEMP
       AND EST.CODPRO = MVP.CODPRO
       AND EST.CODDER = MVP.CODDER
       AND EST.CODDEP = MVP.CODDEP
    WHERE 1 = 1
      AND (:codpro    IS NULL OR MVP.CODPRO LIKE '%' + :codpro + '%')
      AND (:despro    IS NULL OR PRO.DESPRO LIKE '%' + :despro + '%')
      AND (:codfam    IS NULL OR PRO.CODFAM = :codfam)
      AND (:codori    IS NULL OR PRO.CODORI = :codori)
      AND (:codder    IS NULL OR MVP.CODDER = :codder)
      AND (:coddep    IS NULL OR MVP.CODDEP = :coddep)
      AND (:data_ini  IS NULL OR MVP.DATMOV >= :data_ini)
      AND (:data_fim  IS NULL OR MVP.DATMOV <= :data_fim)
    ORDER BY MVP.DATMOV DESC, MVP.CODPRO
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    """

    params = {
        "codpro": codpro,
        "despro": despro,
        "codfam": codfam,
        "codori": codori,
        "codder": codder,
        "coddep": coddep,
        "data_ini": data_ini,
        "data_fim": data_fim,
        "offset": offset,
        "limit": tamanho_pagina,
    }

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        cols = [c[0] for c in cursor.description]
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

        total_registros = rows[0]["total_registros"] if rows else 0
        for r in rows:
            r.pop("total_registros", None)

        total_paginas = (total_registros + tamanho_pagina - 1) // tamanho_pagina if total_registros else 0

        return {
            "pagina": pagina,
            "tamanho_pagina": tamanho_pagina,
            "total_registros": total_registros,
            "total_paginas": total_paginas,
            "dados": rows,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar movimentação: {e}")
    finally:
        cursor.close()
        conn.close()
```

---

## 2) Registro no `main.py`

```python
from routers import estoque_movimentacao

app.include_router(
    estoque_movimentacao.router,
    prefix="/api/estoque",
    tags=["estoque"],
)
```

---

## 3) Teste rápido (curl)

```bash
JWT="<token retornado por /api/login>"
ERP="https://flakily-wanning-faye.ngrok-free.dev"

curl -H "Authorization: Bearer $JWT" \
  "$ERP/api/estoque/movimentacao?data_ini=2025-01-01&data_fim=2025-04-21&pagina=1&tamanho_pagina=100"
```

Resposta esperada:
```json
{
  "pagina": 1,
  "tamanho_pagina": 100,
  "total_registros": 1234,
  "total_paginas": 13,
  "dados": [
    {
      "codemp": 1, "codpro": "PRD-001", "codder": "  ", "coddep": "01",
      "despro": "Parafuso M8", "codfam": "FER", "codori": "01", "unimed": "PC",
      "data_movimento": "2025-04-15", "tipo_movimento": "S", "transacao": "510",
      "deposito": "01", "quantidade": 25.0, "documento": "123456",
      "fornecedor": null, "origem": null, "saldo_atual": 480.0
    }
  ]
}
```

---

## 4) Checklist de validação

- [ ] `Depends(validar_token)` ativo (responde 401 sem JWT).
- [ ] Sem filtros: retorna todas as movimentações paginadas.
- [ ] `pagina=2` traz registros diferentes de `pagina=1`.
- [ ] `total_registros` igual à contagem real (não apenas o tamanho da página).
- [ ] `total_paginas = ceil(total_registros / tamanho_pagina)`.
- [ ] Filtro `codpro=PRD-001` retorna apenas esse produto.
- [ ] Filtro `data_ini` / `data_fim` respeita o intervalo.
- [ ] Filtro `coddep` retorna apenas o depósito informado.
- [ ] `saldo_atual` igual ao retornado por `/api/estoque` para o mesmo (codpro, codder, coddep).
- [ ] Campos retornados batem com `MovimentacaoItem` (frontend não quebra).

---

## 5) Próximos endpoints (mesmo padrão)

Após validar este, replicar para:
- `GET /api/estoque/sugestao-politica` — ver `docs/backend-sugestao-minmax.md` §2.
- `POST /api/estoque/politica/salvar` — ver `docs/backend-sugestao-minmax.md` §3 (MERGE em `USU_EST_POLITICA`).

Quando os 3 estiverem no ar, o banner "Backend pendente" em `/sugestao-min-max` desaparece automaticamente na primeira resposta 200 — nenhuma mudança no frontend é necessária.
