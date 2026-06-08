# BI Comercial — Sincronizar Revendas

Contrato para o backend FastAPI implementar a sincronização do cadastro de
revendas (campo `cd_rev_pedido` na view `v_bi_faturamento_comercial`) com o
Lovable Cloud, alimentando `public.bi_revenda`.

## 1. Endpoint

```
POST /api/bi/comercial/revendas/sincronizar
Headers:
  Authorization: Bearer <token-erp>
  ngrok-skip-browser-warning: true
Body: {} (sem parâmetros)
```

Resposta:

```json
{ "inseridos": 12, "atualizados": 8, "total": 20 }
```

Erro: HTTP 4xx/5xx com `{ "detail": "..." }`.

## 2. Origem dos dados (ERP Senior)

Tabela cadastral utilizada como dimensão de revendas no ERP. Sugestões:

- `E140REV` (revendas) — se existir no schema senior local
- Ou outra dimensão cadastral usada hoje pelo backend para resolver
  `cd_rev_pedido`. Confirmar com o time ERP.

SELECT mínimo esperado:

```sql
SELECT
  cd_rev_pedido,
  nm_revenda,
  nm_fantasia,        -- opcional
  cd_empresa,         -- opcional
  ativo               -- opcional, default true
FROM <tabela_revendas_senior>
```

## 3. Destino (Lovable Cloud)

```
public.bi_revenda(
  cd_rev_pedido text PRIMARY KEY,
  nm_revenda    text,
  nm_fantasia   text,
  cd_empresa    integer,
  ativo         boolean default true,
  created_at, updated_at
)
```

UPSERT (`ON CONFLICT (cd_rev_pedido) DO UPDATE`) via service role.

Tabela já existe no Cloud com RLS:
- `SELECT` liberado para `authenticated`
- `ALL` apenas para `service_role` (a única que o FastAPI deve usar)

## 4. Regras

- Idempotente — múltiplas chamadas seguidas não duplicam.
- Nunca apaga registros que não vierem no SELECT (revendas históricas
  precisam continuar resolvendo o nome em drills antigos). Apenas marca
  `ativo=false` se desejar futuramente.
- `nm_revenda` deve vir em UPPER ou conforme padrão do ERP — frontend
  só exibe `cd_rev_pedido - nm_revenda`.

## 5. Frontend

- Botão "Sincronizar revendas" no header `/bi/comercial` (admin-only),
  chama este endpoint via `api.post()`.
- Após sincronizar, drills/rankings que dependem do JOIN com `bi_revenda`
  (ver `docs/backend-bi-comercial-drill-labels.md`) passam a devolver
  `revenda_label = cd_rev_pedido || ' - ' || nm_revenda`.
