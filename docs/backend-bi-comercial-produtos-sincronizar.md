# Backend: Sincronização de Produtos (BI Comercial)

Espelhar o catálogo de **produtos** e **serviços** do ERP Senior na tabela analítica
`public.bi_produto` do Cloud, para enriquecer descrição em todos os drills do BI Comercial.

## Tabela alvo (Cloud — já criada)

```sql
public.bi_produto (
  cd_produto text primary key,         -- "<CODEMP>-<CODPRO|CODSER>"
  ds_produto text,
  cd_familia text,
  cd_origem text,
  cd_unidade_medida text,
  tipo_item text,                       -- 'PRODUTO' | 'SERVICO'
  ativo boolean default true,
  atualizado_em timestamptz default now()
);
```

Grants: `select` para `authenticated`, `all` para `service_role`.
RLS ligada com leitura para autenticados. **Somente service role grava.**

## Endpoint

```
POST /api/bi/comercial/produtos/sincronizar
```

Autenticação: aceita **JWT** (header `Authorization: Bearer ...`) **ou**
`x-cron-secret: $CRON_SECRET`. Mesmo padrão de `/api/bi/comercial/clientes/sincronizar`.

### SQL fonte no ERP Senior

**Produtos** (`E075PRO`):

```sql
select
    cast(P.CODEMP as varchar) + '-' + ltrim(rtrim(P.CODPRO)) as cd_produto,
    ltrim(rtrim(P.DESPRO)) as ds_produto,
    ltrim(rtrim(P.CODFAM)) as cd_familia,
    ltrim(rtrim(P.CODORI)) as cd_origem,
    ltrim(rtrim(P.UNIMED)) as cd_unidade_medida,
    'PRODUTO' as tipo_item,
    case when coalesce(P.SITPRO, 'A') = 'A' then 1 else 0 end as ativo
from E075PRO P
where P.CODEMP = 1
```

**Serviços** (`E080SER`):

```sql
select
    cast(S.CODEMP as varchar) + '-' + ltrim(rtrim(S.CODSER)) as cd_produto,
    ltrim(rtrim(S.DESSER)) as ds_produto,
    ltrim(rtrim(S.CODFAM)) as cd_familia,
    null as cd_origem,
    ltrim(rtrim(S.UNIMED)) as cd_unidade_medida,
    'SERVICO' as tipo_item,
    1 as ativo
from E080SER S
where S.CODEMP = 1
```

### Upsert no Cloud

Usar **service role**. Chave de conflito: `cd_produto`.
Atualizar todas as colunas + `atualizado_em = now()`.

### Resposta esperada

```json
{ "ok": true, "qtd_produtos": 0, "qtd_servicos": 0, "qtd_total": 0 }
```

## Frontend

Botão **"Sincronizar produtos"** (ícone Package) já existe no header admin da página
`/bi/comercial` e chama este endpoint. Não chamar do client com service role.
