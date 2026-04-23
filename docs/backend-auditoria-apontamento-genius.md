# Backend — Auditoria Apontamento Genius

Contrato a ser implementado pelo FastAPI do ERP para a tela `/auditoria-apontamento-genius`.

## Escopo
Conferir **apontamentos nativos de produção** da operação **GENIUS** — esta tela **não** consome a base consolidada de Engenharia x Produção. Os dados devem vir do fluxo nativo de apontamento, comparando início/fim e destacando:
- Apontamento individual com horas apontadas > 8h.
- Soma diária por operador > 8h.
- Apontamentos sem hora de início ou sem hora de fim.
- Apontamentos com hora_fim < hora_inicio.

### Origens GENIUS (filtro fixo no backend)
`110, 120, 130, 135, 140, 150, 205, 208, 210, 220, 230, 235, 240, 245, 250`

A lista **começa em 110**. O endpoint **deve sempre filtrar** `CodOri IN (...lista acima...)`. Mesmo que o cliente envie `codori` específica, ela só é aceita se pertencer a essa lista; caso contrário ignorar.

### Parâmetros nativos do fluxo de apontamento
A consulta deve usar diretamente os campos nativos do apontamento de produção:

| Campo nativo | Uso na tela |
|---|---|
| `CodOri` | Origem (filtro GENIUS começando em 110) |
| `NumOrp` | Número da OP |
| `CodEtg` | Estágio do roteiro |
| `SeqRot` | Sequência do roteiro |
| `DatMov` | **Data real do movimento** — usada nos filtros `data_ini`/`data_fim` |
| `HorMov` | Hora real do movimento (compõe `hora_inicio`/`hora_fim`) |

### Status nativos da OP (E900COP)
A coluna `status_op` deve refletir o status real do cabeçalho da OP em `E900COP`:

| Código | Significado | Agrupamento |
|---|---|---|
| `E` | Emitida | **Ativa** |
| `L` | Liberada | **Ativa** |
| `A` | Andamento | **Ativa** |
| `F` | Finalizada | Finalizada |
| `C` | Cancelada | Cancelada |

- **OPs ativas** (`ops_em_andamento`) = `COUNT(DISTINCT NumOrp)` onde status ∈ {`E`, `L`, `A`}.
- **OPs finalizadas** (`ops_finalizadas`) = `COUNT(DISTINCT NumOrp)` onde status = `F`.
- **OPs canceladas** (opcional `ops_canceladas`) = `COUNT(DISTINCT NumOrp)` onde status = `C`.
- Linhas sem status devem ser marcadas como `SEM_STATUS` no payload.

O frontend aceita tanto os códigos de uma letra (`E/L/A/F/C`) quanto os agrupamentos legados (`EM_ANDAMENTO/FINALIZADO/CANCELADO`). Preferir os códigos nativos.

---

## ⚠️ Bloco `debug` obrigatório enquanto a investigação estiver ativa

Enquanto a tela estiver retornando `dados: []` em produção, o endpoint **deve** retornar um bloco adicional `debug` com a SQL final montada e a contagem por etapa do filtro. Isso permite identificar onde os registros estão sendo eliminados sem afirmar incorretamente que não há apontamentos.

```json
"debug": {
  "sql_final": "SELECT ... FROM <tabela_apontamento> ... WHERE DatMov BETWEEN ...",
  "parametros": { "data_ini": "...", "data_fim": "...", "codori": "..." },
  "etapas": [
    { "nome": "movimentos_no_periodo (DatMov)", "quantidade": 1234 },
    { "nome": "movimentos_em_origens_genius (CodOri IN ...)", "quantidade": 842 },
    { "nome": "ops_validas (join E900COP)", "quantidade": 615 },
    { "nome": "ops_por_status_E_L_A", "quantidade": 410 },
    { "nome": "ops_por_status_F", "quantidade": 198 },
    { "nome": "ops_por_status_C", "quantidade": 7 },
    { "nome": "linhas_apos_filtros_opcionais", "quantidade": 612 },
    { "nome": "linhas_finais_paginadas", "quantidade": 100 }
  ],
  "contagem_por_origem":    [{ "chave": "110", "quantidade": 320 }],
  "contagem_por_status_op": [{ "chave": "E", "label": "Emitida", "quantidade": 12 }],
  "contagem_por_op":        [{ "chave": "OP-12345", "quantidade": 18 }],
  "apontamentos_por_op":    [{ "chave": "OP-12345", "quantidade": 18 }]
}
```

Antes de concluir “sem dados”, o backend deve obrigatoriamente retornar:
1. `sql_final` montada com os parâmetros aplicados;
2. quantidade de OPs GENIUS no período (`DatMov`);
3. quantidade de apontamentos por OP;
4. quantidade por status da OP (`E/L/A/F/C`);
5. quantidade por origem (`CodOri`).

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
| `status_op` | str | não | Aceita códigos nativos `E`/`L`/`A`/`F`/`C` (preferido) **ou** agrupamentos legados `EM_ANDAMENTO`/`FINALIZADO`/`CANCELADO`. Aplicado no cabeçalho da OP em `E900COP`. |
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
      "status_op": "A",
      "status": "APONTAMENTO_MAIOR_8H"
    }
  ],
  "resumo": {
    "total_registros": 1234,
    "total_discrepancias": 87,

    "// Campos preferidos (total_*) — frontend prioriza estes": "",
    "total_sem_inicio": 5,
    "total_sem_fim": 12,
    "total_fim_menor_inicio": 2,
    "total_apontamento_maior_8h": 60,
    "total_operador_maior_8h_dia": 8,
    "total_ops_andamento": 42,
    "total_ops_finalizadas": 178,

    "// Aliases legados — backend pode enviar ambos": "",
    "sem_inicio": 5,
    "sem_fim": 12,
    "fim_menor_inicio": 2,
    "acima_8h": 68,
    "ops_em_andamento": 42,
    "ops_finalizadas": 178,
    "ops_canceladas": 7,
    "ops_sem_status": 0,

    "maior_total_dia_operador": 11.5,
    "operador_maior_total": "OP-007"
  }
}
```

### Campos opcionais — formato ERP "Movtos. O.P./O.S."
Para a visão de detalhe por movimento (Sheet "Apontamentos vinculados") o frontend
consome estes campos opcionais. Quando o backend não enviar, a célula correspondente
mostra `—` sem quebrar o render.

| Campo | Tipo | Descrição |
|---|---|---|
| `derivacao` | string | Código de derivação do produto |
| `equipamento` | string | Código do equipamento utilizado |
| `qtde_primeira_qualidade` | number | Qtde 1ª qualidade apontada (fallback: `quantidade`) |
| `qtde_refugo` | number | Qtde refugo |
| `qtde_inspecao` | number | Qtde em inspeção |
| `tempo_bruto_min` | number | Tempo bruto **em minutos** (fallback: `horas_realizadas`) |
| `tempo_liquido_min` | number | Tempo líquido em minutos (fallback: `tempo_bruto_min`) |
| `centro_recurso` | string | Código do Centro de Recurso (C.R.) |
| `data_inicial` / `hora_inicial` | string | Data/hora de início do movimento |
| `data_final` / `hora_final` | string | Data/hora de fim do movimento |
| `seq_roteiro` | number | Sequência do roteiro (preferido sobre `seqrot`) |

#### Fallbacks aplicados pelo frontend (`normalizeRowApont`)
O backend pode mandar qualquer um dos nomes abaixo — o frontend escolhe o primeiro disponível:

| Campo final | Ordem de fallback |
|---|---|
| `equipamento` | `equipamento` ?? `codigo_equipamento` |
| `centro_recurso` | `centro_recurso` ?? `cod_recurso` ?? `codigo_centro_trabalho` |
| `qtde_primeira_qualidade` | `qtde_primeira_qualidade` ?? `quantidade` ?? `qtde` |
| `tempo_bruto_min` | `tempo_bruto_min` ?? `horas_realizadas` (em min) |
| `tempo_liquido_min` | `tempo_liquido_min` ?? `tempo_bruto_min` ?? `horas_realizadas` |
| `seq_roteiro` | `seq_roteiro` ?? `seqrot` |


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
    status_op: Optional[str] = None  # 'EM_ANDAMENTO' | 'FINALIZADO'
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
    ops_em_andamento: int = 0
    ops_finalizadas: int = 0

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
    END                                          AS horas_apontadas,
    CASE
      WHEN OPE.SITPRO IN (4, 9) THEN 'FINALIZADO'
      ELSE 'EM_ANDAMENTO'
    END                                          AS status_op
  FROM E660APO APO
  INNER JOIN E215OPE OPE ON OPE.NUMOPR = APO.NUMOPR
  LEFT  JOIN E075PRO PRO ON PRO.CODPRO = OPE.CODPRO
  WHERE APO.DATAPO BETWEEN :data_ini AND :data_fim
    AND OPE.CODORI IN ('110','120','130','135','140','150',
                       '205','208','210','220','230','235','240','245','250')
    AND (:numop     IS NULL OR APO.NUMOPR  LIKE '%' + :numop + '%')
    AND (:codori    IS NULL OR OPE.CODORI = :codori)
    AND (:codpro    IS NULL OR OPE.CODPRO LIKE '%' + :codpro + '%')
    AND (:operador  IS NULL OR APO.CODOPER LIKE '%' + :operador + '%')
    AND (:status_op IS NULL
         OR (:status_op = 'FINALIZADO'   AND OPE.SITPRO IN (4, 9))
         OR (:status_op = 'EM_ANDAMENTO' AND OPE.SITPRO NOT IN (4, 9)))
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
  SUM(CASE WHEN status IN ('APONTAMENTO_MAIOR_8H','OPERADOR_MAIOR_8H_DIA') THEN 1 ELSE 0 END) AS acima_8h,
  COUNT(DISTINCT CASE WHEN status_op = 'EM_ANDAMENTO' THEN numop END) AS ops_em_andamento,
  COUNT(DISTINCT CASE WHEN status_op = 'FINALIZADO'   THEN numop END) AS ops_finalizadas
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
- [ ] Campo `status_op` presente em 100% das linhas (`EM_ANDAMENTO` ou `FINALIZADO`), derivado de `E215OPE.SITPRO`.
- [ ] Filtro `status_op` aceito (`EM_ANDAMENTO` / `FINALIZADO`) e aplicado no cabeçalho da OP.
- [ ] `resumo.ops_em_andamento` e `resumo.ops_finalizadas` calculados como `COUNT(DISTINCT numop)` por status_op (consistentes com a contagem distinta de OPs no conjunto filtrado).

---

## Permissões frontend
Após a publicação, cadastrar a rota `/auditoria-apontamento-genius` na tela **Configurações → Perfis de acesso** (`profile_screens`) para perfis sem `hasPermissions` total. Sem migração automática nesta tarefa.
