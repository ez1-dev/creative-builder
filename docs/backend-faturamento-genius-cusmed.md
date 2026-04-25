# Faturamento Genius — corrigir `CUSMED` → `PREMED`

> ⚠️ **Substituído por `docs/backend-faturamento-genius-PATCH.md`** (patch consolidado: revenda + sinais + valor_desconto + valor_liquido + CUSMED→PREMED). Este documento permanece apenas como referência histórica.

## Sintoma

Ao consultar a tela `/faturamento-genius`, os endpoints abaixo retornam erro do SQL Server:

```
Nome de coluna 'CUSMED' inválido.
```

Endpoints afetados (no FastAPI):

- `GET /api/faturamento-genius-dashboard`
- `GET /api/faturamento-genius`

## Causa

A coluna `CUSMED` **não existe** na tabela `dbo.E075DER` (derivações de produto) do ERP Senior.
Os campos corretos da derivação são:

- `PREMED` — preço médio (use este para o custo do faturamento)
- `PRECUS` — preço de custo (último custo)

## Correção obrigatória

### 1. Substituição global

No SQL dos dois endpoints, trocar **todas** as ocorrências de `DER.CUSMED` por `DER.PREMED`.
Após a alteração, um `grep -i CUSMED` no projeto FastAPI deve retornar **zero** ocorrências.

### 2. JOIN canônico com `E075DER`

```sql
LEFT JOIN dbo.E075DER DER
    ON  DER.CODEMP = IPV.CODEMP
    AND DER.CODPRO = IPV.CODPRO
    AND COALESCE(DER.CODDER, '') = COALESCE(IPV.CODDER, '')
```

O `COALESCE` no `CODDER` é necessário porque o campo é nullable em itens sem derivação.

### 3. Cálculo do custo — agregado (`/api/faturamento-genius-dashboard`)

```sql
CAST(SUM(COALESCE(DER.PREMED, 0) * COALESCE(IPV.QTDFAT, 0)) AS FLOAT) AS valor_custo
```

### 4. Cálculo do custo — detalhe (`/api/faturamento-genius`)

```sql
CAST(COALESCE(DER.PREMED, 0) * COALESCE(IPV.QTDFAT, 0) AS FLOAT) AS valor_custo
```

## Checklist de validação

- [ ] `grep -ri "CUSMED" backend/` retorna vazio.
- [ ] `GET /api/faturamento-genius-dashboard?anomes_ini=YYYYMM&anomes_fim=YYYYMM` responde 200 e traz `valor_custo > 0` para um período conhecido com vendas.
- [ ] `GET /api/faturamento-genius?...&pagina=1&tamanho_pagina=100` responde 200 e cada linha possui `valor_custo` numérico (>= 0).
- [ ] `margem_bruta = (faturamento_liquido) - valor_custo` faz sentido para uma revenda de referência.
- [ ] Frontend (`src/pages/FaturamentoGeniusPage.tsx`) deixa de exibir o toast "Coluna inválida no SQL do Faturamento Genius…".

## Observação

A página no frontend já detecta a string `CUSMED` / "Nome de coluna … inválido" no erro e mostra um aviso direcionando para este documento. Após o backend ser corrigido e publicado, o aviso some automaticamente.
