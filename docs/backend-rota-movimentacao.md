# Rota: `GET /api/estoque/movimentacao`

Implementação **copy-paste** para o backend FastAPI do ERP Senior, alinhada **campo a campo** com o contrato que a tela `/sugestao-min-max` já consome em modo demo (`src/lib/demoMovimentacao.ts`).

> ⚠️ **Regra de ouro**: a tela troca demo ↔ backend real sem mudanças no frontend. Para isso, **os nomes de campos do JSON de resposta são imutáveis** — se o dicionário do cliente usar nomes diferentes em `E210MVP` (ex.: `DATEMI` em vez de `DATMOV`, `QTD` em vez de `QTDMOV`, `NUMDCT` em vez de `NUMDOC`), ajuste apenas a **coluna de origem** preservando o `AS alias`.

---

## 1) Contrato canônico (demo ↔ backend)

Referência: `src/lib/demoMovimentacao.ts` → `interface DemoMovimentacao` e `DemoResponse.resumo`.

### 1.1. Item de movimentação (`MovimentacaoItem`)

| Campo JSON          | Tipo               | Origem SQL (T-SQL Senior)                                                                 | Observação |
|---------------------|--------------------|--------------------------------------------------------------------------------------------|------------|
| `codemp`            | int                | `MVP.CODEMP`                                                                               | |
| `codfil`            | int \| null        | `MVP.CODFIL`                                                                               | |
| `codpro`            | string             | `MVP.CODPRO`                                                                               | |
| `despro`            | string             | `PRO.DESPRO`                                                                               | JOIN `E075PRO` |
| `codder`            | string             | `MVP.CODDER`                                                                               | |
| `coddep`            | string             | `MVP.CODDEP`                                                                               | |
| `codfam`            | string \| null     | `PRO.CODFAM`                                                                               | |
| `codori`            | string \| null     | `PRO.CODORI`                                                                               | |
| `unimed`            | string \| null     | `PRO.UNIMED`                                                                               | |
| `data_movimento`    | date (`YYYY-MM-DD`)| `MVP.DATMOV`                                                                               | Fallback: `MVP.DATEMI` |
| `tipo_movimento`    | `'ENT'` \| `'SAI'` | `CASE WHEN MVP.TIPMOV = 'E' THEN 'ENT' WHEN MVP.TIPMOV = 'S' THEN 'SAI' END`               | **Normaliza 1 letra → 3 letras** |
| `transacao`         | string             | `MVP.CODTRA`                                                                               | |
| `deposito`          | string             | `MVP.CODDEP`                                                                               | |
| `quantidade`        | float              | `MVP.QTDMOV`                                                                               | Fallback: `MVP.QTD` |
| `documento`         | string             | `MVP.NUMDOC`                                                                               | Fallback: `MVP.NUMDCT` |
| `fornecedor`        | string \| null     | `FOR.NOMFOR` via `LEFT JOIN E140FOR FOR ON FOR.CODFOR = MVP.CODFOR`                        | `null` em saídas |
| `origem`            | string             | `COALESCE(PRO.CODORI, 'INT')`                                                              | |
| `saldo_atual`       | float              | `ISNULL(EST.SALDO, 0)`                                                                     | Subquery `E210EST` |
| `consumo_medio`     | float              | `AGG.CONSUMO_180D / 180.0`                                                                 | CTE `agregados_produto` |
| `lead_time_dias`    | int                | `ISNULL(AGG.LEAD_TIME, 15)`                                                                | Fallback 15 dias |
| `minimo_sugerido`   | float              | `AGG.CONSUMO_MEDIO * AGG.LEAD_TIME + (AGG.CONSUMO_MEDIO * 0.5 * AGG.LEAD_TIME)`            | Fórmula da doc Min/Max |
| `maximo_sugerido`   | float              | `minimo + AGG.CONSUMO_MEDIO * 30`                                                          | Lote mensal |
| `status`            | string             | `CASE WHEN saldo<minimo 'ABAIXO_MINIMO' WHEN saldo>maximo 'ACIMA_MAXIMO' ELSE 'ENTRE_MIN_E_MAX' END` | |

### 1.2. Bloco `resumo` (sempre presente, mesmo com `dados` vazio)

| Campo                    | Tipo  | Cálculo                                                                  |
|--------------------------|-------|--------------------------------------------------------------------------|
| `saldo_atual_total`      | float | `SUM(saldo_atual)` agregado por produto                                  |
| `consumo_90d`            | float | `SUM(QTDMOV)` de saídas nos últimos 90 dias                              |
| `consumo_180d`           | float | `SUM(QTDMOV)` de saídas nos últimos 180 dias                             |
| `lead_time_medio_dias`   | float | `AVG(lead_time_dias)`                                                    |
| `minimo_sugerido_total`  | float | `SUM(minimo_sugerido)`                                                   |
| `maximo_sugerido_total`  | float | `SUM(maximo_sugerido)`                                                   |

---

## 2) `routers/estoque_movimentacao.py`

```python
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, timedelta
from auth import validar_token          # mesmo import usado em /api/estoque
from db import get_connection           # mesmo import usado em /api/estoque

router = APIRouter()


# ---------- Models ----------
class MovimentacaoItem(BaseModel):
    codemp: Optional[int] = None
    codfil: Optional[int] = None
    codpro: Optional[str] = None
    despro: Optional[str] = None
    codder: Optional[str] = None
    coddep: Optional[str] = None
    codfam: Optional[str] = None
    codori: Optional[str] = None
    unimed: Optional[str] = None
    data_movimento: Optional[date] = None
    tipo_movimento: Optional[str] = None        # 'ENT' | 'SAI'
    transacao: Optional[str] = None
    deposito: Optional[str] = None
    quantidade: Optional[float] = 0
    documento: Optional[str] = None
    fornecedor: Optional[str] = None
    origem: Optional[str] = None
    saldo_atual: Optional[float] = 0
    consumo_medio: Optional[float] = 0
    lead_time_dias: Optional[int] = 15
    minimo_sugerido: Optional[float] = 0
    maximo_sugerido: Optional[float] = 0
    status: Optional[str] = "ENTRE_MIN_E_MAX"


class ResumoMovimentacao(BaseModel):
    saldo_atual_total: float = 0
    consumo_90d: float = 0
    consumo_180d: float = 0
    lead_time_medio_dias: float = 0
    minimo_sugerido_total: float = 0
    maximo_sugerido_total: float = 0


class PaginatedMovimentacao(BaseModel):
    pagina: int
    tamanho_pagina: int
    total_registros: int
    total_paginas: int
    dados: List[MovimentacaoItem]
    resumo: ResumoMovimentacao


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
    hoje = date.today()
    d180 = hoje - timedelta(days=180)
    d90 = hoje - timedelta(days=90)

    # CTE agregados_produto: consumo médio, lead time, mínimo, máximo, status
    # por (CODEMP, CODPRO, CODDER, CODDEP) — calculados em janela de 180 dias.
    sql = """
    WITH saldo AS (
        SELECT CODEMP, CODPRO, CODDER, CODDEP, SUM(QTDEST) AS SALDO
        FROM E210EST
        GROUP BY CODEMP, CODPRO, CODDER, CODDEP
    ),
    consumo AS (
        SELECT CODEMP, CODPRO, CODDER, CODDEP,
               SUM(CASE WHEN TIPMOV = 'S' AND DATMOV >= :d180 THEN QTDMOV ELSE 0 END) AS CONSUMO_180D,
               SUM(CASE WHEN TIPMOV = 'S' AND DATMOV >= :d90  THEN QTDMOV ELSE 0 END) AS CONSUMO_90D
        FROM E210MVP
        GROUP BY CODEMP, CODPRO, CODDER, CODDEP
    ),
    leadtime AS (
        -- Lead time médio entre emissão da OC e entrada (NF) por produto.
        -- Ajuste o JOIN se o seu modelo usar tabelas diferentes (E140IPC/E140NFE).
        SELECT IPC.CODEMP, IPC.CODPRO,
               AVG(CAST(DATEDIFF(day, OC.DATEMI, NF.DATEMI) AS FLOAT)) AS LEAD_TIME
        FROM E140IPC IPC
        JOIN E140OCC OC ON OC.CODEMP = IPC.CODEMP AND OC.NUMOCC = IPC.NUMOCC
        JOIN E140NFE NF ON NF.CODEMP = IPC.CODEMP AND NF.NUMOCC = IPC.NUMOCC
        WHERE OC.DATEMI >= DATEADD(day, -365, GETDATE())
        GROUP BY IPC.CODEMP, IPC.CODPRO
    ),
    agregados_produto AS (
        SELECT
            c.CODEMP, c.CODPRO, c.CODDER, c.CODDEP,
            c.CONSUMO_180D,
            c.CONSUMO_90D,
            (c.CONSUMO_180D / 180.0)                                AS CONSUMO_MEDIO,
            ISNULL(lt.LEAD_TIME, 15)                                AS LEAD_TIME,
            ISNULL(s.SALDO, 0)                                      AS SALDO_ATUAL,
            ((c.CONSUMO_180D / 180.0) * ISNULL(lt.LEAD_TIME, 15))
              + ((c.CONSUMO_180D / 180.0) * 0.5 * ISNULL(lt.LEAD_TIME, 15)) AS MINIMO,
            (((c.CONSUMO_180D / 180.0) * ISNULL(lt.LEAD_TIME, 15))
              + ((c.CONSUMO_180D / 180.0) * 0.5 * ISNULL(lt.LEAD_TIME, 15)))
              + ((c.CONSUMO_180D / 180.0) * 30)                    AS MAXIMO
        FROM consumo c
        LEFT JOIN leadtime lt ON lt.CODEMP = c.CODEMP AND lt.CODPRO = c.CODPRO
        LEFT JOIN saldo    s  ON s.CODEMP  = c.CODEMP AND s.CODPRO  = c.CODPRO
                              AND s.CODDER = c.CODDER AND s.CODDEP  = c.CODDEP
    )
    SELECT
        COUNT(*) OVER()                                                  AS total_registros,
        MVP.CODEMP                                                       AS codemp,
        MVP.CODFIL                                                       AS codfil,
        MVP.CODPRO                                                       AS codpro,
        PRO.DESPRO                                                       AS despro,
        MVP.CODDER                                                       AS codder,
        MVP.CODDEP                                                       AS coddep,
        PRO.CODFAM                                                       AS codfam,
        PRO.CODORI                                                       AS codori,
        PRO.UNIMED                                                       AS unimed,
        MVP.DATMOV                                                       AS data_movimento,   -- ajuste se for DATEMI
        CASE WHEN MVP.TIPMOV = 'E' THEN 'ENT'
             WHEN MVP.TIPMOV = 'S' THEN 'SAI'
             ELSE MVP.TIPMOV END                                         AS tipo_movimento,
        MVP.CODTRA                                                       AS transacao,
        MVP.CODDEP                                                       AS deposito,
        MVP.QTDMOV                                                       AS quantidade,        -- ajuste se for QTD
        MVP.NUMDOC                                                       AS documento,         -- ajuste se for NUMDCT
        FOR_.NOMFOR                                                      AS fornecedor,
        COALESCE(PRO.CODORI, 'INT')                                      AS origem,
        AGG.SALDO_ATUAL                                                  AS saldo_atual,
        AGG.CONSUMO_MEDIO                                                AS consumo_medio,
        CAST(AGG.LEAD_TIME AS INT)                                       AS lead_time_dias,
        AGG.MINIMO                                                       AS minimo_sugerido,
        AGG.MAXIMO                                                       AS maximo_sugerido,
        CASE
            WHEN AGG.SALDO_ATUAL < AGG.MINIMO THEN 'ABAIXO_MINIMO'
            WHEN AGG.SALDO_ATUAL > AGG.MAXIMO THEN 'ACIMA_MAXIMO'
            ELSE 'ENTRE_MIN_E_MAX'
        END                                                              AS status
    FROM E210MVP MVP
    LEFT JOIN E075PRO PRO
        ON PRO.CODEMP = MVP.CODEMP AND PRO.CODPRO = MVP.CODPRO
    LEFT JOIN E140FOR FOR_
        ON FOR_.CODFOR = MVP.CODFOR                                       -- remova se MVP não tiver CODFOR
    LEFT JOIN agregados_produto AGG
        ON AGG.CODEMP = MVP.CODEMP AND AGG.CODPRO = MVP.CODPRO
       AND AGG.CODDER = MVP.CODDER AND AGG.CODDEP = MVP.CODDEP
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

    # Resumo: agrega sobre os MESMOS filtros de produto (ignora data_*),
    # garantindo bloco sempre presente (zeros quando vazio).
    sql_resumo = """
    WITH saldo AS (
        SELECT CODEMP, CODPRO, CODDER, CODDEP, SUM(QTDEST) AS SALDO
        FROM E210EST GROUP BY CODEMP, CODPRO, CODDER, CODDEP
    ),
    consumo AS (
        SELECT CODEMP, CODPRO, CODDER, CODDEP,
               SUM(CASE WHEN TIPMOV='S' AND DATMOV >= :d180 THEN QTDMOV ELSE 0 END) AS C180,
               SUM(CASE WHEN TIPMOV='S' AND DATMOV >= :d90  THEN QTDMOV ELSE 0 END) AS C90
        FROM E210MVP GROUP BY CODEMP, CODPRO, CODDER, CODDEP
    ),
    leadtime AS (
        SELECT IPC.CODEMP, IPC.CODPRO,
               AVG(CAST(DATEDIFF(day, OC.DATEMI, NF.DATEMI) AS FLOAT)) AS LT
        FROM E140IPC IPC
        JOIN E140OCC OC ON OC.CODEMP=IPC.CODEMP AND OC.NUMOCC=IPC.NUMOCC
        JOIN E140NFE NF ON NF.CODEMP=IPC.CODEMP AND NF.NUMOCC=IPC.NUMOCC
        WHERE OC.DATEMI >= DATEADD(day, -365, GETDATE())
        GROUP BY IPC.CODEMP, IPC.CODPRO
    ),
    agg AS (
        SELECT c.CODEMP, c.CODPRO, c.CODDER, c.CODDEP,
               c.C90, c.C180,
               (c.C180/180.0)                                  AS CM,
               ISNULL(lt.LT, 15)                               AS LT,
               ISNULL(s.SALDO, 0)                              AS SAL,
               ((c.C180/180.0)*ISNULL(lt.LT,15))
                 + ((c.C180/180.0)*0.5*ISNULL(lt.LT,15))       AS MIN_,
               (((c.C180/180.0)*ISNULL(lt.LT,15))
                 + ((c.C180/180.0)*0.5*ISNULL(lt.LT,15)))
                 + ((c.C180/180.0)*30)                         AS MAX_
        FROM consumo c
        LEFT JOIN leadtime lt ON lt.CODEMP=c.CODEMP AND lt.CODPRO=c.CODPRO
        LEFT JOIN saldo    s  ON s.CODEMP=c.CODEMP AND s.CODPRO=c.CODPRO
                              AND s.CODDER=c.CODDER AND s.CODDEP=c.CODDEP
    )
    SELECT
        ISNULL(SUM(agg.SAL), 0)   AS saldo_atual_total,
        ISNULL(SUM(agg.C90), 0)   AS consumo_90d,
        ISNULL(SUM(agg.C180), 0)  AS consumo_180d,
        ISNULL(AVG(agg.LT), 0)    AS lead_time_medio_dias,
        ISNULL(SUM(agg.MIN_), 0)  AS minimo_sugerido_total,
        ISNULL(SUM(agg.MAX_), 0)  AS maximo_sugerido_total
    FROM agg
    LEFT JOIN E075PRO PRO
        ON PRO.CODEMP = agg.CODEMP AND PRO.CODPRO = agg.CODPRO
    WHERE 1=1
      AND (:codpro IS NULL OR agg.CODPRO LIKE '%' + :codpro + '%')
      AND (:despro IS NULL OR PRO.DESPRO LIKE '%' + :despro + '%')
      AND (:codfam IS NULL OR PRO.CODFAM = :codfam)
      AND (:codori IS NULL OR PRO.CODORI = :codori)
      AND (:codder IS NULL OR agg.CODDER = :codder)
      AND (:coddep IS NULL OR agg.CODDEP = :coddep)
    """

    params = {
        "codpro": codpro, "despro": despro, "codfam": codfam, "codori": codori,
        "codder": codder, "coddep": coddep,
        "data_ini": data_ini, "data_fim": data_fim,
        "d90": d90, "d180": d180,
        "offset": offset, "limit": tamanho_pagina,
    }
    params_resumo = {
        "codpro": codpro, "despro": despro, "codfam": codfam, "codori": codori,
        "codder": codder, "coddep": coddep,
        "d90": d90, "d180": d180,
    }

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Página
        cursor.execute(sql, params)
        cols = [c[0] for c in cursor.description]
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()]
        total_registros = rows[0]["total_registros"] if rows else 0
        for r in rows:
            r.pop("total_registros", None)
        total_paginas = (total_registros + tamanho_pagina - 1) // tamanho_pagina if total_registros else 0

        # Resumo
        cursor.execute(sql_resumo, params_resumo)
        rcols = [c[0] for c in cursor.description]
        rrow = cursor.fetchone()
        resumo = dict(zip(rcols, rrow)) if rrow else {}

        return {
            "pagina": pagina,
            "tamanho_pagina": tamanho_pagina,
            "total_registros": total_registros,
            "total_paginas": total_paginas,
            "dados": rows,
            "resumo": {
                "saldo_atual_total": float(resumo.get("saldo_atual_total") or 0),
                "consumo_90d": float(resumo.get("consumo_90d") or 0),
                "consumo_180d": float(resumo.get("consumo_180d") or 0),
                "lead_time_medio_dias": float(resumo.get("lead_time_medio_dias") or 0),
                "minimo_sugerido_total": float(resumo.get("minimo_sugerido_total") or 0),
                "maximo_sugerido_total": float(resumo.get("maximo_sugerido_total") or 0),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar movimentação: {e}")
    finally:
        cursor.close()
        conn.close()
```

---

## 3) Registro no `main.py`

```python
from routers import estoque_movimentacao

app.include_router(
    estoque_movimentacao.router,
    prefix="/api/estoque",
    tags=["estoque"],
)
```

---

## 4) Exemplo de resposta (contrato canônico)

```json
{
  "pagina": 1,
  "tamanho_pagina": 100,
  "total_registros": 1234,
  "total_paginas": 13,
  "dados": [
    {
      "codemp": 1, "codfil": 1,
      "codpro": "PRD-0001", "despro": "Parafuso M8 x 30mm Inox",
      "codder": "01", "coddep": "001",
      "codfam": "FER", "codori": "01", "unimed": "PC",
      "data_movimento": "2025-04-15",
      "tipo_movimento": "SAI",
      "transacao": "510", "deposito": "001",
      "quantidade": 25.0, "documento": "123456",
      "fornecedor": null, "origem": "01",
      "saldo_atual": 480.0,
      "consumo_medio": 8.0,
      "lead_time_dias": 15,
      "minimo_sugerido": 180.0,
      "maximo_sugerido": 420.0,
      "status": "ENTRE_MIN_E_MAX"
    }
  ],
  "resumo": {
    "saldo_atual_total": 12345.0,
    "consumo_90d": 720.0,
    "consumo_180d": 1440.0,
    "lead_time_medio_dias": 14.5,
    "minimo_sugerido_total": 1800.0,
    "maximo_sugerido_total": 4200.0
  }
}
```

### Teste rápido (curl)

```bash
JWT="<token retornado por /api/login>"
ERP="https://flakily-wanning-faye.ngrok-free.dev"

curl -H "Authorization: Bearer $JWT" \
  "$ERP/api/estoque/movimentacao?data_ini=2025-01-01&data_fim=2025-04-21&pagina=1&tamanho_pagina=100"
```

---

## 5) Checklist de validação

- [ ] `Depends(validar_token)` ativo (responde 401 sem JWT).
- [ ] `tipo_movimento` retorna `'ENT'` ou `'SAI'` (**nunca** `'E'`/`'S'`).
- [ ] `fornecedor` populado em entradas; `null` em saídas (ou sempre `null` se `MVP.CODFOR` não existir — remover o JOIN).
- [ ] `origem` nunca vem `null` (fallback `'INT'`).
- [ ] `consumo_medio`, `lead_time_dias`, `minimo_sugerido`, `maximo_sugerido`, `status` presentes em **todas** as linhas.
- [ ] `status` ∈ {`ABAIXO_MINIMO`, `ACIMA_MAXIMO`, `ENTRE_MIN_E_MAX`}.
- [ ] Bloco `resumo` retornado **mesmo quando `dados` é vazio** (todos zero).
- [ ] `total_registros` = contagem real (não tamanho da página).
- [ ] `total_paginas = ceil(total_registros / tamanho_pagina)`.
- [ ] Filtros `codpro`, `despro`, `codfam`, `codori`, `codder`, `coddep`, `data_ini`, `data_fim` funcionando isoladamente.
- [ ] `saldo_atual` igual ao retornado por `/api/estoque` para o mesmo `(codpro, codder, coddep)`.
- [ ] Toggle "Usar dados de exemplo" **desligado** na tela `/sugestao-min-max` → KPIs e badges renderizam idênticos ao modo demo.

---

## 6) Próximos endpoints (mesmo padrão)

Após validar este, replicar para:
- `GET /api/estoque/sugestao-politica` — ver `docs/backend-sugestao-minmax.md` §2.
- `POST /api/estoque/politica/salvar` — ver `docs/backend-sugestao-minmax.md` §3 (MERGE em `USU_EST_POLITICA`).

Quando os 3 estiverem no ar, o banner "Backend pendente" em `/sugestao-min-max` desaparece automaticamente na primeira resposta 200 — nenhuma mudança no frontend é necessária.
