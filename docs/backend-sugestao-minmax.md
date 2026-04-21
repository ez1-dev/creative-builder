# Backend — Sugestão Min/Max (movimentação histórica)

Implementar no backend FastAPI atual. Autenticação via Bearer JWT já existente
(NÃO usar token global). `USUARIO` é extraído do JWT em todas as gravações.

---

## 1. Tabela customizada `USU_EST_POLITICA`

PK: `(CODEMP, CODPRO, CODDER, CODDEP)`

| Coluna                  | Tipo            | Notas                                  |
|-------------------------|-----------------|----------------------------------------|
| CODEMP                  | INT NOT NULL    | Empresa                                |
| CODPRO                  | VARCHAR(30) NN  | Produto                                |
| CODDER                  | VARCHAR(10) NN  | Derivação                              |
| CODDEP                  | VARCHAR(10) NN  | Depósito                               |
| ESTOQUE_MINIMO          | NUMERIC(18,4)   |                                        |
| ESTOQUE_MAXIMO          | NUMERIC(18,4)   |                                        |
| PONTO_PEDIDO            | NUMERIC(18,4)   | Default = ESTOQUE_MINIMO               |
| LOTE_COMPRA             | NUMERIC(18,4)   | Lote sugerido / econômico              |
| CONSUMO_MEDIO_MENSAL    | NUMERIC(18,4)   |                                        |
| LEAD_TIME_DIAS          | INT             |                                        |
| OBS                     | VARCHAR(500)    |                                        |
| USUARIO                 | VARCHAR(50)     | ERP user do JWT                        |
| DATA_ALT                | DATETIME        | GETDATE()                              |

```sql
CREATE TABLE USU_EST_POLITICA (
  CODEMP                INT           NOT NULL,
  CODPRO                VARCHAR(30)   NOT NULL,
  CODDER                VARCHAR(10)   NOT NULL,
  CODDEP                VARCHAR(10)   NOT NULL,
  ESTOQUE_MINIMO        NUMERIC(18,4) NULL,
  ESTOQUE_MAXIMO        NUMERIC(18,4) NULL,
  PONTO_PEDIDO          NUMERIC(18,4) NULL,
  LOTE_COMPRA           NUMERIC(18,4) NULL,
  CONSUMO_MEDIO_MENSAL  NUMERIC(18,4) NULL,
  LEAD_TIME_DIAS        INT           NULL,
  OBS                   VARCHAR(500)  NULL,
  USUARIO               VARCHAR(50)   NULL,
  DATA_ALT              DATETIME      NULL,
  CONSTRAINT PK_USU_EST_POLITICA PRIMARY KEY (CODEMP, CODPRO, CODDER, CODDEP)
);
```

---

## 2. Endpoints

### 2.1 `GET /api/estoque/movimentacao`

Lista a movimentação analítica (E210MVP + complemento via E210DLS quando ausente).

**Query params:** `codpro, despro, codfam, codori, codder, coddep, data_ini, data_fim, pagina, tamanho_pagina`.

**Resposta:** `PaginatedResponse` com `dados[]` (linhas analíticas) e `resumo`:

```json
{
  "pagina": 1,
  "tamanho_pagina": 100,
  "total_registros": 0,
  "total_paginas": 0,
  "dados": [
    {
      "codemp": 1, "codpro": "ABC", "codder": "01", "coddep": "001",
      "data_movimento": "2025-09-01",
      "tipo_movimento": "ENT/SAI/...", "transacao": "100",
      "deposito": "001", "quantidade": 10.0,
      "documento": "NF 12345", "fornecedor": "...", "origem": "E210MVP",
      "saldo_atual": 50.0, "consumo_medio": 1.2,
      "minimo_sugerido": 18.0, "maximo_sugerido": 54.0,
      "status": "ABAIXO_MINIMO"
    }
  ],
  "resumo": {
    "saldo_atual_total": 0, "consumo_90d": 0, "consumo_180d": 0,
    "lead_time_medio_dias": 0, "minimo_sugerido_total": 0, "maximo_sugerido_total": 0
  }
}
```

**Pseudo-SQL (UNION E210MVP + E210DLS):**

```sql
WITH MOV AS (
  SELECT m.CODEMP, m.CODPRO, m.CODDER, m.CODDEP,
         m.DATMOV AS data_movimento, m.TIPMOV AS tipo_movimento,
         m.CODTRA AS transacao, m.QTDMOV AS quantidade,
         m.NUMDOC AS documento, f.NOMFOR AS fornecedor,
         'E210MVP' AS origem
    FROM E210MVP m
    LEFT JOIN E085FOR f ON f.CODFOR = m.CODFOR
   WHERE m.DATMOV BETWEEN :data_ini AND :data_fim
  UNION ALL
  SELECT d.CODEMP, d.CODPRO, d.CODDER, d.CODDEP,
         d.DATLAN AS data_movimento, d.TIPLAN AS tipo_movimento,
         d.CODTRA, d.QTDLAN, d.NUMDOC, NULL AS fornecedor,
         'E210DLS' AS origem
    FROM E210DLS d
   WHERE d.DATLAN BETWEEN :data_ini AND :data_fim
     AND NOT EXISTS (
       SELECT 1 FROM E210MVP m2
        WHERE m2.CODEMP=d.CODEMP AND m2.CODPRO=d.CODPRO
          AND m2.CODDER=d.CODDER AND m2.NUMDOC=d.NUMDOC
     )
)
SELECT mv.*, p.DESPRO, p.CODFAM, p.CODORI,
       est.QTDEST AS saldo_atual
  FROM MOV mv
  LEFT JOIN E210PRO p ON p.CODPRO = mv.CODPRO
  LEFT JOIN (
       SELECT CODEMP, CODPRO, CODDER, CODDEP, SUM(QTDEST) AS QTDEST
         FROM E210EST GROUP BY CODEMP, CODPRO, CODDER, CODDEP
  ) est ON est.CODEMP=mv.CODEMP AND est.CODPRO=mv.CODPRO
        AND est.CODDER=mv.CODDER AND est.CODDEP=mv.CODDEP
 WHERE (:codpro IS NULL OR mv.CODPRO LIKE :codpro)
   AND (:codfam IS NULL OR p.CODFAM = :codfam)
   AND (:codori IS NULL OR p.CODORI = :codori)
   AND (:codder IS NULL OR mv.CODDER = :codder)
   AND (:coddep IS NULL OR mv.CODDEP = :coddep)
 ORDER BY mv.data_movimento DESC;
```

### 2.2 `GET /api/estoque/sugestao-politica`

Mesmos query params. Agrupa por `(codemp, codpro, codder, coddep)` e calcula:

```
consumo_diario_medio   = SUM(saidas_180d) / 180
consumo_mensal         = consumo_diario_medio * 30
lead_time_dias         = AVG(data_entrada_nf - data_pedido)   -- E210MVP/E440NFC
                         default 15 se sem histórico
estoque_seguranca      = consumo_diario_medio * 0.5 * lead_time_dias
minimo                 = consumo_diario_medio * lead_time_dias + estoque_seguranca
lote_compra            = COALESCE(USU_EST_POLITICA.LOTE_COMPRA, consumo_mensal)
maximo                 = minimo + lote_compra
ponto_pedido           = minimo
```

**Pseudo-SQL:**

```sql
WITH SAIDAS AS (
  SELECT CODEMP, CODPRO, CODDER, CODDEP, SUM(QTDMOV) AS qtd_saida_180
    FROM E210MVP
   WHERE TIPMOV IN ('S','SAI') AND DATMOV >= DATEADD(DAY,-180,GETDATE())
   GROUP BY CODEMP, CODPRO, CODDER, CODDEP
), SAIDAS90 AS (
  SELECT CODEMP, CODPRO, CODDER, CODDEP, SUM(QTDMOV) AS qtd_saida_90
    FROM E210MVP
   WHERE TIPMOV IN ('S','SAI') AND DATMOV >= DATEADD(DAY,-90,GETDATE())
   GROUP BY CODEMP, CODPRO, CODDER, CODDEP
), LT AS (
  SELECT m.CODEMP, m.CODPRO,
         AVG(DATEDIFF(DAY, oc.DATPED, n.DATEMI)) AS lead_time
    FROM E440NFC n
    JOIN E120OCP oc ON oc.NUMOCP = n.NUMOCP
    JOIN E210MVP m  ON m.NUMDOC = n.NUMNFC
   GROUP BY m.CODEMP, m.CODPRO
), EST AS (
  SELECT CODEMP, CODPRO, CODDER, CODDEP, SUM(QTDEST) AS saldo
    FROM E210EST GROUP BY CODEMP, CODPRO, CODDER, CODDEP
)
SELECT e.CODEMP, e.CODPRO, e.CODDER, e.CODDEP,
       p.DESPRO, p.CODFAM, p.CODORI,
       e.saldo AS saldo_atual,
       COALESCE(s.qtd_saida_180,0)/180.0 AS consumo_diario,
       COALESCE(s.qtd_saida_180,0)/180.0 * 30 AS consumo_mensal,
       COALESCE(s90.qtd_saida_90,0)  AS consumo_90d,
       COALESCE(s.qtd_saida_180,0)   AS consumo_180d,
       COALESCE(lt.lead_time, 15)    AS lead_time_dias,
       COALESCE(s.qtd_saida_180,0)/180.0 * COALESCE(lt.lead_time,15) * 1.5 AS minimo_sugerido,
       (COALESCE(s.qtd_saida_180,0)/180.0 * COALESCE(lt.lead_time,15) * 1.5)
         + COALESCE(pol.LOTE_COMPRA, COALESCE(s.qtd_saida_180,0)/180.0 * 30) AS maximo_sugerido,
       COALESCE(pol.LOTE_COMPRA, COALESCE(s.qtd_saida_180,0)/180.0 * 30) AS lote_compra
  FROM EST e
  LEFT JOIN SAIDAS  s   ON s.CODEMP=e.CODEMP AND s.CODPRO=e.CODPRO AND s.CODDER=e.CODDER AND s.CODDEP=e.CODDEP
  LEFT JOIN SAIDAS90 s90 ON s90.CODEMP=e.CODEMP AND s90.CODPRO=e.CODPRO AND s90.CODDER=e.CODDER AND s90.CODDEP=e.CODDEP
  LEFT JOIN LT      lt  ON lt.CODEMP=e.CODEMP AND lt.CODPRO=e.CODPRO
  LEFT JOIN E210PRO p   ON p.CODPRO=e.CODPRO
  LEFT JOIN USU_EST_POLITICA pol
         ON pol.CODEMP=e.CODEMP AND pol.CODPRO=e.CODPRO
        AND pol.CODDER=e.CODDER AND pol.CODDEP=e.CODDEP
 WHERE (:codpro IS NULL OR e.CODPRO LIKE :codpro)
   AND (:codfam IS NULL OR p.CODFAM = :codfam)
   AND (:codori IS NULL OR p.CODORI = :codori)
 ORDER BY p.CODPRO, e.CODDER, e.CODDEP;
```

Retornar também `resumo` com os totais usados pelos KPIs do frontend.

### 2.3 `POST /api/estoque/politica/salvar`

**Body:**

```json
{
  "politicas": [
    {
      "codemp": 1, "codpro": "ABC", "codder": "01", "coddep": "001",
      "estoque_minimo": 18.0, "estoque_maximo": 54.0,
      "ponto_pedido": 18.0, "lote_compra": 36.0,
      "consumo_medio_mensal": 36.0, "lead_time_dias": 15,
      "obs": "Sugestão automática (movimentação histórica)"
    }
  ]
}
```

`USUARIO` é injetado a partir do JWT. `DATA_ALT = GETDATE()`.

**MERGE:**

```sql
MERGE USU_EST_POLITICA AS T
USING (SELECT :codemp CODEMP, :codpro CODPRO, :codder CODDER, :coddep CODDEP) AS S
   ON T.CODEMP=S.CODEMP AND T.CODPRO=S.CODPRO
  AND T.CODDER=S.CODDER AND T.CODDEP=S.CODDEP
WHEN MATCHED THEN UPDATE SET
  ESTOQUE_MINIMO=:estoque_minimo, ESTOQUE_MAXIMO=:estoque_maximo,
  PONTO_PEDIDO=:ponto_pedido,    LOTE_COMPRA=:lote_compra,
  CONSUMO_MEDIO_MENSAL=:consumo_medio_mensal, LEAD_TIME_DIAS=:lead_time_dias,
  OBS=:obs, USUARIO=:usuario, DATA_ALT=GETDATE()
WHEN NOT MATCHED THEN INSERT
  (CODEMP, CODPRO, CODDER, CODDEP, ESTOQUE_MINIMO, ESTOQUE_MAXIMO,
   PONTO_PEDIDO, LOTE_COMPRA, CONSUMO_MEDIO_MENSAL, LEAD_TIME_DIAS,
   OBS, USUARIO, DATA_ALT)
  VALUES (:codemp, :codpro, :codder, :coddep, :estoque_minimo, :estoque_maximo,
          :ponto_pedido, :lote_compra, :consumo_medio_mensal, :lead_time_dias,
          :obs, :usuario, GETDATE());
```

**Resposta:** `{ "salvos": <int>, "erros": [] }`.

---

## 3. Notas

- Frontend já trata 401/erros de rede (padrão `gestao-erros-conexao-erp`); não criar token global no backend.
- Endpoints devem retornar `resumo` agregado para alimentar KPIs sem recomputar no cliente.
- Recomenda-se índice `IX_E210MVP_DATMOV (DATMOV, CODPRO)` para performance.
