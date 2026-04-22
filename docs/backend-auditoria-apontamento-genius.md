# Backend — Auditoria Apontamento Genius

Contrato a ser implementado pelo FastAPI do ERP para a tela `/auditoria-apontamento-genius`.

## Escopo
Conferir apontamentos de produção da operação **GENIUS**, comparando início/fim e destacando:
- Apontamento individual com horas apontadas > 8h.
- Soma diária por operador > 8h.
- Apontamentos sem hora de início ou sem hora de fim.
- Apontamentos com hora_fim < hora_inicio.

### Origens GENIUS (filtro fixo no backend)
`110, 120, 130, 135, 140, 150, 205, 208, 210, 220, 230, 235, 240, 245, 250`

O endpoint **deve sempre filtrar** `CODORI IN (...lista acima...)`. Mesmo que o cliente envie `codori` específica, ela só é aceita se pertencer a essa lista; caso contrário ignorar.

---

## 1. `GET /api/auditoria-apontamento-genius`

### Autenticação
`Depends(validar_token)` — mesmo padrão das demais rotas.

### Query params
| Nome | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `data_ini` | date (YYYY-MM-DD) | sim | Data inicial do apontamento |
| `data_fim` | date (YYYY-MM-DD) | sim | Data final |
| `numop` | str | não | Número da OP (LIKE) |
| `codori` | str | não | Origem (deve estar na lista GENIUS) |
| `codpro` | str | não | Código produto (LIKE) |
| `operador` | str | não | Nome/código operador (LIKE) |
| `status_op` | str | não | `EM_ANDAMENTO` ou `FINALIZADO` (filtra cabeçalho da OP via `E215OPE.SITPRO`) |
| `somente_discrepancia` | int (0/1) | não | Filtra `status != 'OK'` |
| `somente_acima_8h` | int (0/1) | não | Filtra `APONTAMENTO_MAIOR_8H` ou `OPERADOR_MAIOR_8H_DIA` |
| `pagina` | int | não | default 1 |
| `tamanho_pagina` | int | não | default 100 |

### Response
```json
{
  "pagina": 1,
  "tamanho_pagina": 100,
  "total_registros": 1234,
  "total_paginas": 13,
  "dados": [
    {
      "data": "2026-04-15",
      "codori": "110",
      "numop": "OP-12345",
      "estagio": "USINAGEM",
      "seq_roteiro": 10,
      "seq_apontamento": 1,
      "usuario": "FULANO",
      "operador": "OP-007",
      "turno": "1",
      "codpro": "PRD-001",
      "despro": "Eixo Cardan",
      "hora_inicio": "07:30",
      "hora_fim": "16:45",
      "horas_alocadas": 8.0,
      "horas_apontadas": 9.25,
      "total_dia_operador": 9.25,
      "status_op": "EM_ANDAMENTO",
      "status": "APONTAMENTO_MAIOR_8H"
    }
  ],
  "resumo": {
    "total_registros": 1234,
    "total_discrepancias": 87,
    "sem_inicio": 5,
    "sem_fim": 12,
    "fim_menor_inicio": 2,
    "acima_8h": 68,
    "maior_total_dia_operador": 11.5,
    "operador_maior_total": "OP-007",
    "ops_em_andamento": 42,
    "ops_finalizadas": 178
  }
}
  "resumo": {
    "total_registros": 1234,
    "total_discrepancias": 87,
    "sem_inicio": 5,
    "sem_fim": 12,
    "fim_menor_inicio": 2,
    "acima_8h": 68,
    "maior_total_dia_operador": 11.5,
    "operador_maior_total": "OP-007"
  }
}
```

### Status possíveis
- `OK`
- `SEM_INICIO` — `hora_inicio` nula/vazia
- `SEM_FIM` — `hora_fim` nula/vazia
- `FIM_MENOR_INICIO` — `hora_fim < hora_inicio` no mesmo dia
- `APONTAMENTO_MAIOR_8H` — `horas_apontadas > 8`
- `OPERADOR_MAIOR_8H_DIA` — soma diária do operador > 8h (e este apontamento individual ≤ 8h)

Ordem de prioridade na atribuição: `FIM_MENOR_INICIO` > `SEM_INICIO` > `SEM_FIM` > `APONTAMENTO_MAIOR_8H` > `OPERADOR_MAIOR_8H_DIA` > `OK`.

### Pydantic
```python
from pydantic import BaseModel
from typing import List, Optional

class ApontamentoGeniusItem(BaseModel):
    data: Optional[str]
    codori: Optional[str]
    numop: Optional[str]
    estagio: Optional[str]
    seq_roteiro: Optional[int]
    seq_apontamento: Optional[int]
    usuario: Optional[str]
    operador: Optional[str]
    turno: Optional[str]
    codpro: Optional[str]
    despro: Optional[str]
    hora_inicio: Optional[str]
    hora_fim: Optional[str]
    horas_alocadas: float = 0
    horas_apontadas: float = 0
    total_dia_operador: float = 0
    status: str = "OK"

class ResumoApontGenius(BaseModel):
    total_registros: int = 0
    total_discrepancias: int = 0
    sem_inicio: int = 0
    sem_fim: int = 0
    fim_menor_inicio: int = 0
    acima_8h: int = 0
    maior_total_dia_operador: float = 0
    operador_maior_total: str = ""

class PaginatedApontGenius(BaseModel):
    pagina: int
    tamanho_pagina: int
    total_registros: int
    total_paginas: int
    dados: List[ApontamentoGeniusItem]
    resumo: ResumoApontGenius
```

### SQL exemplo (T-SQL / Senior)
Tabelas-base sugeridas (ajustar para o dicionário do cliente):
- `E660APO` — apontamento de operação
- `E660APP` — apontamento por operador (alguns dicionários)
- `E215OPE` — ordem de produção / cabeçalho
- `E075PRO` — produto

```sql
WITH base AS (
  SELECT
    APO.DATAPO                                   AS data,
    OPE.CODORI                                   AS codori,
    OPE.NUMOPR                                   AS numop,
    APO.CODOPE                                   AS estagio,
    APO.SEQROT                                   AS seq_roteiro,
    APO.SEQAPO                                   AS seq_apontamento,
    APO.USUGRV                                   AS usuario,
    APO.CODOPER                                  AS operador,
    APO.CODTUR                                   AS turno,
    OPE.CODPRO                                   AS codpro,
    PRO.DESPRO                                   AS despro,
    APO.HORINI                                   AS hora_inicio,
    APO.HORFIM                                   AS hora_fim,
    APO.HORALO                                   AS horas_alocadas,
    CASE
      WHEN APO.HORINI IS NULL OR APO.HORFIM IS NULL THEN 0
      WHEN APO.HORFIM < APO.HORINI THEN 0
      ELSE DATEDIFF(MINUTE, APO.HORINI, APO.HORFIM) / 60.0
    END                                          AS horas_apontadas
  FROM E660APO APO
  INNER JOIN E215OPE OPE ON OPE.NUMOPR = APO.NUMOPR
  LEFT  JOIN E075PRO PRO ON PRO.CODPRO = OPE.CODPRO
  WHERE APO.DATAPO BETWEEN :data_ini AND :data_fim
    AND OPE.CODORI IN ('110','120','130','135','140','150',
                       '205','208','210','220','230','235','240','245','250')
    AND (:numop    IS NULL OR APO.NUMOPR  LIKE '%' + :numop + '%')
    AND (:codori   IS NULL OR OPE.CODORI = :codori)
    AND (:codpro   IS NULL OR OPE.CODPRO LIKE '%' + :codpro + '%')
    AND (:operador IS NULL OR APO.CODOPER LIKE '%' + :operador + '%')
),
agg AS (
  SELECT
    base.*,
    SUM(horas_apontadas) OVER (PARTITION BY operador, data) AS total_dia_operador
  FROM base
),
classificado AS (
  SELECT
    agg.*,
    CASE
      WHEN hora_inicio IS NOT NULL AND hora_fim IS NOT NULL AND hora_fim < hora_inicio
        THEN 'FIM_MENOR_INICIO'
      WHEN hora_inicio IS NULL THEN 'SEM_INICIO'
      WHEN hora_fim    IS NULL THEN 'SEM_FIM'
      WHEN horas_apontadas > 8 THEN 'APONTAMENTO_MAIOR_8H'
      WHEN total_dia_operador > 8 THEN 'OPERADOR_MAIOR_8H_DIA'
      ELSE 'OK'
    END AS status
  FROM agg
)
SELECT *
FROM classificado
WHERE (:somente_discrepancia = 0 OR status <> 'OK')
  AND (:somente_acima_8h = 0 OR status IN ('APONTAMENTO_MAIOR_8H','OPERADOR_MAIOR_8H_DIA'))
ORDER BY data DESC, operador, numop
OFFSET (:pagina - 1) * :tamanho_pagina ROWS
FETCH NEXT :tamanho_pagina ROWS ONLY;
```

### Bloco resumo (segunda query, mesmos filtros, sem paginação)
```sql
WITH ... (mesmo CTE classificado acima) ...
SELECT
  COUNT(*)                                                      AS total_registros,
  SUM(CASE WHEN status <> 'OK' THEN 1 ELSE 0 END)               AS total_discrepancias,
  SUM(CASE WHEN status = 'SEM_INICIO' THEN 1 ELSE 0 END)        AS sem_inicio,
  SUM(CASE WHEN status = 'SEM_FIM'    THEN 1 ELSE 0 END)        AS sem_fim,
  SUM(CASE WHEN status = 'FIM_MENOR_INICIO' THEN 1 ELSE 0 END)  AS fim_menor_inicio,
  SUM(CASE WHEN status IN ('APONTAMENTO_MAIOR_8H','OPERADOR_MAIOR_8H_DIA') THEN 1 ELSE 0 END) AS acima_8h
FROM classificado;
```
E mais uma query top-1 para `maior_total_dia_operador` / `operador_maior_total`:
```sql
SELECT TOP 1 operador, MAX(total_dia_operador) AS total
FROM classificado
GROUP BY operador
ORDER BY total DESC;
```

---

## 2. `GET /api/export/auditoria-apontamento-genius`

Mesmos query params (sem `pagina`/`tamanho_pagina`). Retorna `.xlsx` via `StreamingResponse` com `Content-Disposition: attachment; filename=auditoria-apontamento-genius_YYYYMMDD.xlsx`. Mesma estrutura de colunas da resposta JSON.

---

## Checklist de validação
- [ ] Retorna apenas origens GENIUS (mesmo se `codori` vazio).
- [ ] Campo `status` sempre presente, valor em maiúsculas e dentro do enum acima.
- [ ] `horas_apontadas` calculado em horas decimais (ex.: 9.25, não 9:15).
- [ ] `total_dia_operador` é o **mesmo valor** para todos os apontamentos do mesmo operador no mesmo dia.
- [ ] Bloco `resumo` retornado mesmo quando `dados` é vazio (todos zero, `operador_maior_total = ""`).
- [ ] Filtro `somente_discrepancia=1` remove linhas `OK`.
- [ ] Filtro `somente_acima_8h=1` mantém só `APONTAMENTO_MAIOR_8H` e `OPERADOR_MAIOR_8H_DIA`.
- [ ] Paginação via `OFFSET/FETCH NEXT`; `total_paginas = ceil(total_registros / tamanho_pagina)`.
- [ ] Exportação `.xlsx` respeita os mesmos filtros.

---

## Permissões frontend
Após a publicação, cadastrar a rota `/auditoria-apontamento-genius` na tela **Configurações → Perfis de acesso** (`profile_screens`) para perfis sem `hasPermissions` total. Sem migração automática nesta tarefa.
