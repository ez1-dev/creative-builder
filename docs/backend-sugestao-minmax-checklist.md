# Checklist — Sugestão Min/Max no FastAPI

Resumo de 1 página para o time de backend implementar os endpoints consumidos pela
tela `/sugestao-min-max`. Especificação completa: `docs/backend-sugestao-minmax.md`.

Autenticação: **Bearer JWT já existente**. `USUARIO` vem do JWT — nunca do body.

---

## ✅ Tarefas

- [ ] Criar tabela `USU_EST_POLITICA` (SQL abaixo)
- [ ] Implementar `GET  /api/estoque/movimentacao`
- [ ] Implementar `GET  /api/estoque/sugestao-politica`
- [ ] Implementar `POST /api/estoque/politica/salvar`
- [ ] Criar índice `IX_E210MVP_DATMOV (DATMOV, CODPRO)` para performance
- [ ] Validar 401/403/404/422 e CORS para o domínio Lovable

---

## 1. Tabela `USU_EST_POLITICA`

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

## 2. Endpoints — contratos rápidos

### 2.1 `GET /api/estoque/movimentacao` → 200

**Query params:** `codpro?, despro?, codfam?, codori?, codder?, coddep?, data_ini, data_fim, pagina=1, tamanho_pagina=100`

**Exemplo curl:**
```bash
curl -H "Authorization: Bearer $JWT" \
  "$ERP/api/estoque/movimentacao?data_ini=2025-01-01&data_fim=2025-04-21&pagina=1&tamanho_pagina=100"
```

**Response:**
```json
{
  "pagina": 1, "tamanho_pagina": 100, "total_registros": 1234, "total_paginas": 13,
  "dados": [{
    "codemp": 1, "codpro": "ABC", "codder": "01", "coddep": "001",
    "data_movimento": "2025-04-10", "tipo_movimento": "SAI", "transacao": "200",
    "deposito": "001", "quantidade": 10.0, "documento": "REQ-123",
    "fornecedor": null, "origem": "E210MVP",
    "saldo_atual": 50.0, "consumo_medio": 1.2,
    "minimo_sugerido": 18.0, "maximo_sugerido": 54.0,
    "status": "ABAIXO_MINIMO"
  }],
  "resumo": {
    "saldo_atual_total": 0, "consumo_90d": 0, "consumo_180d": 0,
    "lead_time_medio_dias": 0, "minimo_sugerido_total": 0, "maximo_sugerido_total": 0
  }
}
```

### 2.2 `GET /api/estoque/sugestao-politica` → 200

Mesmos params. Agrupa por `(codemp, codpro, codder, coddep)`.

**Fórmulas:**
```
consumo_diario_medio = SUM(saidas_180d) / 180
consumo_mensal       = consumo_diario_medio * 30
lead_time_dias       = AVG(DATEDIFF(NF.DATEMI, OCP.DATPED))   -- default 15
estoque_seguranca    = consumo_diario_medio * 0.5 * lead_time_dias
minimo               = consumo_diario_medio * lead_time_dias + estoque_seguranca
lote_compra          = COALESCE(USU_EST_POLITICA.LOTE_COMPRA, consumo_mensal)
maximo               = minimo + lote_compra
ponto_pedido         = minimo
```

**Response:** mesma estrutura paginada, com `ponto_pedido`, `lote_compra`, `consumo_mensal`, `lead_time_dias` em cada linha + `resumo`.

### 2.3 `POST /api/estoque/politica/salvar` → 200 / 207

```bash
curl -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  "$ERP/api/estoque/politica/salvar" \
  -d '{"politicas":[{"codemp":1,"codpro":"ABC","codder":"01","coddep":"001","estoque_minimo":18,"estoque_maximo":54,"ponto_pedido":18,"lote_compra":36,"consumo_medio_mensal":36,"lead_time_dias":15,"obs":"..."}]}'
```

**SQL (MERGE — `USUARIO` vem do JWT, `DATA_ALT = GETDATE()`):**
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

**Response:** `{ "salvos": 12, "erros": [] }` (use `207 Multi-Status` se houver erros parciais).

---

## 3. Status codes esperados

| Código | Quando |
|---|---|
| 200 | Sucesso |
| 207 | Sucesso parcial no POST `salvar` (`erros[]` populado) |
| 401 | JWT ausente/expirado — frontend já trata |
| 404 | Recurso/rota inexistente — **a tela exibe banner amarelo** |
| 422 | Body inválido (validação Pydantic) |

---

## 4. Notas

- **Não criar token global**: usar o JWT que já chega no header.
- Sempre retornar o objeto `resumo` para alimentar os KPIs sem recomputar no cliente.
- O frontend já trata 401 (`gestao-erros-conexao-erp`) e exibe banner amarelo em 404.
- Modo demo do frontend (`Usar dados de exemplo`) permite validar UX e o fluxo IA enquanto estes endpoints não estão prontos.
