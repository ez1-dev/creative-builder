# BI Comercial — Sincronização da dimensão de clientes

Contrato para o time da FastAPI implementar (e manter) a rota que popula
`public.bi_cliente` no Cloud a partir do ERP Senior, e o JOIN no drill.

## 1. Tabela no Cloud

Já criada via migração Lovable:

```sql
CREATE TABLE public.bi_cliente (
  cd_cliente    text PRIMARY KEY,
  nm_cliente    text,
  nm_fantasia   text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
-- SELECT liberado para authenticated; INSERT/UPDATE só via service_role.
```

## 2. Rota de sincronização

`POST /api/bi/comercial/clientes/sincronizar`

- **Origem:** tabela `E085CLI` do ERP Senior.
- **Mapeamento:**
  - `CODCLI` → `cd_cliente` (cast para `text`)
  - `NOMCLI` → `nm_cliente` (TRIM)
  - `APECLI` → `nm_fantasia` (TRIM, pode ser NULL)
- **Estratégia:** UPSERT em lote via Supabase service role
  (`on conflict (cd_cliente) do update set nm_cliente=excluded.nm_cliente,
  nm_fantasia=excluded.nm_fantasia, atualizado_em=now()`).
- **Resposta (200):**
  ```json
  {
    "ok": true,
    "total": 12345,
    "inseridos": 120,
    "atualizados": 12225,
    "duracao_ms": 4321
  }
  ```
- **Erros:** padrão `{ "ok": false, "erro": "..." }` com status 500.
- **Idempotente.** Pode ser chamado N vezes seguidas sem efeitos colaterais.
- **Permissão:** mesma das demais rotas administrativas (`/api/bi/...`).

## 3. JOIN no drill CLIENTE

Em `POST /api/bi/comercial/drill` com `drill_type = "CLIENTE"`:

```sql
SELECT
  f.cd_cliente,
  c.nm_cliente,
  c.nm_fantasia,
  c.cd_cliente || ' - ' || COALESCE(c.nm_cliente, '(sem nome)') AS cliente_label,
  SUM(f.vl_total) AS vl_total,
  /* demais métricas */
FROM v_bi_faturamento_comercial f
LEFT JOIN public.bi_cliente c ON c.cd_cliente = f.cd_cliente::text
WHERE ...
GROUP BY f.cd_cliente, c.nm_cliente, c.nm_fantasia
ORDER BY SUM(f.vl_total) DESC
```

Resposta deve conter:

```json
{
  "columns": [
    { "key": "cd_cliente", "label": "Cliente", "align": "left" },
    { "key": "vl_total", "label": "Faturamento", "format": "currency", "align": "right" }
  ],
  "rows": [
    {
      "cd_cliente": "8794",
      "nm_cliente": "NOME DO CLIENTE",
      "nm_fantasia": "FANTASIA OPCIONAL",
      "cliente_label": "8794 - NOME DO CLIENTE",
      "vl_total": 123456.78,
      "filtros_drill": { "cd_cliente": "8794" }
    }
  ]
}
```

## 4. Regras invioláveis

- `filtros_drill` contém **somente** `cd_cliente`. Nunca incluir label/nome.
- Todos os SQLs subsequentes continuam filtrando por
  `WHERE cd_cliente = :cd_cliente`.
- `cliente_label` é puramente apresentação — frontend já consome.

## 5. Frontend

- O drawer (`ComercialDrillDrawer`) já renderiza `cliente_label`, com
  fallback `${cd_cliente} - ${nm_cliente}`.
- Botão "Sincronizar clientes" no header da página BI Comercial dispara
  esta rota (visível apenas para administradores).

## 6. Extensão futura (fora deste escopo)

Mesma estratégia para:

- `bi_revenda` (cd_rev_pedido + nome).
- `bi_produto` (cd_produto + descrição).
