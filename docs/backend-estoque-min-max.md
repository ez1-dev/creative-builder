# Backend — Estoque Min/Max

Contrato para o time backend (FastAPI) implementar a tela `/estoque-min-max` do ERP Sapiens.

## 1. Tabela de política

Criar em schema livre (ex.: `R999_POLITICA_MINMAX`).

| Coluna           | Tipo            | Notas                              |
|------------------|-----------------|------------------------------------|
| CODEMP           | INT             | PK                                 |
| CODPRO           | VARCHAR(30)     | PK                                 |
| CODDER           | VARCHAR(10)     | PK (use ' ' quando não houver)     |
| CODDEP           | VARCHAR(10)     | PK                                 |
| ESTOQUE_MINIMO   | NUMERIC(18,4)   | default 0                          |
| ESTOQUE_MAXIMO   | NUMERIC(18,4)   | default 0                          |
| PONTO_PEDIDO     | NUMERIC(18,4)   | default 0                          |
| LOTE_COMPRA      | NUMERIC(18,4)   | default 0                          |
| OBS              | VARCHAR(500)    | nullable                           |
| USUARIO          | VARCHAR(50)     | usuário ERP autenticado            |
| DATA_ALT         | DATETIME        | GETDATE() no upsert                |

PK composta: `(CODEMP, CODPRO, CODDER, CODDEP)`.

## 2. `GET /api/estoque-min-max`

### Query params
`codpro, despro, codfam, codori, codder, coddep, situacao_cadastro (A|I|all),
somente_abaixo_minimo (bool), somente_sem_politica (bool), somente_com_saldo (bool),
pagina, tamanho_pagina`

### Resposta
```json
{
  "pagina": 1,
  "tamanho_pagina": 100,
  "total_registros": 0,
  "total_paginas": 0,
  "dados": [
    {
      "codigo": "...",
      "descricao": "...",
      "familia": "...",
      "origem": "...",
      "derivacao": "...",
      "deposito": "...",
      "saldo_atual": 0,
      "estoque_minimo": 0,
      "estoque_maximo": 0,
      "ponto_pedido": 0,
      "sugestao_minima": 0,
      "sugestao_maxima": 0,
      "status": "ABAIXO_MINIMO"
    }
  ],
  "resumo": {
    "abaixo_minimo": 0,
    "acima_maximo": 0,
    "sem_politica": 0,
    "ok": 0,
    "sugestao_minimo_total": 0,
    "sugestao_maximo_total": 0
  }
}
```

### Pseudo-SQL (SQL Server)
```sql
WITH SALDO AS (
  SELECT e.codemp, e.codpro, e.codder, e.coddep,
         SUM(e.qtdest) AS saldo_atual
  FROM E300EST e
  GROUP BY e.codemp, e.codpro, e.codder, e.coddep
)
SELECT p.codpro AS codigo,
       p.despro AS descricao,
       p.codfam AS familia,
       p.codori AS origem,
       s.codder AS derivacao,
       s.coddep AS deposito,
       ISNULL(s.saldo_atual, 0)        AS saldo_atual,
       ISNULL(pol.ESTOQUE_MINIMO, 0)   AS estoque_minimo,
       ISNULL(pol.ESTOQUE_MAXIMO, 0)   AS estoque_maximo,
       ISNULL(pol.PONTO_PEDIDO, 0)     AS ponto_pedido
FROM E210PRO p
LEFT JOIN SALDO s
  ON s.codemp = p.codemp AND s.codpro = p.codpro
LEFT JOIN R999_POLITICA_MINMAX pol
  ON pol.CODEMP = p.codemp
 AND pol.CODPRO = p.codpro
 AND pol.CODDER = ISNULL(s.codder, ' ')
 AND pol.CODDEP = ISNULL(s.coddep, ' ')
WHERE (@codpro IS NULL OR p.codpro LIKE @codpro + '%')
  AND (@despro IS NULL OR p.despro LIKE '%' + @despro + '%')
  AND (@situacao = 'all' OR p.sitpro = @situacao)
  -- demais filtros
```

### Cálculo de status (no backend, idempotente com o frontend)

```
SEM_POLITICA      : estoque_minimo = 0 AND estoque_maximo = 0
ABAIXO_MINIMO     : saldo_atual < estoque_minimo
NO_MINIMO         : saldo_atual = estoque_minimo
ACIMA_MAXIMO      : saldo_atual > estoque_maximo (e estoque_maximo > 0)
ENTRE_MIN_E_MAX   : caso contrário

sugestao_minima = CASE WHEN saldo_atual < estoque_minimo
                       THEN GREATEST(1, estoque_minimo - saldo_atual) ELSE 0 END
sugestao_maxima = CASE WHEN saldo_atual < estoque_maximo
                       THEN estoque_maximo - saldo_atual ELSE 0 END
```

## 3. `POST /api/estoque-min-max/politica`

Upsert de uma linha de política.

### Body
```json
{
  "codemp": 1,
  "codpro": "ABC123",
  "codder": " ",
  "coddep": "01",
  "estoque_minimo": 10,
  "estoque_maximo": 50,
  "ponto_pedido": 15,
  "lote_compra": 20,
  "obs": "..."
}
```

### Lógica
- `MERGE` em `R999_POLITICA_MINMAX` por `(CODEMP, CODPRO, CODDER, CODDEP)`.
- `USUARIO` = usuário ERP do token; `DATA_ALT = GETDATE()`.

## 4. `GET /api/export/estoque-min-max`

Mesma query do `GET /api/estoque-min-max` (sem paginação) → XLSX.
Mesmo padrão dos demais exports do projeto (`Content-Disposition: attachment; filename=estoque-min-max.xlsx`).

## 5. Compatibilidade com o frontend

Se o backend ainda não retornar `status` ou `sugestao_minima/sugestao_maxima`, o frontend
calcula a partir de `saldo_atual`, `estoque_minimo`, `estoque_maximo`. Basta retornar os
campos crus para a tela funcionar.
