# BI Comercial — Nome do produto direto do ERP (sem sync)

Contrato para o time da FastAPI. **Não existe** mais tabela `public.bi_produto`
no Cloud, nem rota de sincronização de produtos. O nome do produto é
resolvido a cada chamada de drill, lendo direto do ERP Senior.

## 1. JOIN nos drills que devolvem `cd_produto`

Em `POST /api/bi/comercial/drill`, drills afetados:
`PRODUTO`, `NOTA_FISCAL`, `DETALHES_IMPOSTOS` (qualquer um que liste
`cd_produto`).

```sql
SELECT
  f.cd_produto,
  p.DESPRO AS ds_produto,
  p.NOMRED AS nm_produto,
  /* demais campos / métricas */
FROM v_bi_faturamento_comercial f
LEFT JOIN E075PRO p ON p.CODPRO = f.cd_produto
WHERE ...
```

Resposta deve incluir, em `columns`, a coluna
`{ "key": "ds_produto", "label": "Descrição do Produto", "align": "left" }`
imediatamente após `cd_produto`. Cada `row` traz `ds_produto`
(e opcionalmente `nm_produto`).

## 2. Regras invioláveis

- `filtros_drill` continua contendo **somente** `cd_produto`. Nunca incluir
  `ds_produto`/`nm_produto`/label como filtro técnico.
- SQLs subsequentes sempre filtram por `WHERE cd_produto = :cd_produto`.

## 3. Performance

- Drills são paginados (`page_size` ~100), então o JOIN é barato.
- Se necessário, o backend pode manter um cache em memória do mapa
  `CODPRO → DESPRO` (TTL curto, p.ex. 5–15 min). É detalhe interno e
  **não muda o contrato**.

## 4. Frontend

- O drawer (`ComercialDrillDrawer`) injeta a coluna `ds_produto` como
  fallback quando o backend ainda devolve só `cd_produto` (mostra `—`).
  Após o JOIN entrar no ar, a célula passa a mostrar a descrição.
- **Não existe** botão "Sincronizar produtos" na página `/bi/comercial`.
