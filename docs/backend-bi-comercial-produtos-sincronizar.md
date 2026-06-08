# BI Comercial — Sincronização da dimensão de produtos

Contrato para o time da FastAPI implementar (e manter) a rota que popula
`public.bi_produto` no Cloud a partir do ERP Senior, e o JOIN nos drills.

## 1. Tabela no Cloud

Já criada via migração Lovable:

```sql
CREATE TABLE public.bi_produto (
  cd_produto    text PRIMARY KEY,
  ds_produto    text,
  nm_produto    text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
-- SELECT liberado para authenticated; INSERT/UPDATE só via service_role.
```

## 2. Rota de sincronização

`POST /api/bi/comercial/produtos/sincronizar`

- **Origem:** tabela `E075PRO` do ERP Senior.
- **Mapeamento:**
  - `CODPRO` → `cd_produto` (cast para `text`)
  - `DESPRO` → `ds_produto` (TRIM)
  - `NOMRED` → `nm_produto` (TRIM, pode ser NULL)
- **Estratégia:** UPSERT em lote via Supabase service role
  (`on conflict (cd_produto) do update set ds_produto=excluded.ds_produto,
  nm_produto=excluded.nm_produto, atualizado_em=now()`).
- **Resposta (200):**
  ```json
  { "ok": true, "total": 12345, "inseridos": 120, "atualizados": 12225, "duracao_ms": 4321 }
  ```
- **Erros:** padrão `{ "ok": false, "erro": "..." }` com status 500.
- **Idempotente.** Pode ser chamado N vezes seguidas sem efeitos colaterais.

## 3. JOIN nos drills que devolvem `cd_produto`

Em `POST /api/bi/comercial/drill`, drills afetados:
`PRODUTO`, `NOTA_FISCAL`, `DETALHES_IMPOSTOS` (qualquer um que liste `cd_produto`).

```sql
SELECT
  f.cd_produto,
  p.ds_produto,
  p.nm_produto,
  /* demais campos / métricas */
FROM v_bi_faturamento_comercial f
LEFT JOIN public.bi_produto p ON p.cd_produto = f.cd_produto::text
WHERE ...
```

Adicionar à resposta de `columns` a coluna `ds_produto`
(`{ "key": "ds_produto", "label": "Descrição do Produto", "align": "left" }`)
imediatamente após `cd_produto`. Cada `row` deve trazer `ds_produto`
(e opcionalmente `nm_produto`).

## 4. Regras invioláveis

- `filtros_drill` continua contendo **somente** `cd_produto`. Nunca incluir
  `ds_produto`/`nm_produto`/label como filtro técnico.
- Todos os SQLs subsequentes continuam filtrando por
  `WHERE cd_produto = :cd_produto`.

## 5. Frontend

- O drawer (`ComercialDrillDrawer`) já injeta a coluna `ds_produto` quando o
  backend devolve `cd_produto` sem descrição. Enquanto o JOIN não estiver no
  ar, a célula aparece como `—` (não quebra).
- Botão "Sincronizar produtos" no header da página BI Comercial dispara
  esta rota (visível apenas para administradores).
